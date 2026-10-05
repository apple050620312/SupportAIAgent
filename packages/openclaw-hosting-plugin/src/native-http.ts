import type { IncomingMessage, ServerResponse } from "node:http";
import { createHostingTurnHandler, HostingTurnError, type OpenClawHostingRuntime } from "./turn.js";

export interface HostingHttpApi {
  readonly pluginConfig?: Record<string, unknown>;
  readonly runtime: OpenClawHostingRuntime;
  registerHttpRoute(route: {
    path: string; auth: "gateway"; match: "exact";
    handler(request: IncomingMessage, response: ServerResponse): Promise<void>;
  }): void;
}

/** Gateway authenticates the bot. Capsules remain request/run metadata, never model text. */
export function registerHostingTurnRoute(api: HostingHttpApi, fetchImpl: typeof fetch = fetch): void {
  const base = api.pluginConfig?.coreBaseUrl;
  const agentId = api.pluginConfig?.agentId ?? "hosting-support";
  if (typeof base !== "string" || typeof agentId !== "string") throw new HostingTurnError("INVALID_REQUEST");
  const run = createHostingTurnHandler(base, agentId, api.runtime, fetchImpl);
  api.registerHttpRoute({ path: "/hosting-support/turn", auth: "gateway", match: "exact",
    async handler(request, response) {
      const controller = new AbortController();
      let readTimer: ReturnType<typeof setTimeout> | undefined;
      const abort = () => { if (!response.writableEnded) controller.abort(); };
      response.once("close", abort);
      function send(status: number, body: unknown) {
        if (response.destroyed || response.writableEnded) return;
        response.writeHead(status, { "content-type": "application/json", "cache-control": "no-store" });
        response.end(JSON.stringify(body));
      }
      try {
        if (request.method !== "POST" || request.url?.includes("?") ||
            request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
          send(400, { code: "INVALID_REQUEST" }); return;
        }
        const chunks: Buffer[] = [];
        let bytes = 0;
        readTimer = setTimeout(() => request.destroy(), 10_000);
        readTimer.unref();
        for await (const chunk of request) {
          const data = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as Uint8Array);
          bytes += data.byteLength;
          if (bytes > 24_576) { send(413, { code: "INVALID_REQUEST" }); return; }
          chunks.push(data);
        }
        clearTimeout(readTimer);
        let input: unknown;
        try { input = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))); }
        catch { send(400, { code: "INVALID_REQUEST" }); return; }
        send(200, await run(input, controller.signal));
      } catch (error: unknown) {
        const code = error instanceof HostingTurnError ? error.code : "RUNTIME_UNAVAILABLE";
        send(code === "INVALID_REQUEST" ? 400 : code === "SESSION_DENIED" ? 403 : 503, { code });
      } finally { clearTimeout(readTimer); response.removeListener("close", abort); }
    }
  });
}
