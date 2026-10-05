import { randomUUID } from "node:crypto";
import { isCanonicalDiscordSnowflake, type TicketScope, type SupportAuditEvent } from "@openclaw-hosting/contracts";
import type { AuditRecorder } from "./audit.js";
import { TicketBridgeError, type LegacyTicketAdapter, type TicketBridge, type LegacyTicketReader } from "./index.js";

export interface TicketCustomerMessage {
  readonly guildId: string | null; readonly channelId: string;
  readonly author: { id: string; bot: boolean }; readonly content: string;
}
export interface TicketAgentRunner {
  run(request: { sessionId: string; ticketToken: string; prompt: string }, signal: AbortSignal): Promise<{ reply: string }>;
}
type Lease = { scope: TicketScope; sessionId: string; abort: AbortController; queued: number; tail: Promise<unknown> };

/** Bind to the unchanged bot's authenticated messageCreate stream. No fake actor headers. */
export class DiscordTicketSupport {
  #leases = new Map<string, Lease>();
  #unsubscribe: () => void;
  constructor(private readonly tickets: LegacyTicketReader, private readonly adapter: LegacyTicketAdapter,
    private readonly bridge: TicketBridge, private readonly agent: TicketAgentRunner,
    private readonly staffUserIds: ReadonlySet<string>, private readonly audit?: AuditRecorder) {
    this.#unsubscribe = adapter.onRetirement((channelId) => {
      this.#leases.get(channelId)?.abort.abort();
      this.record("ticket_retired", "success");
    });
  }

  private record(operation: SupportAuditEvent["operation"], outcome: SupportAuditEvent["outcome"]): void {
    try { void this.audit?.record({ operation, outcome, correlationId: randomUUID() }).catch(() => undefined); }
    catch { /* Audit cannot grant or delay customer authority. */ }
  }

  /** Explicit test-ticket admission. Owner comes from the legacy row, not caller input. */
  async enableChannel(guildId: string, channelId: string): Promise<void> {
    if (![guildId, channelId].every(isCanonicalDiscordSnowflake) ||
        (!this.#leases.has(channelId) && this.#leases.size >= 1000)) throw new TicketBridgeError();
    const row = await this.tickets.readByChannel(channelId);
    if (!row || typeof row !== "object" || Array.isArray(row)) throw new TicketBridgeError();
    const data = row as Record<string, unknown>;
    if (data.guildId !== guildId || data.channelId !== channelId || typeof data.userId !== "string" ||
        !isCanonicalDiscordSnowflake(data.userId)) throw new TicketBridgeError();
    this.#leases.get(channelId)?.abort.abort();
    const scope = { guildId, channelId, discordUserId: data.userId };
    await this.adapter.enable(scope);
    this.#leases.set(channelId, { scope, sessionId: randomUUID(), abort: new AbortController(), queued: 0, tail: Promise.resolve() });
    this.record("ticket_admitted", "success");
  }

  async receive(message: TicketCustomerMessage): Promise<"ignored" | "sent" | "silenced" | "staff-takeover"> {
    const lease = this.#leases.get(message.channelId);
    if (!lease || message.guildId !== lease.scope.guildId || message.author.bot ||
        !isCanonicalDiscordSnowflake(message.author.id)) return "ignored";
    if (message.author.id !== lease.scope.discordUserId) {
      if (!this.staffUserIds.has(message.author.id)) return "ignored";
      // Abort before awaiting any state read. Customer generation does not hold the send gate.
      lease.abort.abort();
      await this.bridge.humanTakeover(lease.scope);
      this.record("human_takeover", "success");
      return "staff-takeover";
    }
    if (lease.abort.signal.aborted || !message.content.trim() || message.content.length > 4000 || lease.queued >= 16) return "ignored";
    lease.queued++;
    const next = lease.tail.then(async () => {
      if (lease.abort.signal.aborted || this.#leases.get(message.channelId) !== lease) return "silenced" as const;
      await this.bridge.customerMessage(lease.scope);
      const snapshot = await this.bridge.read(lease.scope);
      if (!snapshot || snapshot.state !== "AI_ACTIVE") return "silenced" as const;
      const ticketToken = await this.bridge.contextForCustomer(lease.scope);
      let response: { reply: string };
      try {
        response = await this.agent.run({ sessionId: lease.sessionId, ticketToken, prompt: message.content }, lease.abort.signal);
      } catch {
        this.record("agent_turn", lease.abort.signal.aborted ? "denied" : "failed");
        if (lease.abort.signal.aborted || this.#leases.get(message.channelId) !== lease) return "silenced" as const;
        // No retries after an uncertain model/tool run. Stop proactive access and notify staff.
        await this.bridge.handoff(lease.scope, { summary: "AI 客服流程暫時無法完成", reason: "需要人工核對工具或 Harness 結果", attemptedSteps: [] });
        return "silenced" as const;
      }
      if (typeof response.reply !== "string" || !response.reply.trim() || response.reply.length > 6000 ||
          response.reply.includes(ticketToken)) throw new TicketBridgeError();
      this.record("agent_turn", lease.abort.signal.aborted ? "denied" : "success");
      let rest = response.reply;
      while (rest) {
        if (lease.abort.signal.aborted || this.#leases.get(message.channelId) !== lease) return "silenced" as const;
        let end = Math.min(rest.length, 1800);
        if (end < rest.length && /[\uD800-\uDBFF]/.test(rest[end - 1] ?? "")) end--;
        if (!await this.bridge.replyIfCurrent(snapshot, rest.slice(0, end))) return "silenced" as const;
        rest = rest.slice(end);
      }
      if (lease.abort.signal.aborted) return "silenced" as const;
      const current = await this.bridge.read(lease.scope);
      if (current?.revision === snapshot.revision && current.state === "AI_ACTIVE") {
        await this.bridge.waitForCustomer(lease.scope);
      }
      return "sent" as const;
    });
    lease.tail = next.catch(() => undefined);
    try { return await next; } finally { lease.queued--; }
  }

  async retireChannel(channelId: string): Promise<void> {
    const lease = this.#leases.get(channelId);
    if (!lease) return;
    lease.abort.abort();
    await this.bridge.close(lease.scope);
  }

  dispose(): void { this.#unsubscribe(); for (const lease of this.#leases.values()) lease.abort.abort(); }
}

/** Existing Discord client, no second login or bot token. Errors are static, never raw causes. */
export function attachTicketSupportEvents(client: {
  on(event: string, listener: (...args: never[]) => void): unknown;
  off(event: string, listener: (...args: never[]) => void): unknown;
}, support: DiscordTicketSupport, onFailure: (code: "TICKET_SUPPORT_UNAVAILABLE") => void): () => void {
  const message = (input: TicketCustomerMessage) => { void support.receive(input).catch(() => onFailure("TICKET_SUPPORT_UNAVAILABLE")); };
  const deleted = (channel: { id: string }) => { void support.retireChannel(channel.id).catch(() => onFailure("TICKET_SUPPORT_UNAVAILABLE")); };
  client.on("messageCreate", message);
  client.on("channelDelete", deleted);
  return () => { support.dispose(); client.off("messageCreate", message); client.off("channelDelete", deleted); };
}
