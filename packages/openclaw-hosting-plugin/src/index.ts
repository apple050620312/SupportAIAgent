import { HostingToolContracts, type HostingToolName } from "@openclaw-hosting/contracts";
import { Value } from "@sinclair/typebox/value";
import type { TSchema } from "@sinclair/typebox";

export interface TrustedHostingToolContext {
  /** Opaque capsule obtained from the trusted bot/session bridge, never model args. */
  getTicketToken(): Promise<string>;
  /** Host must reject retired sessions or changed invocation authority. */
  assertCurrent(): void;
}
export interface HostingTool {
  readonly name: HostingToolName;
  readonly label: string;
  readonly description: string;
  readonly parameters: TSchema;
  execute(toolCallId: string, parameters: unknown, signal?: AbortSignal): Promise<{
    readonly content: readonly { readonly type: "text"; readonly text: string }[];
    readonly details: unknown;
  }>;
}
export class HostingToolError extends Error {
  constructor(readonly code: string) { super(`Support tool failed (${code})`); this.name = "HostingToolError"; }
}
const descriptions: Record<HostingToolName, string> = {
  identify_customer: "確認目前 Discord 客戶已連結 不接受客戶 ID",
  list_my_services: "列出目前客戶擁有的服務",
  get_service_details: "查詢目前客戶的一項服務",
  list_my_servers: "列出目前客戶的活躍遊戲伺服器",
  get_my_server_status: "查詢已擁有服務的伺服器狀態",
  get_my_server_resources: "查詢已擁有服務的資源使用量",
  restart_my_server: "重新啟動已擁有且目前可操作的伺服器 會在 Core 驗證 ownership 並限制頻率後執行",
  handoff_to_staff: "將尚未驗證的代理摘要交給客服單機器人安排人工接手"
};
const allowedErrors = new Set(["UNAUTHENTICATED", "TICKET_ACCESS_DENIED", "INVALID_REQUEST", "IDENTITY_NOT_LINKED",
  "SERVICE_NOT_FOUND", "SERVICE_NOT_OWNED", "SERVER_NOT_FOUND", "UPSTREAM_UNAVAILABLE"]);

export function createHostingTools(
  baseUrl: string, context: TrustedHostingToolContext, fetchImpl: typeof fetch = fetch
): readonly HostingTool[] {
  let base: URL;
  try {
    base = new URL(baseUrl);
    const local = base.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
    if ((!local && base.protocol !== "https:") || base.username || base.password || base.search || base.hash ||
        base.pathname !== "/") throw new Error();
  } catch { throw new HostingToolError("CONFIGURATION"); }

  return (Object.keys(HostingToolContracts) as HostingToolName[]).map((name) => ({
    name, label: name, description: descriptions[name], parameters: HostingToolContracts[name].input,
    async execute(_toolCallId, parameters, signal) {
      if (!Value.Check(HostingToolContracts[name].input, parameters)) throw new HostingToolError("INVALID_REQUEST");
      try { context.assertCurrent(); signal?.throwIfAborted(); }
      catch { throw new HostingToolError("TICKET_ACCESS_DENIED"); }
      const args = parameters as Record<string, unknown>;
      const ref = typeof args.serviceRef === "string" ? encodeURIComponent(args.serviceRef) : "";
      const routes: Record<HostingToolName, string> = {
        identify_customer: "v1/me/identity", list_my_services: "v1/me/services",
        get_service_details: `v1/me/services/${ref}`, list_my_servers: "v1/me/servers",
        get_my_server_status: `v1/me/servers/${ref}/status`,
        get_my_server_resources: `v1/me/servers/${ref}/resources`, restart_my_server: `v1/me/servers/${ref}/restart`, handoff_to_staff: "v1/me/handoff"
      };
      try {
        const token = await context.getTicketToken();
        context.assertCurrent();
        signal?.throwIfAborted();
        const response = await fetchImpl(new URL(routes[name], base).href, {
          method: name === "handoff_to_staff" || name === "restart_my_server" ? "POST" : "GET",
          headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
          ...(name === "handoff_to_staff" ? { body: JSON.stringify(parameters) } : name === "restart_my_server" ? { body: JSON.stringify({}) } : {}),
          redirect: "error", signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000)
        });
        if (response.redirected || response.headers.get("content-type")?.split(";")[0] !== "application/json" || response.body === null) {
          await response.body?.cancel().catch(() => undefined);
          throw new HostingToolError("UPSTREAM_UNAVAILABLE");
        }
        const reader = (response.body as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder("utf-8", { fatal: true });
        let body = "";
        let length = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.byteLength;
            if (length > 524_288) throw new HostingToolError("UPSTREAM_UNAVAILABLE");
            body += decoder.decode(value, { stream: true });
          }
          body += decoder.decode();
        } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
        const parsed: unknown = JSON.parse(body);
        // Handoff intentionally retires proactive AI access; its receipt contains no customer data.
        if (name !== "handoff_to_staff") context.assertCurrent();
        signal?.throwIfAborted();
        if (!response.ok) {
          const code = typeof parsed === "object" && parsed !== null && "code" in parsed ? parsed.code : null;
          throw new HostingToolError(typeof code === "string" && allowedErrors.has(code) ? code : "UPSTREAM_UNAVAILABLE");
        }
        if (!Value.Check(HostingToolContracts[name].output, parsed)) throw new HostingToolError("UPSTREAM_UNAVAILABLE");
        return { content: [{ type: "text", text: JSON.stringify(parsed) }], details: parsed };
      } catch (error: unknown) {
        if (error instanceof HostingToolError) throw error;
        throw new HostingToolError("UPSTREAM_UNAVAILABLE");
      }
    }
  }));
}

/** SDK-facing host wrapper must supply verified context; unknown sessions get no tools. */
export function hostingToolFactory(
  baseUrl: string, trustedContext: TrustedHostingToolContext | null, fetchImpl: typeof fetch = fetch
): readonly HostingTool[] | null {
  return trustedContext === null ? null : createHostingTools(baseUrl, trustedContext, fetchImpl);
}
