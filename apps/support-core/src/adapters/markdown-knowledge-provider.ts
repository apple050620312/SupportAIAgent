import { createHash } from "node:crypto";
import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import type {
  KnowledgeReadRequest, KnowledgeReadResponse, KnowledgeSearchRequest, KnowledgeSearchResponse
} from "@openclaw-hosting/contracts";
import type { SupportKnowledgeProvider } from "../ports/index.js";

export class KnowledgeIndexError extends Error {
  constructor() { super("Support knowledge could not be indexed; check the configured folder and documented limits locally"); }
}
interface Article { articleRef: string; source: string; title: string; lines: string[]; }
interface Chunk { article: Article; heading: string; startLine: number; endLine: number; text: string; terms: Map<string, number>; }
interface Index { articles: Map<string, Article>; chunks: Chunk[]; frequency: Map<string, number>; averageLength: number; bytes: number; }
export interface KnowledgeLimits {
  readonly maxFiles: number;
  readonly maxFileBytes: number;
  readonly maxTotalBytes: number;
  readonly refreshMs: number;
}
const DEFAULT_LIMITS: KnowledgeLimits = { maxFiles: 2000, maxFileBytes: 1_048_576, maxTotalBytes: 67_108_864, refreshMs: 30_000 };
const SKIP_DIRECTORIES = new Set(["node_modules", "dist", "coverage", "vendor"]);
const MAX_LINE_CHARS = 8000;

function normalized(text: string): string { return text.normalize("NFKC").toLowerCase(); }
/** English words/error codes and Han characters/bigrams support mixed Chinese queries without an external service. */
function terms(text: string): Map<string, number> {
  const result = new Map<string, number>();
  const add = (term: string) => result.set(term, (result.get(term) ?? 0) + 1);
  const value = normalized(text);
  for (const match of value.matchAll(/[a-z0-9]+(?:[._-][a-z0-9]+)*/g)) {
    add(match[0]);
    const parts = match[0].split(/[._-]/);
    if (parts.length > 1) for (const part of parts) if (part) add(part);
  }
  for (const match of value.matchAll(/\p{Script=Han}+/gu)) {
    const chars = Array.from(match[0]);
    for (let i = 0; i < chars.length; i++) {
      add(chars[i]!);
      if (i + 1 < chars.length) add(chars[i]! + chars[i + 1]!);
    }
  }
  return result;
}
function within(root: string, path: string): boolean {
  const local = relative(root, path);
  return local === "" || (!isAbsolute(local) && local !== ".." && !local.startsWith(`..${sep}`));
}
function heading(line: string): string | undefined {
  return /^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/.exec(line)?.[1]?.slice(0, 256);
}
function chunksFor(article: Article): Chunk[] {
  const chunks: Chunk[] = [];
  let section = article.title;
  let start = 0;
  while (start < article.lines.length) {
    section = heading(article.lines[start]!) ?? section;
    let end = start;
    let size = 0;
    while (end < article.lines.length) {
      const line = article.lines[end]!;
      if (end > start && (heading(line) !== undefined || size + line.length + 1 > 4000)) break;
      size += line.length + 1;
      end++;
    }
    const text = article.lines.slice(start, end).join("\n");
    if (text.trim()) chunks.push({ article, heading: section, startLine: start + 1, endLine: end, text,
      terms: terms(`${article.source}\n${article.title}\n${section}\n${text}`) });
    start = end;
  }
  return chunks;
}

/** Read-only local corpus. No document can select a file outside the operator's root. */
export class MarkdownKnowledgeProvider implements SupportKnowledgeProvider {
  #root: string;
  #limits: KnowledgeLimits;
  #index: Index | undefined;
  #refreshedAt = Number.NEGATIVE_INFINITY;
  #refreshing: Promise<void> | undefined;

  constructor(root: string, limits: Partial<KnowledgeLimits> = {}) {
    if (!isAbsolute(root)) throw new KnowledgeIndexError();
    this.#root = resolve(root);
    this.#limits = { ...DEFAULT_LIMITS, ...limits };
    if (Object.values(this.#limits).some((value) => !Number.isSafeInteger(value) || value < 0) ||
        this.#limits.maxFiles < 1 || this.#limits.maxFileBytes < 1 || this.#limits.maxTotalBytes < 1) throw new KnowledgeIndexError();
  }

  async refresh(): Promise<void> {
    if (this.#refreshing) return this.#refreshing;
    this.#refreshing = this.buildIndex();
    try { await this.#refreshing; }
    catch { throw new KnowledgeIndexError(); }
    finally { this.#refreshing = undefined; }
  }

  async stats(): Promise<{ articles: number; chunks: number; bytes: number }> {
    const index = await this.current();
    return { articles: index.articles.size, chunks: index.chunks.length, bytes: index.bytes };
  }

  async search(request: KnowledgeSearchRequest): Promise<KnowledgeSearchResponse> {
    const index = await this.current();
    const query = normalized(request.query.trim());
    const queryTerms = terms(query);
    const scored = index.chunks.map((chunk) => {
      let score = 0;
      const length = [...chunk.terms.values()].reduce((sum, n) => sum + n, 0);
      for (const term of queryTerms.keys()) {
        const tf = chunk.terms.get(term) ?? 0;
        if (!tf) continue;
        const df = index.frequency.get(term) ?? 0;
        const idf = Math.log(1 + (index.chunks.length - df + 0.5) / (df + 0.5));
        score += idf * (tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * length / index.averageLength));
      }
      if (query && normalized(chunk.text).includes(query)) score += 3;
      return { chunk, score };
    }).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score ||
      a.chunk.article.source.localeCompare(b.chunk.article.source) || a.chunk.startLine - b.chunk.startLine);
    return { trust: "reference_only", matches: scored.slice(0, request.limit ?? 5).map(({ chunk }) => ({
      articleRef: chunk.article.articleRef, source: chunk.article.source, title: chunk.article.title,
      heading: chunk.heading, startLine: chunk.startLine, endLine: chunk.endLine, excerpt: chunk.text.slice(0, 800)
    })) };
  }

  async read(request: KnowledgeReadRequest): Promise<KnowledgeReadResponse | null> {
    const index = await this.current();
    const article = index.articles.get(request.articleRef);
    const start = (request.startLine ?? 1) - 1;
    if (!article || start >= article.lines.length) return null;
    let end = start;
    const selected: string[] = [];
    let size = 0;
    while (end < article.lines.length && end - start < (request.maxLines ?? 80)) {
      const line = article.lines[end]!;
      const added = line.length + (selected.length ? 1 : 0);
      if (size + added > 24_000) break;
      size += added; selected.push(line); end++;
    }
    return { trust: "reference_only", articleRef: article.articleRef, source: article.source, title: article.title,
      content: selected.join("\n"), startLine: start + 1, endLine: end, totalLines: article.lines.length,
      ...(end < article.lines.length ? { nextLine: end + 1 } : {}) };
  }

  private async current(): Promise<Index> {
    if (!this.#index || Date.now() - this.#refreshedAt >= this.#limits.refreshMs) await this.refresh();
    return this.#index!;
  }

  private async buildIndex(): Promise<void> {
    const rootStat = await lstat(this.#root);
    if (!rootStat.isDirectory() || rootStat.isSymbolicLink() || await realpath(this.#root) !== this.#root) throw new KnowledgeIndexError();
    const articles = new Map<string, Article>();
    const chunks: Chunk[] = [];
    let bytes = 0;
    let entriesSeen = 0;
    const deadline = Date.now() + 15_000;
    const visit = async (directory: string, depth: number): Promise<void> => {
      if (depth > 16 || Date.now() > deadline) throw new KnowledgeIndexError();
      const actual = await realpath(directory);
      if (!within(this.#root, actual) || actual !== directory || (await lstat(directory)).isSymbolicLink()) throw new KnowledgeIndexError();
      const entries = await readdir(directory, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (++entriesSeen > 20_000 || Date.now() > deadline) throw new KnowledgeIndexError();
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!SKIP_DIRECTORIES.has(entry.name)) await visit(path, depth + 1);
          continue;
        }
        if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".md")) continue;
        const source = relative(this.#root, path).split(sep).join("/");
        if (source.length > 512 || Array.from(source).some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new KnowledgeIndexError();
        const before = await lstat(path);
        if (!before.isFile() || before.isSymbolicLink() || !within(this.#root, await realpath(path)) || before.size > this.#limits.maxFileBytes) throw new KnowledgeIndexError();
        const handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
        let content: string;
        try {
          const opened = await handle.stat();
          if (!opened.isFile() || opened.ino !== before.ino || opened.dev !== before.dev || opened.size !== before.size) throw new KnowledgeIndexError();
          // Bounded read even if a file grows after stat. Never readFile an unbounded stream.
          const buffer = Buffer.alloc(this.#limits.maxFileBytes + 1);
          let length = 0;
          while (length < buffer.length) {
            const read = await handle.read(buffer, length, buffer.length - length, length);
            if (!read.bytesRead) break;
            length += read.bytesRead;
          }
          const after = await handle.stat();
          if (length > this.#limits.maxFileBytes || after.size !== opened.size || after.mtimeMs !== opened.mtimeMs || after.ctimeMs !== opened.ctimeMs) throw new KnowledgeIndexError();
          bytes += length;
          if (bytes > this.#limits.maxTotalBytes) throw new KnowledgeIndexError();
          content = new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length)).replace(/\r\n?/g, "\n");
        } finally { await handle.close(); }
        if (content.includes("\0")) throw new KnowledgeIndexError();
        if (!content.trim()) continue;
        const lines = content.split("\n");
        if (lines.length > 20_000 || lines.some((line) => line.length > MAX_LINE_CHARS)) throw new KnowledgeIndexError();
        const articleRef = `kb:${createHash("sha256").update(source).update("\0").update(content).digest("hex")}`;
        const article = { articleRef, source, title: lines.map(heading).find((value) => value !== undefined) ?? entry.name.slice(0, 256), lines };
        articles.set(articleRef, article); chunks.push(...chunksFor(article));
        if (articles.size > this.#limits.maxFiles || chunks.length > 40_000) throw new KnowledgeIndexError();
      }
    };
    await visit(this.#root, 0);
    const frequency = new Map<string, number>();
    let totalLength = 0;
    for (const chunk of chunks) {
      for (const [term, count] of chunk.terms) { frequency.set(term, (frequency.get(term) ?? 0) + 1); totalLength += count; }
    }
    // Replace the entire snapshot only after every file has been validated.
    this.#index = { articles, chunks, frequency, averageLength: totalLength / Math.max(1, chunks.length) || 1, bytes };
    this.#refreshedAt = Date.now();
  }
}
