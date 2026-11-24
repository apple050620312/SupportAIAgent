import { Value } from "@sinclair/typebox/value";
import {
  KnowledgeSearchRequestSchema, KnowledgeSearchResponseSchema, KnowledgeReadRequestSchema, KnowledgeReadResponseSchema,
  type KnowledgeSearchRequest, type KnowledgeSearchResponse, type KnowledgeReadRequest, type KnowledgeReadResponse
} from "@support-ai-agent/contracts";
import type { SupportKnowledgeProvider } from "../ports/index.js";
import { KnowledgeNotFoundError, UpstreamUnavailableError } from "../domain/errors.js";

/** Documentation never establishes actor identity, ownership or mutation approval. */
export class SupportKnowledgeService {
  constructor(private readonly provider: SupportKnowledgeProvider) {}

  async search(request: KnowledgeSearchRequest, signal?: AbortSignal): Promise<KnowledgeSearchResponse> {
    if (!Value.Check(KnowledgeSearchRequestSchema, request) || !request.query.trim()) throw new UpstreamUnavailableError("Support knowledge");
    try {
      signal?.throwIfAborted();
      const result = await this.provider.search(request, signal);
      signal?.throwIfAborted();
      if (!Value.Check(KnowledgeSearchResponseSchema, result)) throw new Error();
      return result;
    } catch { throw new UpstreamUnavailableError("Support knowledge"); }
  }

  async read(request: KnowledgeReadRequest, signal?: AbortSignal): Promise<KnowledgeReadResponse> {
    if (!Value.Check(KnowledgeReadRequestSchema, request)) throw new UpstreamUnavailableError("Support knowledge");
    let result: KnowledgeReadResponse | null;
    try {
      signal?.throwIfAborted();
      result = await this.provider.read(request, signal);
      signal?.throwIfAborted();
      if (result !== null && !Value.Check(KnowledgeReadResponseSchema, result)) throw new Error();
    } catch { throw new UpstreamUnavailableError("Support knowledge"); }
    if (result === null) throw new KnowledgeNotFoundError();
    return result;
  }
}
