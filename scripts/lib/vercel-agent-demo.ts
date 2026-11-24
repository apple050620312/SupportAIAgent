/** Offline-only bridge around the existing synthetic harness. Not a production host adapter. */
import { MockLanguageModelV4 } from "ai/test";
import { createVercelTicketRunner, FileHistoryStore, SupportCoreClient, type DraftVerifier, type TrustedAgentSession } from "@support-ai-agent/agent-loop";
import type { LanguageModel } from "ai";
import type { createMockSupport } from "./mock-support.js";

export const DEMO_PASSAGE = "Query status and confirm the result with the customer.";
export const DEMO_ANSWER = `${DEMO_PASSAGE} [synthetic/recovery.md:1-2]`;
export function mockText(text: string) {
  return {
    content: [{ type: "text" as const, text }], finishReason: { unified: "stop" as const, raw: "stop" },
    usage: { inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 }, outputTokens: { total: 1, text: 1, reasoning: 0 } }, warnings: []
  };
}
export function mockCall(name: string, input: unknown = {}) {
  return { ...mockText(""), content: [{ type: "tool-call" as const, toolCallId: "synthetic-call", toolName: name, input: JSON.stringify(input) }], finishReason: { unified: "tool-calls" as const, raw: "tool_calls" } };
}
export function createDemoModel() {
  return new MockLanguageModelV4({ doGenerate: [mockCall("search_support_knowledge", { query: "status" }), mockText(DEMO_ANSWER)] });
}
const mockVerifier: DraftVerifier = ({ draft, passages }) => Promise.resolve({
  claimsSupported: true, complete: true,
  references: passages.filter(({ label }) => draft.includes(label)).map(({ label }) => label)
});

export function demoRunner(harness: ReturnType<typeof createMockSupport>, historyRoot: string, model: LanguageModel = createDemoModel(), selection?: string, semanticRelevance?: Parameters<typeof createVercelTicketRunner>[0]["semanticRelevance"], verifyDraft = mockVerifier) {
  const coreFetch: typeof fetch = async (url, init) => {
    const parsed = new URL(typeof url === "string" ? url : url instanceof URL ? url.href : url.url);
    const response = await harness.app.inject({
      method: init?.method === "POST" ? "POST" : "GET", url: parsed.pathname,
      headers: Object.fromEntries(new Headers(init?.headers)),
      ...(typeof init?.body === "string" ? { payload: init.body } : {})
    });
    return new Response(response.body, { status: response.statusCode, headers: { "content-type": "application/json" } });
  };
  return createVercelTicketRunner({ model, verifyDraft, ...(semanticRelevance ? { semanticRelevance } : {}), core: new SupportCoreClient("https://synthetic-core.example.invalid/", coreFetch), history: new FileHistoryStore(historyRoot),
    authenticate: async ({ sessionId, ticketToken }): Promise<TrustedAgentSession> => {
      const scope = harness.tokens.verify(ticketToken);
      if (scope.channelId !== sessionId) throw new Error("Wrong session");
      const assertCurrent = async () => {
        harness.tokens.verify(ticketToken);
        const snapshot = await harness.bridge.read(scope);
        if (!snapshot || !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(snapshot.state)) throw new Error("Retired session");
      };
      await assertCurrent();
      return { scope, assertCurrent, selectedServiceRef: selection ?? (scope.discordUserId.endsWith("615") ? "whmcs-service:1" : "whmcs-service:2") };
    }
  });
}
