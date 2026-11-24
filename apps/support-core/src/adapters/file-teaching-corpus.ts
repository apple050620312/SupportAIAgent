import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { KnowledgeReadRequest, KnowledgeSearchRequest } from "@support-ai-agent/contracts";
import { reviewedSections } from "../domain/teaching-section.js";
import type { SupportKnowledgeProvider } from "../ports/index.js";
import { appliedRecords, isWorkflowId, type ProposalRecord, type TeachingCorpusPort, type TeachingRelease, type WorkflowJournal } from "../services/teaching-service.js";
import { MarkdownKnowledgeProvider, type KnowledgeArticle } from "./markdown-knowledge-provider.js";
import { buildPassageIndex, corpusDigest, SemanticKnowledgeProvider, type EmbeddingPort, type PassageIndex } from "./semantic-knowledge-provider.js";
import { checkedDirectory, readPrivateFile, syncDirectory, teachingDirectory, writePrivateFile } from "./teaching-files.js";

type Article = Pick<KnowledgeArticle, "source" | "content">;
type Embeddings = EmbeddingPort & { model: string };
type TeachingSpan = { startLine: number; endLine: number; teachingDate: string };

export class FileTeachingCorpus implements TeachingCorpusPort {
  constructor(readonly root: string, private readonly indexPath: string, private readonly embeddings?: Embeddings) {}

  async articles(release: TeachingRelease | undefined): Promise<KnowledgeArticle[]> {
    return (await this.markdown(release)).articles();
  }

  private async markdown(release: TeachingRelease | undefined) {
    const root = release ? join(await this.releaseDirectory(release.id), "markdown") : this.root;
    return new MarkdownKnowledgeProvider(root, release || this.embeddings ? { refreshMs: Number.MAX_SAFE_INTEGER } : {});
  }

  private async releaseDirectory(id: string, create = false) {
    if (!isWorkflowId(id)) throw new Error("Invalid knowledge release");
    const releases = await teachingDirectory(this.root, "releases", create);
    if (!releases) throw new Error("Knowledge releases are unavailable");
    const path = join(releases, id);
    if (!await checkedDirectory(path, create)) throw new Error("Knowledge release is unavailable");
    return path;
  }

  async stage(release: TeachingRelease | undefined, articles: readonly Article[], previous: Article, updated: string): Promise<TeachingRelease> {
    if (!this.embeddings) throw new Error("Official embeddings are required for publishing");
    const id = randomUUID();
    const directory = await this.releaseDirectory(id, true);
    try {
      const root = join(directory, "markdown");
      await checkedDirectory(root, true);
      const directories = new Set([root]);
      for (const article of articles) {
        const segments = article.source.split("/");
        const filename = segments.pop()!;
        let destination = root;
        // Paths come from the canonical Markdown loader. Validate before materializing them.
        for (const segment of [...segments, filename]) {
          if (!segment || segment.startsWith(".") || segment.includes("\0")) throw new Error("Invalid release path");
        }
        for (const segment of segments) {
          destination = join(destination, segment);
          if (directories.has(destination)) continue;
          await checkedDirectory(destination, true);
          directories.add(destination);
        }
        await writePrivateFile(join(destination, filename), article.source === previous.source ? updated : article.content);
      }

      const lexical = new MarkdownKnowledgeProvider(root);
      const base = await this.markdown(release);
      const baseIndex = await this.loadIndex(base, release).catch(error => {
        if (release) throw error;
        return undefined;
      });
      const index = await buildPassageIndex(await lexical.passages(), this.embeddings, baseIndex?.index);
      new SemanticKnowledgeProvider(lexical, this.embeddings, index);
      await writePrivateFile(join(directory, "previous.md"), previous.content);
      await writePrivateFile(join(directory, "passages.json"), JSON.stringify(index));
      for (const path of directories) await syncDirectory(path);
      await syncDirectory(directory);
      return { id, digest: index.digest };
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      throw error;
    }
  }

  async discard(release: TeachingRelease): Promise<void> {
    await rm(await this.releaseDirectory(release.id), { recursive: true, force: true }).catch(() => undefined);
  }

  async open(rows: readonly ProposalRecord[]) {
    const applied = appliedRecords(rows);
    const release = applied.at(-1)?.publication;
    const lexical = await this.markdown(release);
    const semantic = this.embeddings ? await this.loadIndex(lexical, release) : undefined;
    const provider: SupportKnowledgeProvider = semantic ?? lexical;
    if (!release) return { provider, lexical, semantic };
    const bySection = new Map(applied.map(({ proposal }) => [JSON.stringify([proposal.article, proposal.section]), proposal.source.at.slice(0, 10)]));
    const spans = new Map<string, TeachingSpan[]>();
    for (const { source, content, articleRef } of await lexical.articles()) {
      const revised = reviewedSections(source, content).flatMap(({ section, startLine, endLine }) => {
        const teachingDate = bySection.get(JSON.stringify([source, section]));
        return teachingDate ? [{ startLine, endLine, teachingDate }] : [];
      });
      if (revised.length) spans.set(articleRef, revised);
    }

    const dated: SupportKnowledgeProvider = {
      async search(request, signal) {
        const result = await provider.search(request, signal);
        return { ...result, matches: result.matches.map(match => {
          const teachingDate = overlapping(spans.get(match.articleRef), match)[0]?.teachingDate;
          return teachingDate ? { ...match, teachingDate } : match;
        }) };
      },
      async read(request, signal) {
        const result = await provider.read(request, signal);
        if (!result) return result;
        const teachings = overlapping(spans.get(result.articleRef), result);
        return teachings.length ? { ...result, teachings } : result;
      }
    };
    return { provider: dated, lexical, semantic };
  }

  private async loadIndex(lexical: MarkdownKnowledgeProvider, release: TeachingRelease | undefined) {
    if (!this.embeddings) throw new Error("Embeddings are unavailable");
    if (!release) return SemanticKnowledgeProvider.load(lexical, this.embeddings, this.indexPath);
    const index = JSON.parse(await readPrivateFile(join(await this.releaseDirectory(release.id), "passages.json"))) as PassageIndex;
    if (index.model !== this.embeddings.model || index.digest !== release.digest || index.digest !== corpusDigest(await lexical.passages())) {
      throw new Error("Published knowledge does not match its index");
    }
    return new SemanticKnowledgeProvider(lexical, this.embeddings, index);
  }
}

function overlapping(spans: TeachingSpan[] | undefined, range: { startLine: number; endLine: number }): TeachingSpan[] {
  return spans?.filter(span => span.startLine <= range.endLine && span.endLine >= range.startLine) ?? [];
}

/** Each request uses a single published snapshot. Refresh when another process publishes a release. */
export class PublishedKnowledgeProvider implements SupportKnowledgeProvider {
  private snapshot: { releaseId: string | undefined; open: ReturnType<FileTeachingCorpus["open"]> } | undefined;
  constructor(private readonly corpus: FileTeachingCorpus, private readonly journal: WorkflowJournal<ProposalRecord>) {}

  async current() {
    const rows = await this.journal.read();
    const releaseId = rows.findLast(row => row.status === "applied")?.publication?.id;
    if (!this.snapshot || releaseId !== this.snapshot.releaseId) {
      const open = this.corpus.open(rows);
      const snapshot = { releaseId, open };
      this.snapshot = snapshot;
      void open.catch(() => { if (this.snapshot === snapshot) this.snapshot = undefined; });
    }
    return this.snapshot.open;
  }

  async search(request: KnowledgeSearchRequest, signal?: AbortSignal) {
    signal?.throwIfAborted();
    return (await this.current()).provider.search(request, signal);
  }

  async read(request: KnowledgeReadRequest, signal?: AbortSignal) {
    signal?.throwIfAborted();
    return (await this.current()).provider.read(request, signal);
  }
}
