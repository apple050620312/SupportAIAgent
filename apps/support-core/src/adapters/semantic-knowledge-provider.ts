import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { KnowledgeSearchResponse, KnowledgeSearchRequest, KnowledgeReadRequest } from "@support-ai-agent/contracts";
import type { SupportKnowledgeProvider } from "../ports/index.js";
import type { MarkdownKnowledgeProvider } from "./markdown-knowledge-provider.js";

type Passage = KnowledgeSearchResponse["matches"][number];
export interface EmbeddingPort { embed(texts: string[]): Promise<number[][]>; }
export interface PassageIndex { model: string; digest: string; passages: Passage[]; vectors: number[][]; }
export const passageText = (p: Passage): string => `${p.title}\n${p.heading}\n${p.excerpt}`;
export const corpusDigest = (passages: Passage[]): string => createHash("sha256").update(JSON.stringify(passages)).digest("hex");
export function cosine(a: number[], b: number[]): number {
  if (!a.length || a.length !== b.length || !a.every(Number.isFinite) || !b.every(Number.isFinite)) throw new Error("Invalid embedding vector");
  let dot = 0, aa = 0, bb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i]! * b[i]!; aa += a[i]! ** 2; bb += b[i]! ** 2; }
  if (!aa || !bb) throw new Error("Invalid embedding norm");
  return dot / Math.sqrt(aa * bb);
}
/** Official endpoint only; never shares the chat provider or serializes provider errors. */
export class OpenAIEmbeddings implements EmbeddingPort {
  readonly model: string;
  #key: string;
  constructor(env: NodeJS.ProcessEnv = process.env) {
    if (env.EMBEDDING_PROVIDER !== "openai" || !env.OPENAI_API_KEY) throw new Error("Official embeddings configuration missing");
    this.model = env.EMBEDDING_MODEL || "text-embedding-3-small";
    if (!["text-embedding-3-small", "text-embedding-3-large", "text-embedding-ada-002"].includes(this.model)) throw new Error("Unsupported embedding model");
    this.#key = env.OPENAI_API_KEY;
  }
  async embed(texts: string[]): Promise<number[][]> {
    try {
      const response = await fetch("https://api.openai.com/v1/embeddings", { method: "POST", headers: { authorization: `Bearer ${this.#key}`, "content-type": "application/json" }, body: JSON.stringify({ model: this.model, input: texts }), signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { data?: { index: number; embedding: number[] }[] };
      if (!Array.isArray(data.data) || data.data.length !== texts.length) throw new Error();
      const vectors = data.data.sort((a, b) => a.index - b.index).map((d, i) => { if (d.index !== i) throw new Error(); return d.embedding; });
      for (const vector of vectors) cosine(vector, vectors[0]!);
      return vectors;
    } catch { throw new Error("Official embedding request failed"); }
  }
}

/** Shared documentation adapter behind the existing Core knowledge port. */
export class SemanticKnowledgeProvider implements SupportKnowledgeProvider {
  #cache = new Map<string, Promise<number[]>>();
  constructor(readonly lexical: MarkdownKnowledgeProvider, readonly embeddings: EmbeddingPort, readonly index: PassageIndex) {
    if (index.vectors.length !== index.passages.length || index.digest !== corpusDigest(index.passages)) throw new Error("Invalid passage index");
    for (const vector of index.vectors) cosine(vector, index.vectors[0]!);
  }
  static async load(lexical: MarkdownKnowledgeProvider, embeddings: OpenAIEmbeddings, path: string): Promise<SemanticKnowledgeProvider> {
    const index = JSON.parse(await readFile(path, "utf8")) as PassageIndex;
    if (index.model !== embeddings.model || index.digest !== corpusDigest(await lexical.passages())) throw new Error("Stale embedding index; rebuild it");
    return new SemanticKnowledgeProvider(lexical, embeddings, index);
  }
  async vector(query: string): Promise<number[]> {
    let cached = this.#cache.get(query);
    if (!cached) {
      if (this.#cache.size >= 1000) this.#cache.clear();
      cached = this.embeddings.embed([query]).then(v => v[0]!);
      this.#cache.set(query, cached);
      cached.catch(() => this.#cache.delete(query));
    }
    return cached;
  }
  async similarity(query: string, passage: Passage): Promise<number> {
    const i = this.index.passages.findIndex(p => p.articleRef === passage.articleRef && p.startLine === passage.startLine && p.endLine === passage.endLine && p.excerpt === passage.excerpt);
    return i < 0 ? -1 : cosine(await this.vector(query), this.index.vectors[i]!);
  }
  async search(request: KnowledgeSearchRequest): Promise<KnowledgeSearchResponse> {
    const query = await this.vector(request.query);
    const lexical = await this.lexical.search({ query: request.query, limit: 8 });
    const ranks = new Map(lexical.matches.map((p, i) => [`${p.articleRef}:${p.startLine}`, i]));
    const ranked = this.index.passages.map((passage, i) => {
      const semantic = cosine(query, this.index.vectors[i]!);
      const rank = ranks.get(`${passage.articleRef}:${passage.startLine}`);
      // Semantic dominates; bounded reciprocal lexical rank breaks close semantic ties.
      return { passage, score: semantic + (rank === undefined ? 0 : 0.02 / (rank + 1)) };
    }).sort((a, b) => b.score - a.score);
    return { trust: "reference_only", matches: ranked.slice(0, request.limit ?? 5).map(r => r.passage) };
  }
  read(request: KnowledgeReadRequest) { return this.lexical.read(request); }
}
