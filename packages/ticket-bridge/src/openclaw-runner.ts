import { TicketBridgeError } from "./index.js";
import type { TicketAgentRunner } from "./discord-ticket.js";

/** Bot -> gateway-authenticated native hosting route. No provider credentials. */
export function createOpenClawTicketRunner(baseUrl: string, gatewayToken: string, fetchImpl: typeof fetch = fetch): TicketAgentRunner {
  let base: URL;
  try {
    base = new URL(baseUrl);
    const local = base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if ((!local && base.protocol !== "https:") || base.username || base.password || base.search || base.hash ||
        base.pathname !== "/" || !gatewayToken.trim()) throw new Error();
  } catch { throw new TicketBridgeError(); }
  return { async run(request, signal) {
    try {
      signal.throwIfAborted();
      const response = await fetchImpl(new URL("hosting-support/turn", base).href, {
        method: "POST", headers: { authorization: `Bearer ${gatewayToken}`, "content-type": "application/json" },
        body: JSON.stringify(request), redirect: "error", signal: AbortSignal.any([signal, AbortSignal.timeout(60_000)])
      });
      if (!response.ok || response.redirected || response.body === null ||
          response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        await response.body?.cancel().catch(() => undefined); throw new Error();
      }
      const reader = (response.body as ReadableStream<Uint8Array>).getReader();
      let bytes = 0; let body = "";
      const decoder = new TextDecoder("utf-8", { fatal: true });
      try {
        while (true) {
          const { done, value } = await reader.read(); if (done) break;
          bytes += value.byteLength; if (bytes > 32_768) throw new Error();
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
      signal.throwIfAborted();
      const parsed: unknown = JSON.parse(body);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      const row = parsed as Record<string, unknown>;
      if (Object.keys(row).length !== 1 || typeof row.reply !== "string" || !row.reply.trim() ||
          row.reply.length > 6000 || row.reply.includes(request.ticketToken) || row.reply.includes(gatewayToken)) throw new Error();
      return { reply: row.reply };
    } catch { throw new TicketBridgeError(); }
  } };
}
