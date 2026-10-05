import { describe, expect, it, vi } from "vitest";
import { LegacyTicketAdapter, TicketBridge, installLegacyMutationGuard, DiscordTicketSupport, createOpenClawTicketRunner } from "@openclaw-hosting/ticket-bridge";
import { registerHostingPlugin, type OpenClawHostingApi } from "@openclaw-hosting/openclaw-plugin/native";
import { createHostingTurnHandler, type OpenClawHostingRuntime } from "@openclaw-hosting/openclaw-plugin/turn";
import { createMockSupport, MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

describe("baseline bot to native OpenClaw to Core offline composition", () => {
  it("executes a native resource tool and suppresses stale output after a legacy mutation", async () => {
    const mock = createMockSupport();
    try {
      const baseline = { guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId, userId: MOCK_SCOPE.discordUserId,
        closed: false, deleted: false, claimedBy: null };
      const reader = { readByChannel: () => Promise.resolve(baseline) };
      const send = vi.fn().mockResolvedValue(undefined);
      const adapter = new LegacyTicketAdapter(reader, { send });
      installLegacyMutationGuard({ findOneAndUpdate: () => ({ exec: () => Promise.resolve() }) }, adapter);
      const bridge = new TicketBridge(adapter, adapter, mock.tokens);
      vi.spyOn(mock.bridge, "read").mockImplementation((scope) => bridge.read(scope));
      vi.spyOn(mock.bridge, "handoff").mockImplementation((scope, request) => bridge.handoff(scope, request));
      const coreFetch: typeof fetch = async (url, init) => {
        const address = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
        const response = await mock.app.inject({ url: new URL(address).pathname, headers: Object.fromEntries(new Headers(init?.headers)) });
        return new Response(response.body, { status: response.statusCode, headers: { "content-type": "application/json" } });
      };
      const registered = vi.fn<OpenClawHostingApi["registerTool"]>();
      registerHostingPlugin({ pluginConfig: { coreBaseUrl: "https://support.example.invalid" }, registerTool: registered }, coreFetch);
      let retire = false;
      const runtime: OpenClawHostingRuntime = { version: "2026.9.8", config: { current: () => ({}) }, agent: {
        resolveAgentWorkspaceDir: () => "synthetic-workspace",
        async runEmbeddedAgent(params) {
          const factory = registered.mock.calls.find(([, options]) => options.names[0] === "get_my_server_resources")![0];
          const tool = factory.create({ toolBindings: params.toolBindings, assertInvocationCurrent: () => params.abortSignal.throwIfAborted() })!;
          const resources = await tool.execute("synthetic-native-call", { serviceRef: "whmcs-service:1" });
          expect(resources.details).toMatchObject({ data: { memoryBytes: 1024 } });
          if (retire) await adapter.guardLegacyMutation(() => Promise.resolve());
          return { meta: {}, payloads: [{ text: "Synthetic resource explanation" }] };
        }
      } };
      const turn = createHostingTurnHandler("https://support.example.invalid", "hosting-support", runtime, coreFetch);
      const gatewayFetch: typeof fetch = async (_url, init) => new Response(JSON.stringify(await turn(JSON.parse(init?.body as string), init?.signal ?? undefined)),
        { headers: { "content-type": "application/json" } });
      const runner = createOpenClawTicketRunner("https://gateway.example.invalid", "synthetic-gateway", gatewayFetch);
      const ingress = new DiscordTicketSupport(reader, adapter, bridge, runner, new Set([MOCK_OTHER_SCOPE.discordUserId]));
      await ingress.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
      const message = { guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId, author: { id: MOCK_SCOPE.discordUserId, bot: false }, content: "Synthetic resources question" };
      expect(await ingress.receive(message)).toBe("sent");
      expect(send).toHaveBeenCalledTimes(1);
      expect(mock.providerCalls.some((path) => path.endsWith("/resources"))).toBe(true);
      retire = true;
      expect(await ingress.receive(message)).toBe("silenced");
      expect(send).toHaveBeenCalledTimes(1);
    } finally { await mock.app.close(); }
  });
});
