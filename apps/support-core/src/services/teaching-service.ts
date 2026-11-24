import { randomUUID } from "node:crypto";
import { isCanonicalDiscordSnowflake } from "@support-ai-agent/contracts";
import { sha256, TeachingError, type ManagementActor, type ManagementPolicy, type TeachingSource } from "../domain/teaching-policy.js";
import { replaceReviewedSection, reviewedSections, type SectionEdit } from "../domain/teaching-section.js";

export interface WorkflowJournal<Row> {
  read(): Promise<readonly Row[]>;
  append(expectedVersion: number, row: Row): Promise<boolean>;
}

interface ArticleVersion {
  readonly source: string;
  readonly content: string;
}

export interface TeachingRelease {
  readonly id: string;
  readonly digest: string;
}

export interface TeachingCorpusPort {
  articles(release: TeachingRelease | undefined): Promise<readonly ArticleVersion[]>;
  stage(release: TeachingRelease | undefined, articles: readonly ArticleVersion[], previous: ArticleVersion, updated: string): Promise<TeachingRelease>;
  discard(release: TeachingRelease): Promise<void>;
}

export interface TeachingProposal {
  readonly id: string;
  readonly version: string;
  readonly article: string;
  readonly section: string;
  readonly before: string;
  readonly after: string;
  readonly baseVersion: string;
  readonly proposedArticleVersion: string;
  readonly source: TeachingSource;
  readonly ownerUserId: string;
  readonly reverts?: string;
}

export type ProposalState = "pending" | "applying" | "applied" | "declined" | "failed" | "stale";
export interface ProposalRecord {
  readonly proposal: TeachingProposal;
  readonly status: ProposalState;
  readonly binding?: { readonly messageId: string; readonly version: string };
  readonly decision?: { readonly ownerUserId: string; readonly at: string };
  readonly publication?: TeachingRelease;
}

export const isWorkflowId = (id: string): boolean => /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/u.test(id);

function currentRecord(rows: readonly ProposalRecord[], id: string): ProposalRecord | undefined {
  return rows.findLast(row => row.proposal.id === id);
}

function appliedRecords(rows: readonly ProposalRecord[]): (ProposalRecord & { publication: TeachingRelease })[] {
  return rows.filter((row): row is ProposalRecord & { publication: TeachingRelease } => row.status === "applied" && !!row.publication);
}

function activeRelease(rows: readonly ProposalRecord[]): TeachingRelease | undefined {
  return rows.findLast(row => row.status === "applied")?.publication;
}

function corpusVersion(articles: readonly ArticleVersion[]) {
  return sha256(JSON.stringify(articles.map(({ source, content }) => [source, content])));
}

/** The staff adapter supplies provenance and actor context. The agent supplies only the proposed edit. */
export class TeachingService {
  #applying = new Map<string, Promise<ProposalRecord>>();

  constructor(
    private readonly policy: ManagementPolicy,
    private readonly journal: WorkflowJournal<ProposalRecord>,
    private readonly corpus: TeachingCorpusPort,
    private readonly now = () => new Date()
  ) {}

  async reviewed(source: TeachingSource) {
    this.policy.assertTeaching(source);
    const articles = await this.corpus.articles(activeRelease(await this.journal.read()));
    return articles.flatMap(article => reviewedSections(article.source, article.content));
  }

  async propose(source: TeachingSource, edit: SectionEdit): Promise<ProposalRecord> {
    this.policy.assertTeaching(source);
    if (!/^教學[：:]/u.test(source.text)) throw new TeachingError("ineligible");
    return this.create(source, async rows => {
      const articles = await this.corpus.articles(activeRelease(rows));
      const article = articles.find(entry => entry.source === edit.article);
      const section = article && reviewedSections(article.source, article.content).find(item => item.section === edit.section);
      if (!article || !section) throw new TeachingError("ineligible");
      if (section.baseVersion !== edit.baseVersion) throw new TeachingError("stale");
      return this.draft(source, article, section, edit.replacement);
    });
  }

  async proposeRevert(source: TeachingSource, appliedId: string): Promise<ProposalRecord> {
    this.policy.assertTeaching(source);
    if (!isWorkflowId(appliedId) || !new RegExp(`^還原 ${appliedId}[：:]`, "u").test(source.text)) throw new TeachingError("ineligible");
    return this.create(source, async rows => {
      const applied = currentRecord(rows, appliedId);
      if (applied?.status !== "applied") throw new TeachingError("not_found");
      const target = applied.proposal;
      const articles = await this.corpus.articles(activeRelease(rows));
      const article = articles.find(item => item.source === target.article);
      const section = article && reviewedSections(article.source, article.content).find(item => item.section === target.section);
      if (!article || !section || section.body !== target.after) throw new TeachingError("stale");
      return this.draft(source, article, section, target.before, appliedId);
    });
  }

  private draft(source: TeachingSource, article: ArticleVersion, section: ReturnType<typeof reviewedSections>[number],
    replacement: string, reverts?: string): TeachingProposal {
    const updated = replaceReviewedSection(article.content, section, replacement);
    const after = updated.slice(section.start, updated.length - (article.content.length - section.end));
    const terms = { id: randomUUID(), article: article.source, section: section.section,
      baseVersion: section.baseVersion, proposedArticleVersion: sha256(updated), before: section.body, after, source,
      ownerUserId: this.policy.config.ownerUserId, ...(reverts ? { reverts } : {}) };
    return { ...terms, version: sha256(JSON.stringify(terms)) };
  }

  private async create(source: TeachingSource, draft: (rows: readonly ProposalRecord[]) => Promise<TeachingProposal>) {
    for (;;) {
      const rows = await this.journal.read();
      const duplicate = rows.findLast(row => row.proposal.source.messageId === source.messageId);
      if (duplicate) {
        if (duplicate.proposal.source.actor.userId !== source.actor.userId || duplicate.proposal.source.text !== source.text) throw new TeachingError("conflict");
        return duplicate;
      }
      const record = { proposal: await draft(rows), status: "pending" } as const;
      if (await this.journal.append(rows.length, record)) return record;
    }
  }

  /** Called by the trusted delivery after creating the management message. */
  async bind(id: string, message: { guildId: string; channelId: string; messageId: string; version: string }): Promise<ProposalRecord> {
    if (message.guildId !== this.policy.config.guildId || message.channelId !== this.policy.config.channelId ||
        !isCanonicalDiscordSnowflake(message.messageId)) throw new TeachingError("forbidden");
    for (;;) {
      const rows = await this.journal.read();
      const record = currentRecord(rows, id);
      if (!record || record.proposal.version !== message.version) throw new TeachingError("not_found");
      if (record.binding) {
        if (record.binding.messageId === message.messageId) return record;
        throw new TeachingError("conflict");
      }
      if (record.status !== "pending" || rows.some(row => row.binding?.messageId === message.messageId)) throw new TeachingError("conflict");
      const bound = { ...record, binding: { messageId: message.messageId, version: message.version } };
      if (await this.journal.append(rows.length, bound)) return bound;
    }
  }

  async decide(actor: ManagementActor, id: string, messageId: string, approval: "approve" | "decline"): Promise<ProposalRecord> {
    this.policy.assertOwner(actor);
    for (;;) {
      const rows = await this.journal.read();
      const record = currentRecord(rows, id);
      if (!record || record.proposal.ownerUserId !== actor.userId || record.binding?.messageId !== messageId ||
          record.binding.version !== record.proposal.version) throw new TeachingError("forbidden");
      if (record.status === "applying" && approval === "approve") return this.applyOnce(id);
      if (record.status !== "pending") return record;
      const decision = { ownerUserId: actor.userId, at: this.now().toISOString() };
      const chosen: ProposalRecord = { ...record, decision, status: approval === "approve" ? "applying" : "declined" };
      if (await this.journal.append(rows.length, chosen)) return approval === "approve" ? this.applyOnce(id) : chosen;
    }
  }

  private applyOnce(id: string): Promise<ProposalRecord> {
    const inFlight = this.#applying.get(id);
    if (inFlight) return inFlight;
    const applying = this.apply(id).finally(() => { this.#applying.delete(id); });
    this.#applying.set(id, applying);
    return applying;
  }

  private async apply(id: string): Promise<ProposalRecord> {
    for (;;) {
      const rows = await this.journal.read();
      const record = currentRecord(rows, id)!;
      if (record.status !== "applying") return record;
      const release = activeRelease(rows);
      const { proposal } = record;
      let terminal: ProposalRecord;
      let staged: TeachingRelease | undefined;
      try {
        const articles = await this.corpus.articles(release);
        const article = articles.find(entry => entry.source === proposal.article);
        const section = article && reviewedSections(article.source, article.content).find(item => item.section === proposal.section);
        if (!article || !section || section.baseVersion !== proposal.baseVersion || section.body !== proposal.before) {
          terminal = { ...record, status: "stale" };
        } else {
          const updated = replaceReviewedSection(article.content, section, proposal.after);
          if (sha256(updated) !== proposal.proposedArticleVersion) throw new Error("Unexpected article version");
          staged = await this.corpus.stage(release, articles, article, updated);
          // The seed is editable outside this workflow before the first publication.
          if (!release && corpusVersion(await this.corpus.articles(undefined)) !== corpusVersion(articles)) {
            await this.corpus.discard(staged);
            continue;
          }
          terminal = { ...record, publication: staged, status: "applied" };
        }
      } catch {
        if (staged) await this.corpus.discard(staged);
        staged = undefined;
        terminal = { ...record, status: "failed" };
      }

      for (;;) {
        const latest = await this.journal.read();
        const current = currentRecord(latest, id)!;
        if (current.status !== "applying" || activeRelease(latest)?.id !== release?.id) {
          if (staged) await this.corpus.discard(staged);
          break;
        }
        if (await this.journal.append(latest.length, terminal)) return terminal;
      }
    }
  }
}

export { appliedRecords };
