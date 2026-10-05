import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createHostingTurnHandler, type OpenClawHostingRuntime } from "@openclaw-hosting/openclaw-plugin/turn";
import { registerHostingTurnRoute, type HostingHttpApi } from "@openclaw-hosting/openclaw-plugin/native-http";
import { createMockSupport, MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

async function fixture() {
  const mock = createMockSupport();
  const token = await mock.bridge.contextForCustomer(MOCK_SCOPE);
  const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (url, init) => {
    const address = typeof url === "string" ? url : url instanceof URL ? url.href : url.url;
    const response = await mock.app.inject({ url: new URL(address).pathname, headers: Object.fromEntries(new Headers(init?.headers)) });
    return new Response(response.body, { status: response.statusCode, headers: { "content-type": "application/json" } });
  });
  const runEmbeddedAgent = vi.fn<OpenClawHostingRuntime["agent"]["runEmbeddedAgent"]>().mockResolvedValue({
    meta: {}, payloads: [{ text: "Synthetic final reply" }]
  });
  const runtime: OpenClawHostingRuntime = { version: "2026.9.8", config: { current: () => ({}) },
    agent: { runEmbeddedAgent, resolveAgentWorkspaceDir: () => "synthetic-workspace" } };
  const run = createHostingTurnHandler("https://support.example.invalid", "hosting-support", runtime, fetchMock);
  return { mock, token, fetchMock, runtime, runEmbeddedAgent, run,
    request: { sessionId: randomUUID(), ticketToken: token, prompt: "Synthetic question" } };
}

describe("trusted OpenClaw embedded turn", () => {
  it("admits through Core and places the capsule exclusively in runtime toolBindings", async () => {
    const f = await fixture();
    try {
      expect(await f.run(f.request)).toEqual({ reply: "Synthetic final reply" });
      const args = f.runEmbeddedAgent.mock.calls[0]![0];
      expect(args.prompt).toBe("Synthetic question"); expect(args.prompt).not.toContain(f.token);
      expect(args.toolBindings).toEqual({ "hosting-support": { ticketToken: f.token } });
      expect(args.toolsAllow).toHaveLength(13); expect(args.toolExecutionAllow).toEqual(args.toolsAllow);
      expect(args.toolsAllow).not.toContain("exec"); expect(args.toolsAllow).not.toContain("message");
      expect(args.abortSignal).toBeInstanceOf(AbortSignal); expect(args.terminalReplyExpectation).toBe("required");
    } finally { await f.mock.app.close(); }
  });
  it.each([{ clientid: 1 }, { sessionId: "arbitrary" }, { prompt: " " }])("rejects malformed input before any network %#", async (override) => {
    const f = await fixture();
    try {
      await expect(f.run({ ...f.request, ...override })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
      expect(f.fetchMock).not.toHaveBeenCalled(); expect(f.runEmbeddedAgent).not.toHaveBeenCalled();
    } finally { await f.mock.app.close(); }
  });
  it("never admits unknown or human-controlled context to the model", async () => {
    const f = await fixture();
    try {
      await f.mock.bridge.humanTakeover(MOCK_SCOPE);
      await expect(f.run(f.request)).rejects.toMatchObject({ code: "SESSION_DENIED" });
      expect(f.runEmbeddedAgent).not.toHaveBeenCalled();
    } finally { await f.mock.app.close(); }
  });
  it("cannot reuse an admitted session for another valid customer capsule", async () => {
    const f = await fixture();
    try {
      await f.run(f.request);
      const other = await f.mock.bridge.contextForCustomer(MOCK_OTHER_SCOPE);
      await expect(f.run({ ...f.request, ticketToken: other })).rejects.toMatchObject({ code: "SESSION_DENIED" });
      expect(f.runEmbeddedAgent).toHaveBeenCalledTimes(1);
    } finally { await f.mock.app.close(); }
  });
  it("separates persisted transcript identities across customers even after the registry restarts", async () => {
    const f = await fixture();
    try {
      await f.run(f.request);
      const otherToken = await f.mock.bridge.contextForCustomer(MOCK_OTHER_SCOPE);
      const restarted = createHostingTurnHandler("https://support.example.invalid", "hosting-support", f.runtime, f.fetchMock);
      await restarted({ ...f.request, ticketToken: otherToken });
      const first = f.runEmbeddedAgent.mock.calls[0]![0];
      const other = f.runEmbeddedAgent.mock.calls[1]![0];
      expect(first.sessionId).not.toBe(other.sessionId); expect(first.sessionKey).not.toBe(other.sessionKey);
      expect(first.sessionKey).not.toContain(MOCK_SCOPE.discordUserId);
    } finally { await f.mock.app.close(); }
  });
  it.each([
    { meta: { aborted: true }, payloads: [{ text: "Do not deliver" }] },
    { meta: { error: { message: "synthetic-private-error" } }, payloads: [{ text: "Do not deliver" }] },
    { meta: {}, payloads: [{ isReasoning: true, text: "Private reasoning" }] },
    { meta: {}, payloads: [{ mediaUrl: "https://private.example.invalid", text: "Do not deliver" }] },
    { meta: {}, payloads: [{ isError: true, text: "Do not deliver" }] },
    { meta: {}, payloads: [{ text: "Do not deliver" }], didSendViaMessagingTool: true }
  ])("rejects failed/nonfinal runtime outputs without retaining raw metadata %#", async (response) => {
    const f = await fixture();
    try {
      f.runEmbeddedAgent.mockResolvedValueOnce(response);
      await expect(f.run(f.request)).rejects.toMatchObject({ code: "RUNTIME_UNAVAILABLE", message: "Hosting turn failed (RUNTIME_UNAVAILABLE)" });
    } finally { await f.mock.app.close(); }
  });
  it("requires the pinned runtime version", async () => {
    const f = await fixture();
    try {
      expect(() => createHostingTurnHandler("https://support.example.invalid", "hosting-support", { ...f.runtime, version: "unknown" }, f.fetchMock)).toThrow();
      expect(f.fetchMock).not.toHaveBeenCalled();
    } finally { await f.mock.app.close(); }
  });
});

describe("native gateway-authenticated route", () => {
  it.each(["valid", "malformed-json", "oversized", "wrong-method"])("handles %s without real sockets", async (testCase) => {
    const f = await fixture();
    try {
      const registerHttpRoute = vi.fn<HostingHttpApi["registerHttpRoute"]>();
      registerHostingTurnRoute({ runtime: f.runtime, pluginConfig: { coreBaseUrl: "https://support.example.invalid" }, registerHttpRoute }, f.fetchMock);
      const route = registerHttpRoute.mock.calls[0]![0];
      expect(route.auth).toBe("gateway"); expect(route.match).toBe("exact");
      const body = testCase === "oversized" ? "x".repeat(24_577) : testCase === "malformed-json" ? "{" : JSON.stringify(f.request);
      const request = Object.assign(Readable.from([Buffer.from(body)]), {
        method: testCase === "wrong-method" ? "GET" : "POST", url: "/hosting-support/turn", headers: { "content-type": "application/json" }
      });
      let status = 0; let responseBody = "";
      const response = Object.assign(new EventEmitter(), { destroyed: false, writableEnded: false,
        writeHead(code: number) { status = code; }, end(value: string) { responseBody = value; this.writableEnded = true; } });
      await route.handler(request as unknown as IncomingMessage, response as unknown as ServerResponse);
      expect(status).toBe(testCase === "valid" ? 200 : testCase === "oversized" ? 413 : 400);
      expect(responseBody).not.toContain(f.token);
      if (testCase !== "valid") expect(f.runEmbeddedAgent).not.toHaveBeenCalled();
    } finally { await f.mock.app.close(); }
  });
});
