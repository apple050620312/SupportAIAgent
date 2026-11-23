import { HandoffRequestSchema, type HandoffRequest, type TicketScope, type TicketSnapshot, type TicketState } from "@support-ai-agent/contracts";
import { Value } from "@sinclair/typebox/value";
import type { TicketContextTokens } from "@support-ai-agent/trusted-context";

export { LegacyTicketAdapter, legacyMongooseReader, installLegacyMutationGuard } from "./legacy-ticket.js";
export type { LegacyTicketReader, LegacyDiscordTransport } from "./legacy-ticket.js";
export { DEFAULT_HUMAN_IDLE_MS, DiscordTicketSupport, attachTicketSupportEvents } from "./discord-ticket.js";
export type { DiscordTicketSupportOptions, TicketAgentRunner, TicketCustomerMessage } from "./discord-ticket.js";
export { createOpenClawTicketRunner } from "./openclaw-runner.js";

export interface TicketStore {
  read(scope: TicketScope): Promise<TicketSnapshot | null>;
  /** Atomic authoritative state; a process overlay must revoke all admission on restart. */
  compareAndSet(snapshot: TicketSnapshot, nextState: TicketState): Promise<boolean>;
}
export interface TicketMessenger {
  /** Implement in the existing bot; disable all allowed mentions for generated text. */
  send(scope: TicketScope, text: string, options: {
    readonly allowedMentions: readonly string[];
    /** Persist receipts, or revoke admission on restart and refuse uncertain-send retries. */
    readonly idempotencyKey?: string;
    /** Check this HUMAN_NEEDED revision atomically with receipt/send; deny closed/claimed tickets. */
    readonly expectedSnapshot: TicketSnapshot;
  }): Promise<void>;
  /** Bot serializes the state check, send and takeover/close on this channel. */
  sendIfCurrent(snapshot: TicketSnapshot, text: string, options: { readonly allowedMentions: readonly string[] }): Promise<boolean>;
}

export class TicketBridgeError extends Error {
  constructor() { super("Ticket operation unavailable or unauthorized"); this.name = "TicketBridgeError"; }
}

export function sameTicket(a: TicketScope, b: TicketScope): boolean {
  return a.discordUserId === b.discordUserId && a.guildId === b.guildId && a.channelId === b.channelId;
}

/** Host calls these methods only after verifying Discord actor, channel and staff roles. */
export class TicketBridge {
  constructor(private readonly store: TicketStore, private readonly messages: TicketMessenger,
    private readonly tokens: TicketContextTokens) {}

  async read(scope: TicketScope): Promise<TicketSnapshot | null> {
    const snapshot = await this.store.read(scope);
    if (snapshot !== null && !sameTicket(scope, snapshot.scope)) return null;
    if (snapshot !== null && (!Number.isSafeInteger(snapshot.revision) || snapshot.revision < 0 ||
        !["AI_ACTIVE", "WAITING_CUSTOMER", "HUMAN_NEEDED", "HUMAN_ACTIVE", "CLOSED"].includes(snapshot.state))) {
      throw new TicketBridgeError();
    }
    return snapshot;
  }

  async contextForCustomer(scope: TicketScope): Promise<string> {
    const snapshot = await this.read(scope);
    if (!snapshot || !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(snapshot.state)) throw new TicketBridgeError();
    return this.tokens.issue(scope);
  }

  async handoff(scope: TicketScope, request: HandoffRequest): Promise<void> {
    if (!Value.Check(HandoffRequestSchema, request)) throw new TicketBridgeError();
    const snapshot = await this.read(scope);
    if (!snapshot) throw new TicketBridgeError();
    if (snapshot.state === "HUMAN_ACTIVE") return;
    if (snapshot.state === "CLOSED" || (snapshot.state !== "HUMAN_NEEDED" &&
        !await this.store.compareAndSet(snapshot, "HUMAN_NEEDED"))) {
      throw new TicketBridgeError();
    }
    // These are agent-reported statements, not verified provider facts.
    const text = ["AI 客服交班", "代理摘要與回報步驟 尚未由人工驗證", request.summary,
      `原因 ${request.reason}`, ...request.attemptedSteps.map((step) => `已回報步驟 ${step}`)].join("\n");
    const revision = snapshot.state === "HUMAN_NEEDED" ? snapshot.revision : snapshot.revision + 1;
    try {
      // Discord messages have a 2000-character limit. Preserve content in bounded chunks.
      let rest = text;
      let part = 0;
      while (rest.length > 0) {
        let end = Math.min(rest.length, 1800);
        if (end < rest.length && /[\uD800-\uDBFF]/.test(rest[end - 1] ?? "")) end--;
        await this.messages.send(scope, rest.slice(0, end), {
          allowedMentions: [], idempotencyKey: `handoff:${scope.channelId}:${revision}:${part}`,
          expectedSnapshot: { scope, state: "HUMAN_NEEDED", revision }
        });
        rest = rest.slice(end);
        part++;
      }
    }
    catch { throw new TicketBridgeError(); }
  }

  async customerMessage(scope: TicketScope): Promise<void> {
    const snapshot = await this.read(scope);
    if (snapshot?.state === "WAITING_CUSTOMER" && !await this.store.compareAndSet(snapshot, "AI_ACTIVE")) {
      throw new TicketBridgeError();
    }
  }

  /** Reopen only after the trusted host's human-idle policy has elapsed. */
  async resumeAfterHuman(scope: TicketScope): Promise<void> {
    const snapshot = await this.read(scope);
    if (!snapshot || snapshot.state === "CLOSED" ||
        (snapshot.state !== "HUMAN_ACTIVE" && snapshot.state !== "AI_ACTIVE") ||
        (snapshot.state === "HUMAN_ACTIVE" && !await this.store.compareAndSet(snapshot, "AI_ACTIVE"))) {
      throw new TicketBridgeError();
    }
  }

  async waitForCustomer(scope: TicketScope): Promise<void> {
    const snapshot = await this.read(scope);
    if (!snapshot || snapshot.state !== "AI_ACTIVE" || !await this.store.compareAndSet(snapshot, "WAITING_CUSTOMER")) {
      throw new TicketBridgeError();
    }
  }

  async humanTakeover(scope: TicketScope): Promise<void> {
    const snapshot = await this.read(scope);
    if (!snapshot || snapshot.state === "CLOSED") throw new TicketBridgeError();
    if (snapshot.state !== "HUMAN_ACTIVE" && !await this.store.compareAndSet(snapshot, "HUMAN_ACTIVE")) {
      throw new TicketBridgeError();
    }
  }

  async close(scope: TicketScope): Promise<void> {
    const snapshot = await this.read(scope);
    if (!snapshot) throw new TicketBridgeError();
    if (snapshot.state !== "CLOSED" && !await this.store.compareAndSet(snapshot, "CLOSED")) throw new TicketBridgeError();
  }

  /** Recheck authoritative state immediately before sending, not only before generating. */
  async replyIfCurrent(snapshot: TicketSnapshot, text: string): Promise<boolean> {
    const current = await this.read(snapshot.scope);
    if (!current || current.revision !== snapshot.revision || !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(current.state)) {
      return false;
    }
    return this.messages.sendIfCurrent(snapshot, text, { allowedMentions: [] });
  }
}
export * from "./audit.js";
