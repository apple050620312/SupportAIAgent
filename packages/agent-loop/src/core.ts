import { Value } from "@sinclair/typebox/value";
import type { TSchema } from "@sinclair/typebox";
import type { TicketScope } from "@openclaw-hosting/contracts";

/** Supplied only by the authenticated host. Never derive selection or scope from model/chat input. */
export interface TrustedAgentSession {
  scope: TicketScope;
  selectedServiceRef: string | null;
  assertCurrent(): Promise<void>;
}

/** Narrow delivery client: every request reaches existing Core routes, matrix, audit and domain ports. */
export class SupportCoreClient {
  private readonly base: URL;
  constructor(baseUrl: string, private readonly fetchImpl: typeof fetch = fetch) {
    this.base = new URL(baseUrl);
    const local = this.base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(this.base.hostname);
    if ((!local && this.base.protocol !== "https:") || this.base.pathname !== "/" || this.base.username || this.base.password || this.base.search || this.base.hash) {
      throw new Error("Invalid Support Core URL");
    }
  }
  async call(path: string, body: unknown, schema: TSchema, token: string, session: TrustedAgentSession, signal: AbortSignal): Promise<unknown> {
    await session.assertCurrent();
    signal.throwIfAborted();
    try {
      const response = await this.fetchImpl(new URL(path, this.base), {
        method: body === undefined ? "GET" : "POST", redirect: "error",
        headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      });
      if (!response.ok || response.redirected || response.headers.get("content-type")?.split(";")[0] !== "application/json" || !response.body) {
        await response.body?.cancel(); throw new Error();
      }
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      let size = 0; let raw = "";
      const decoder = new TextDecoder("utf-8", { fatal: true });
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          size += value.byteLength; if (size > 65_536) throw new Error();
          raw += decoder.decode(value, { stream: true });
        }
        raw += decoder.decode();
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      const result: unknown = JSON.parse(raw);
      if (!Value.Check(schema, result)) throw new Error();
      if (path !== "v1/me/handoff") await session.assertCurrent();
      signal.throwIfAborted();
      return result;
    } catch { throw new Error("Support Core request denied or unavailable"); }
  }
}
