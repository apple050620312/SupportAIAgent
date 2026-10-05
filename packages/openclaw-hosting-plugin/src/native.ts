import { HostingToolContracts, type HostingToolName } from "@openclaw-hosting/contracts";
import { createHostingTools, type HostingTool } from "./index.js";
import { registerHostingTurnRoute, type HostingHttpApi } from "./native-http.js";

/** Narrow structural subset verified against OpenClaw v2026.9.8 tool-types.ts. */
export interface OpenClawHostingContext {
  readonly toolBindings?: Readonly<Record<string, unknown>>;
  readonly assertInvocationCurrent: () => void;
}
interface NativeTool extends Omit<HostingTool, "execute"> {
  readonly outputSchema: unknown;
  readonly executionMode: "sequential";
  execute(toolCallId: string, parameters: unknown, signal?: AbortSignal): Promise<{
    content: readonly { type: "text"; text: string }[]; details: { data: unknown };
  }>;
}
export interface OpenClawHostingApi {
  readonly pluginConfig?: Record<string, unknown>;
  registerTool(factory: { contextVersion: 2; create(context: OpenClawHostingContext): NativeTool | null },
    options: { names: string[]; optional: true }): void;
}

/** Native entry. The signed capsule is out-of-band toolBindings, never a tool argument or prompt. */
export function registerHostingPlugin(api: OpenClawHostingApi, fetchImpl: typeof fetch = fetch): void {
  const baseUrl = api.pluginConfig?.coreBaseUrl;
  if (typeof baseUrl !== "string") throw new Error("Hosting plugin requires coreBaseUrl");
  for (const name of Object.keys(HostingToolContracts) as HostingToolName[]) {
    api.registerTool({ contextVersion: 2, create(context) {
      const binding = context.toolBindings?.["hosting-support"];
      if (binding === null || typeof binding !== "object" || Array.isArray(binding) ||
          typeof context.assertInvocationCurrent !== "function") return null;
      const record = binding as Record<string, unknown>;
      if (Object.keys(record).length !== 1 || typeof record.ticketToken !== "string" ||
          record.ticketToken.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(record.ticketToken)) return null;
      const token = record.ticketToken;
      const tool = createHostingTools(baseUrl, {
        assertCurrent: () => context.assertInvocationCurrent(),
        getTicketToken: () => Promise.resolve(token)
      }, fetchImpl).find((candidate) => candidate.name === name)!;
      return {
        ...tool, executionMode: "sequential", outputSchema: {
          type: "object", additionalProperties: false,
          properties: { data: HostingToolContracts[name].output }, required: ["data"]
        },
        async execute(toolCallId, parameters, signal) {
          const result = await tool.execute(toolCallId, parameters, signal);
          // OpenClaw reserves top-level status/error for tool outcomes; domain status stays in data.
          return { content: result.content, details: { data: result.details } };
        }
      };
    } }, { names: [name], optional: true });
  }
}

export default {
  id: "hosting-support", name: "Hosting Support", version: "0.0.0",
  description: "Read-only hosting support through trusted Support Core",
  register(api: OpenClawHostingApi & HostingHttpApi) {
    registerHostingPlugin(api);
    registerHostingTurnRoute(api);
  }
};
