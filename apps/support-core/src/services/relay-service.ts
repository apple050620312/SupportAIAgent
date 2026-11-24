import { randomUUID } from "node:crypto";
import { isCanonicalDiscordSnowflake, type TicketScope } from "@support-ai-agent/contracts";
import { type ManagementPolicy, TeachingError, type ManagementActor } from "../domain/teaching-policy.js";
import type { WorkflowJournal } from "./teaching-service.js";

type RelayTicket = Pick<TicketScope, "guildId" | "channelId">;
export type RelayPolisher = (input: { question: string; answer: string }) => Promise<string>;

interface StaffEntry {
  readonly text: string;
  readonly staffUserId: string;
  readonly at: string;
}

export interface RelayRecord {
  readonly id: string;
  readonly ticket: RelayTicket;
  readonly question: string;
  readonly openedAt: string;
  readonly messageId?: string;
  readonly answer?: StaffEntry;
  readonly draft?: { readonly text: string; readonly at: string };
  readonly outcome?: StaffEntry;
}

function bounded(text: string, limit: number): string {
  if (typeof text !== "string" || !text.trim() || text.length > limit || text.includes("\0")) throw new TeachingError("invalid_edit");
  return text;
}

/** Draft and staff records only. Delivery to the ticket is outside this interface. */
export class AdminRelayService {
  #drafts = new Map<string, Promise<RelayRecord>>();

  constructor(
    private readonly policy: ManagementPolicy,
    private readonly journal: WorkflowJournal<RelayRecord>,
    private readonly polish: RelayPolisher,
    private readonly now = () => new Date()
  ) {}

  async open(ticket: RelayTicket, question: string): Promise<RelayRecord> {
    if (ticket.guildId !== this.policy.config.guildId || ticket.channelId === this.policy.config.channelId ||
        !isCanonicalDiscordSnowflake(ticket.channelId)) throw new TeachingError("forbidden");
    const record = { id: randomUUID(), ticket: { guildId: ticket.guildId, channelId: ticket.channelId },
      question: bounded(question, 3_000), openedAt: this.now().toISOString() };
    for (;;) {
      const rows = await this.journal.read();
      if (await this.journal.append(rows.length, record)) return record;
    }
  }

  async bind(id: string, message: { guildId: string; channelId: string; messageId: string }): Promise<RelayRecord> {
    if (message.guildId !== this.policy.config.guildId || message.channelId !== this.policy.config.channelId ||
        !isCanonicalDiscordSnowflake(message.messageId)) throw new TeachingError("forbidden");
    return this.update(id, (record, rows) => {
      if (record.messageId === message.messageId) return record;
      if (record.messageId || rows.some(row => row.messageId === message.messageId)) throw new TeachingError("conflict");
      return { ...record, messageId: message.messageId };
    });
  }

  async questionForAnswer(actor: ManagementActor, id: string, messageId: string): Promise<RelayRecord> {
    this.policy.assertStaff(actor);
    const record = (await this.journal.read()).findLast(row => row.id === id);
    if (record?.messageId !== messageId || (record.answer && record.answer.staffUserId !== actor.userId)) {
      throw new TeachingError("forbidden");
    }
    return record;
  }

  async answer(actor: ManagementActor, id: string, messageId: string, text: string): Promise<RelayRecord> {
    this.policy.assertStaff(actor);
    const entry = this.staffEntry(actor, text);
    const answered = await this.update(id, record => {
      if (record.messageId !== messageId) throw new TeachingError("forbidden");
      if (record.answer) {
        if (record.answer.staffUserId !== actor.userId || record.answer.text !== text) throw new TeachingError("conflict");
        return record;
      }
      return { ...record, answer: entry };
    });
    if (answered.draft) return answered;
    const inFlight = this.#drafts.get(id);
    if (inFlight) return inFlight;
    const drafting = this.generateDraft(answered, entry).finally(() => { this.#drafts.delete(id); });
    this.#drafts.set(id, drafting);
    return drafting;
  }

  private async generateDraft(record: RelayRecord, answer: StaffEntry) {
    const text = bounded(await this.polish({ question: record.question, answer: answer.text }), 3_200);
    return this.update(record.id, current => current.draft ? current : { ...current, draft: { text, at: this.now().toISOString() } });
  }

  async recordOutcome(actor: ManagementActor, id: string, text: string): Promise<RelayRecord> {
    this.policy.assertStaff(actor);
    const outcome = this.staffEntry(actor, text);
    return this.update(id, record => {
      if (!record.draft) throw new TeachingError("conflict");
      if (record.outcome) {
        if (record.outcome.staffUserId !== actor.userId || record.outcome.text !== text) throw new TeachingError("conflict");
        return record;
      }
      return { ...record, outcome };
    });
  }

  private staffEntry(actor: ManagementActor, text: string): StaffEntry {
    return { text: bounded(text, 4_000), staffUserId: actor.userId, at: this.now().toISOString() };
  }

  private async update(id: string, change: (record: RelayRecord, rows: readonly RelayRecord[]) => RelayRecord): Promise<RelayRecord> {
    for (;;) {
      const rows = await this.journal.read();
      const record = rows.findLast(row => row.id === id);
      if (!record) throw new TeachingError("not_found");
      const next = change(record, rows);
      if (next === record || await this.journal.append(rows.length, next)) return next;
    }
  }
}
