import { createHash } from "node:crypto";
import { Value } from "@sinclair/typebox/value";
import { isCanonicalDiscordSnowflake, TicketScopeSchema, type TicketScope, type TicketSnapshot, type TicketState } from "@openclaw-hosting/contracts";
import { sameTicket, TicketBridgeError, type TicketMessenger, type TicketStore } from "./index.js";

export interface LegacyTicketReader {
  readByChannel(channelId: string): Promise<unknown>;
}
export interface LegacyDiscordTransport {
  /** Resolve the channel in the existing bot and verify its guild before sending. */
  send(scope: TicketScope, text: string, options: { allowedMentions: { parse: readonly string[] } }): Promise<void>;
}

/** Uses the existing bot's Mongoose model; no database driver or credential in Core. */
export function legacyMongooseReader(model: {
  findOne(filter: { channelId: string }): { lean(): { exec(): Promise<unknown> } };
}): LegacyTicketReader {
  return { readByChannel: (channelId) => model.findOne({ channelId }).lean().exec() };
}

function validScope(scope: TicketScope): boolean {
  return Value.Check(TicketScopeSchema, scope) && Object.values(scope).every(isCanonicalDiscordSnowflake);
}
function legacyRecord(value: unknown, scope: TicketScope): "open" | "retired" {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return "retired";
  const row = value as Record<string, unknown>;
  return row.guildId === scope.guildId && row.channelId === scope.channelId && row.userId === scope.discordUserId &&
    row.closed === false && row.deleted === false && (row.claimedBy === null || row.claimedBy === "")
    ? "open" : "retired";
}

/**
 * Opt-in single-bot-process overlay on ticket-main's unchanged schema.
 * Restart loses admission and therefore disables AI; uncertain sends never retry.
 * All legacy mutations MUST use guardLegacyMutation (the installer wraps query exec).
 */
export class LegacyTicketAdapter implements TicketStore, TicketMessenger {
  #sessions = new Map<string, TicketSnapshot>();
  #receipts = new Map<string, { digest: string; state: "pending" | "sent" }>();
  #tail: Promise<unknown> = Promise.resolve();
  #guardInstalled = false;
  #retirementListeners = new Set<(channelId: string) => void>();
  constructor(private readonly tickets: LegacyTicketReader, private readonly discord: LegacyDiscordTransport) {}

  onRetirement(listener: (channelId: string) => void): () => void {
    this.#retirementListeners.add(listener);
    return () => { this.#retirementListeners.delete(listener); };
  }
  private notifyRetirement(channelId: string): void {
    for (const listener of this.#retirementListeners) {
      try { listener(channelId); } catch { /* Admission is already revoked even if a host observer fails. */ }
    }
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.#tail.then(operation);
    this.#tail = next.catch(() => undefined);
    return next;
  }

  private async current(scope: TicketScope): Promise<TicketSnapshot | null> {
    if (!validScope(scope)) throw new TicketBridgeError();
    const snapshot = this.#sessions.get(scope.channelId);
    if (!this.#guardInstalled || !snapshot || !sameTicket(snapshot.scope, scope)) return null;
    const baseline = await this.tickets.readByChannel(scope.channelId);
    if (legacyRecord(baseline, scope) !== "open" && snapshot.state !== "CLOSED") {
      const retired: TicketSnapshot = { scope: { ...scope }, state: "CLOSED", revision: snapshot.revision + 1 };
      this.#sessions.set(scope.channelId, retired);
      this.notifyRetirement(scope.channelId);
      return retired;
    }
    return snapshot;
  }

  /** Call only for an operator-approved ticket, never automatically for every open row. */
  enable(scope: TicketScope): Promise<TicketSnapshot> {
    return this.serialized(async () => {
      if (!this.#guardInstalled || !validScope(scope) ||
          (!this.#sessions.has(scope.channelId) && this.#sessions.size >= 1000) ||
          legacyRecord(await this.tickets.readByChannel(scope.channelId), scope) !== "open") {
        throw new TicketBridgeError();
      }
      const previous = this.#sessions.get(scope.channelId);
      const snapshot: TicketSnapshot = { scope: { ...scope }, state: "AI_ACTIVE", revision: (previous?.revision ?? -1) + 1 };
      this.#sessions.set(scope.channelId, snapshot);
      return { ...snapshot, scope: { ...scope } };
    });
  }

  /** Installer-owned lifetime. Removing the guard immediately revokes admission. */
  attachMutationGuard(): () => void {
    if (this.#guardInstalled) throw new TicketBridgeError();
    this.#guardInstalled = true;
    return () => {
      this.#guardInstalled = false;
      for (const [channelId, snapshot] of this.#sessions) {
        this.#sessions.set(channelId, { ...snapshot, state: "CLOSED", revision: snapshot.revision + 1 });
        this.notifyRetirement(channelId);
      }
    };
  }

  read(scope: TicketScope): Promise<TicketSnapshot | null> {
    return this.serialized(async () => {
      const snapshot = await this.current(scope);
      return snapshot ? { ...snapshot, scope: { ...snapshot.scope } } : null;
    });
  }

  compareAndSet(snapshot: TicketSnapshot, nextState: TicketState): Promise<boolean> {
    return this.serialized(async () => {
      const current = await this.current(snapshot.scope);
      if (!current || current.state !== snapshot.state || current.revision !== snapshot.revision) return false;
      if (!["AI_ACTIVE", "WAITING_CUSTOMER", "HUMAN_NEEDED", "HUMAN_ACTIVE", "CLOSED"].includes(nextState) ||
          !Number.isSafeInteger(current.revision + 1)) throw new TicketBridgeError();
      this.#sessions.set(snapshot.scope.channelId, { scope: { ...snapshot.scope }, state: nextState, revision: current.revision + 1 });
      // HUMAN_ACTIVE is a reversible staff handoff; the Discord ingress aborts the
      // current generation but may resume after the configured human-idle window.
      if (nextState === "CLOSED") this.notifyRetirement(snapshot.scope.channelId);
      return true;
    });
  }

  /** Retire before legacy writes. Reopen cannot revive an old session or invocation. */
  guardLegacyMutation<T>(operation: () => Promise<T>): Promise<T> {
    return this.serialized(async () => {
      for (const [channelId, snapshot] of this.#sessions) {
        this.#sessions.set(channelId, { ...snapshot, state: "CLOSED", revision: snapshot.revision + 1 });
        this.notifyRetirement(channelId);
      }
      return operation();
    });
  }

  send(scope: TicketScope, text: string, options: Parameters<TicketMessenger["send"]>[2]): Promise<void> {
    return this.serialized(async () => {
      const current = await this.current(scope);
      const expected = options.expectedSnapshot;
      if (!current || !sameTicket(expected.scope, scope) || current.state !== "HUMAN_NEEDED" ||
          expected.state !== "HUMAN_NEEDED" || current.revision !== expected.revision ||
          options.allowedMentions.length !== 0 || text.length === 0 || text.length > 2000 || !options.idempotencyKey) {
        throw new TicketBridgeError();
      }
      const digest = createHash("sha256").update(text).digest("hex");
      const receiptKey = `${scope.guildId}:${scope.channelId}:${current.revision}:${options.idempotencyKey}`;
      const receipt = this.#receipts.get(receiptKey);
      if (receipt) {
        if (receipt.digest !== digest || receipt.state !== "sent") throw new TicketBridgeError();
        return;
      }
      this.#receipts.set(receiptKey, { digest, state: "pending" });
      // Rejection can mean Discord accepted the message. Keep pending; do not retry blindly.
      await this.discord.send(scope, text, { allowedMentions: { parse: [] } });
      this.#receipts.set(receiptKey, { digest, state: "sent" });
    });
  }

  sendIfCurrent(snapshot: TicketSnapshot, text: string, options: Parameters<TicketMessenger["sendIfCurrent"]>[2]): Promise<boolean> {
    return this.serialized(async () => {
      const current = await this.current(snapshot.scope);
      if (!current || current.revision !== snapshot.revision || current.state !== snapshot.state ||
          !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(current.state)) return false;
      if (options.allowedMentions.length !== 0 || text.length === 0 || text.length > 2000) throw new TicketBridgeError();
      await this.discord.send(snapshot.scope, text, { allowedMentions: { parse: [] } });
      return true;
    });
  }
}

/**
 * Runtime decoration, not edits to the archive. Install BEFORE loading baseline
 * handlers, on their shared model. One process only; document/save and external
 * database writers are outside this admission model and must not be used.
 */
const guardedModels = new WeakSet<object>();
export function installLegacyMutationGuard(model: Record<string, unknown>, adapter: LegacyTicketAdapter): () => void {
  const restorers: (() => void)[] = [];
  const names = ["findOneAndUpdate", "updateOne", "updateMany", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove", "replaceOne"];
  if (typeof model.findOneAndUpdate !== "function" || guardedModels.has(model)) throw new TicketBridgeError();
  const detach = adapter.attachMutationGuard();
  guardedModels.add(model);
  for (const name of names) {
    const original = model[name];
    if (typeof original !== "function") continue;
    const replacement = function(this: unknown, ...args: unknown[]): unknown {
      const query: unknown = Reflect.apply(original, this, args);
      if (query === null || typeof query !== "object" || !("exec" in query) || typeof query.exec !== "function") {
        throw new TicketBridgeError();
      }
      const execute = query.exec;
      query.exec = (...execArgs: unknown[]) => adapter.guardLegacyMutation(() => Promise.resolve(Reflect.apply(execute, query, execArgs)));
      return query;
    };
    model[name] = replacement;
    restorers.push(() => { if (model[name] === replacement) model[name] = original; });
  }
  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    detach(); guardedModels.delete(model); for (const restore of restorers) restore();
  };
}
