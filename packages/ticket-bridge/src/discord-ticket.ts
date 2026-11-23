import { randomUUID } from "node:crypto";
import { isCanonicalDiscordSnowflake, type TicketScope, type TicketSnapshot, type SupportAuditEvent } from "@support-ai-agent/contracts";
import type { AuditRecorder } from "./audit.js";
import { TicketBridgeError, type LegacyTicketAdapter, type TicketBridge, type LegacyTicketReader } from "./index.js";

export interface TicketCustomerMessage {
  readonly guildId: string | null; readonly channelId: string;
  readonly author: { id: string; bot: boolean }; readonly content: string;
}
export interface TicketAgentRunner {
  run(request: { sessionId: string; ticketToken: string; prompt: string }, signal: AbortSignal): Promise<{ reply: string }>;
}
export type ShadowVerdict = "accepted-as-is" | "accepted-with-edits" | "rejected";
export interface ShadowThread {
  readonly id: string;
  publish(draftId: string, text: string, assertCurrent: () => Promise<void>): Promise<() => Promise<void>>;
}
export interface ShadowVerdictEntry {
  timestamp: string;
  channelId: string;
  verdict: ShadowVerdict;
  staffId: string;
}
export interface ShadowMode {
  readonly channelIds: ReadonlySet<string>;
  readonly autoAdmitGuildId?: string;
  readonly excludedChannelId?: string;
  openThread(scope: TicketScope): Promise<ShadowThread>;
  recordVerdict(entry: ShadowVerdictEntry): Promise<void>;
}
export interface DiscordTicketSupportOptions {
  readonly shadow?: ShadowMode;
  /** How long a customer follow-up waits after the latest staff activity. */
  readonly humanIdleMs?: number;
}
export const DEFAULT_HUMAN_IDLE_MS = 120_000;
type Lease = { scope: TicketScope; sessionId: string; abort: AbortController; queued: number; tail: Promise<unknown>;
  retired: boolean; lastStaffActivity: number;
  thread?: ShadowThread; drafts: Map<string, { snapshot: TicketSnapshot; discard: () => Promise<void> }> };
type ReceiveResult = "ignored" | "sent" | "silenced" | "staff-takeover" | "drafted" | "reviewed";

/** Bind to the unchanged bot's authenticated messageCreate stream. No fake actor headers. */
export class DiscordTicketSupport {
  #leases = new Map<string, Lease>();
  #newChannels = new Map<string, { pending?: Promise<void> }>();
  #unsubscribe: () => void;
  #humanIdleMs: number;
  #shadow: ShadowMode | undefined;
  constructor(private readonly tickets: LegacyTicketReader, private readonly adapter: LegacyTicketAdapter,
    private readonly bridge: TicketBridge, private readonly agent: TicketAgentRunner,
    private readonly staffUserIds: ReadonlySet<string>, private readonly audit?: AuditRecorder,
    options: DiscordTicketSupportOptions = {}) {
    const humanIdleMs = options.humanIdleMs ?? DEFAULT_HUMAN_IDLE_MS;
    if (!Number.isSafeInteger(humanIdleMs) || humanIdleMs < 5_000 || humanIdleMs > 86_400_000) {
      throw new TicketBridgeError();
    }
    this.#humanIdleMs = humanIdleMs;
    this.#shadow = options.shadow;
    this.#unsubscribe = adapter.onRetirement((channelId) => {
      const lease = this.#leases.get(channelId);
      if (lease) { lease.retired = true; this.invalidate(lease); }
      this.record("ticket_retired", "success");
    });
  }

  private invalidate(lease: Lease): void {
    lease.abort.abort();
    for (const draft of lease.drafts.values()) {
      void draft.discard().catch(() => this.record("agent_turn", "failed"));
    }
    lease.drafts.clear();
  }

  private async assertDraftCurrent(lease: Lease, snapshot: TicketSnapshot): Promise<void> {
    const current = await this.bridge.read(lease.scope);
    if (lease.abort.signal.aborted || this.#leases.get(lease.scope.channelId) !== lease ||
        current?.state !== "AI_ACTIVE" || current.revision !== snapshot.revision) throw new TicketBridgeError();
  }

  private review(message: TicketCustomerMessage): Promise<ReceiveResult> {
    const shadow = this.#shadow;
    if (!shadow || !this.staffUserIds.has(message.author.id)) return Promise.resolve("ignored");
    const lease = [...this.#leases.values()].find(candidate => candidate.thread?.id === message.channelId &&
      candidate.scope.guildId === message.guildId && candidate.scope.discordUserId !== message.author.id);
    const command = /^!draft ([0-9a-f-]{36}) (accept|edit|reject)(?:\s+([\s\S]+))?$/.exec(message.content.trim());
    if (!lease || !command || (command[2] === "edit" ? !command[3]?.trim() : command[3] !== undefined)) {
      return Promise.resolve("ignored");
    }
    // Resolve the exact draft once, even when two staff submit a verdict concurrently.
    const next = lease.tail.then(async () => {
      const draft = lease.drafts.get(command[1]!);
      if (!draft) return "ignored" as const;
      try { await this.assertDraftCurrent(lease, draft.snapshot); }
      catch { return "silenced" as const; }
      const verdict = command[2] === "accept" ? "accepted-as-is" : command[2] === "edit" ? "accepted-with-edits" : "rejected";
      await shadow.recordVerdict({ timestamp: new Date().toISOString(), channelId: lease.scope.channelId,
        verdict, staffId: message.author.id });
      lease.drafts.delete(command[1]!);
      return "reviewed" as const;
    });
    lease.tail = next.catch(() => undefined);
    return next;
  }

  private record(operation: SupportAuditEvent["operation"], outcome: SupportAuditEvent["outcome"]): void {
    try { void this.audit?.record({ operation, outcome, correlationId: randomUUID() }).catch(() => undefined); }
    catch { /* Audit cannot grant or delay customer authority. */ }
  }

  observeChannelCreated(channel: { id: string; guildId?: string; type: number }): void {
    const shadow = this.#shadow;
    // Discord GuildText is type 0. A channel event alone does not prove it's a ticket.
    if (!shadow?.autoAdmitGuildId || channel.type !== 0 || channel.guildId !== shadow.autoAdmitGuildId ||
        !isCanonicalDiscordSnowflake(channel.id) || channel.id === shadow.excludedChannelId ||
        (shadow.channelIds.size && !shadow.channelIds.has(channel.id)) ||
        this.#leases.has(channel.id) || this.#newChannels.has(channel.id)) return;
    this.#newChannels.set(channel.id, {});
  }

  private async admitNewChannel(message: TicketCustomerMessage): Promise<void> {
    const candidate = this.#newChannels.get(message.channelId);
    if (!candidate || !message.guildId || message.guildId !== this.#shadow?.autoAdmitGuildId) return;
    candidate.pending ??= this.enableChannel(message.guildId, message.channelId).then(async () => {
      if (this.#newChannels.get(message.channelId) !== candidate) {
        await this.retireChannel(message.channelId);
        return;
      }
      this.#newChannels.delete(message.channelId);
    }).catch((error: unknown) => {
      // A ticket row may not exist yet. Allow a later message to retry.
      delete candidate.pending;
      if (!(error instanceof TicketBridgeError)) throw error;
    });
    await candidate.pending;
  }

  /** Owner comes from the legacy row. Automatic callers must first observe a new channel. */
  async enableChannel(guildId: string, channelId: string): Promise<void> {
    if (this.#shadow && (channelId === this.#shadow.excludedChannelId ||
        (this.#shadow.channelIds.size ? !this.#shadow.channelIds.has(channelId)
          : guildId !== this.#shadow.autoAdmitGuildId || !this.#newChannels.has(channelId)) || this.#leases.has(channelId))) {
      throw new TicketBridgeError();
    }
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
    this.#leases.set(channelId, { scope, sessionId: this.#shadow ? channelId : randomUUID(), abort: new AbortController(), queued: 0,
      tail: Promise.resolve(), retired: false, lastStaffActivity: 0, drafts: new Map() });
    this.record("ticket_admitted", "success");
  }

  async receive(message: TicketCustomerMessage): Promise<ReceiveResult> {
    if (message.author.bot || !isCanonicalDiscordSnowflake(message.author.id)) return "ignored";
    if (this.#newChannels.has(message.channelId)) await this.admitNewChannel(message);
    const lease = this.#leases.get(message.channelId);
    if (!lease) return this.review(message);
    if (message.guildId !== lease.scope.guildId || lease.retired) return "ignored";
    if (this.staffUserIds.has(message.author.id) && (this.#shadow || message.author.id !== lease.scope.discordUserId)) {
      // Abort before awaiting any state read. Customer generation does not hold the send gate.
      this.invalidate(lease);
      lease.lastStaffActivity = Date.now();
      await this.bridge.humanTakeover(lease.scope);
      this.record("human_takeover", "success");
      return "staff-takeover";
    }
    if (message.author.id !== lease.scope.discordUserId || !message.content.trim() || message.content.length > 4000 || lease.queued >= 16) return "ignored";
    lease.queued++;
    const next = lease.tail.then(async () => {
      if (lease.retired || this.#leases.get(message.channelId) !== lease) return "silenced" as const;
      if (this.#shadow && lease.abort.signal.aborted) return "silenced" as const;
      await this.bridge.customerMessage(lease.scope);
      let snapshot = await this.bridge.read(lease.scope);
      if (snapshot?.state === "HUMAN_ACTIVE") {
        if (this.#shadow) return "silenced" as const;
        // A customer follow-up waits for a human response. Staff activity refreshes this deadline.
        while (!lease.retired) {
          const waitFor = Math.max(1, lease.lastStaffActivity + this.#humanIdleMs - Date.now());
          await new Promise((resolve) => setTimeout(resolve, waitFor));
          if (Date.now() < lease.lastStaffActivity + this.#humanIdleMs) continue;
          try { await this.bridge.resumeAfterHuman(lease.scope); } catch { return "silenced" as const; }
          lease.abort = new AbortController();
          snapshot = await this.bridge.read(lease.scope);
          break;
        }
        if (lease.retired || !snapshot || snapshot.state !== "AI_ACTIVE") return "silenced" as const;
      }
      if (!snapshot || snapshot.state !== "AI_ACTIVE") return "silenced" as const;
      const ticketToken = await this.bridge.contextForCustomer(lease.scope);
      if (lease.abort.signal.aborted) return "silenced" as const;
      let response: { reply: string };
      try {
        response = await this.agent.run({ sessionId: lease.sessionId, ticketToken, prompt: message.content }, lease.abort.signal);
      } catch {
        this.record("agent_turn", lease.abort.signal.aborted ? "denied" : "failed");
        if (lease.abort.signal.aborted || this.#leases.get(message.channelId) !== lease) return "silenced" as const;
        if (this.#shadow) return "silenced" as const;
        // No retries after an uncertain model/tool run. Stop proactive access and notify staff.
        await this.bridge.handoff(lease.scope, { summary: "AI 客服流程暫時無法完成", reason: "需要人工核對工具或 Harness 結果", attemptedSteps: [] });
        return "silenced" as const;
      }
      if (typeof response.reply !== "string" || !response.reply.trim() || response.reply.length > 6000 ||
          response.reply.includes(ticketToken)) throw new TicketBridgeError();
      this.record("agent_turn", lease.abort.signal.aborted ? "denied" : "success");
      if (this.#shadow) {
        const draftSnapshot = snapshot;
        const assertCurrent = () => this.assertDraftCurrent(lease, draftSnapshot);
        const id = randomUUID();
        try {
          await assertCurrent();
          lease.thread ??= await this.#shadow.openThread(lease.scope);
          const discard = await lease.thread.publish(id, response.reply, assertCurrent);
          try { await assertCurrent(); }
          catch { await discard(); return "silenced" as const; }
          lease.drafts.set(id, { snapshot, discard });
          return "drafted" as const;
        } catch (error) {
          if (lease.abort.signal.aborted) return "silenced" as const;
          throw error;
        }
      }
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
    this.#newChannels.delete(channelId);
    const lease = this.#leases.get(channelId);
    if (!lease) return;
    lease.retired = true;
    this.invalidate(lease);
    await this.bridge.close(lease.scope);
  }

  dispose(): void { this.#newChannels.clear(); this.#unsubscribe(); for (const lease of this.#leases.values()) { lease.retired = true; this.invalidate(lease); } }
}

/** Existing Discord client, no second login or bot token. Errors are static, never raw causes. */
export function attachTicketSupportEvents(client: {
  on(event: string, listener: (...args: never[]) => void): unknown;
  off(event: string, listener: (...args: never[]) => void): unknown;
}, support: DiscordTicketSupport, onFailure: (code: "TICKET_SUPPORT_UNAVAILABLE") => void): () => void {
  const message = (input: TicketCustomerMessage) => { void support.receive(input).catch(() => onFailure("TICKET_SUPPORT_UNAVAILABLE")); };
  const deleted = (channel: { id: string }) => { void support.retireChannel(channel.id).catch(() => onFailure("TICKET_SUPPORT_UNAVAILABLE")); };
  const created = (channel: Parameters<DiscordTicketSupport["observeChannelCreated"]>[0]) => support.observeChannelCreated(channel);
  client.on("channelCreate", created);
  client.on("messageCreate", message);
  client.on("channelDelete", deleted);
  return () => { support.dispose(); client.off("channelCreate", created); client.off("messageCreate", message); client.off("channelDelete", deleted); };
}
