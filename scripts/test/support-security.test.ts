import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { TicketContextTokens } from "@support-ai-agent/trusted-context";
import { TicketBridge } from "@support-ai-agent/ticket-bridge";
import { createHostingTools, hostingToolFactory } from "@support-ai-agent/openclaw-plugin";
import { createMockSupport, MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

const key = "synthetic-context-signing-key-for-unit-tests";
describe("trusted ticket capsules", () => {
  it("binds the actor/guild/channel and expires after sixty seconds", () => {
    let now = 1000;
    const tokens = new TicketContextTokens(key, () => now);
    const token = tokens.issue(MOCK_SCOPE);
    expect(tokens.verify(token)).toEqual(MOCK_SCOPE);
    now = 1060;
    expect(() => tokens.verify(token)).toThrow("Invalid or expired");
    expect(JSON.stringify(tokens)).not.toContain(key);
  });
  it("rejects tampering and tokens signed by another bot key", () => {
    const tokens = new TicketContextTokens(key);
    const issued = tokens.issue(MOCK_SCOPE);
    const [body, signature] = issued.split(".");
    const otherBody = Buffer.from(JSON.stringify({ scope: MOCK_OTHER_SCOPE })).toString("base64url");
    expect(() => tokens.verify(`${otherBody}.${signature}`)).toThrow();
    expect(() => new TicketContextTokens(`${key}-other`).verify(`${body}.${signature}`)).toThrow();
  });
  it.each([
    { audience: "another-service" }, { issuedAt: 1001 }, { expiresAt: 2000 },
    { clientid: 2 }, { scope: { ...MOCK_SCOPE, discordUserId: "18446744073709551616" } }
  ])("rejects invalid authenticated claims %#", (override) => {
    const claim = { audience: "hosting-support-core", scope: MOCK_SCOPE, issuedAt: 1000, expiresAt: 1060, ...override };
    const encoded = Buffer.from(JSON.stringify(claim)).toString("base64url");
    const signature = createHmac("sha256", key).update(encoded).digest("base64url");
    expect(() => new TicketContextTokens(key, () => 1000).verify(`${encoded}.${signature}`)).toThrow();
  });
});

describe("Core delivery authorization", () => {
  it("rechecks ticket authority before releasing data after awaited provider work", async () => {
    const demo = createMockSupport();
    try {
      const token = await demo.bridge.contextForCustomer(MOCK_SCOPE);
      const originalRead = demo.bridge.read.bind(demo.bridge);
      let reads = 0;
      vi.spyOn(demo.bridge, "read").mockImplementation(async (scope) => {
        reads++;
        if (reads === 2) {
          const snapshot = demo.snapshots.get(scope.channelId)!;
          demo.snapshots.set(scope.channelId, { ...snapshot, state: "HUMAN_ACTIVE", revision: snapshot.revision + 1 });
        }
        return originalRead(scope);
      });
      const response = await demo.app.inject({ url: "/v1/me/services", headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(403);
      expect(response.body).not.toContain("Synthetic service");
    } finally { await demo.app.close(); }
  });
  it.each([undefined, "Bearer model-generated-token", "Basic arbitrary"])("requires trusted context before provider access %#", async (authorization) => {
    const demo = createMockSupport();
    try {
      const response = await demo.app.inject({ url: "/v1/me/services", headers: authorization ? { authorization } : {} });
      expect(response.statusCode).toBe(401);
      expect(demo.providerCalls).toEqual([]);
    } finally { await demo.app.close(); }
  });
  it("rejects an actor mismatch from the authoritative ticket store", async () => {
    const demo = createMockSupport();
    try {
      const scope = { ...MOCK_SCOPE, discordUserId: MOCK_OTHER_SCOPE.discordUserId };
      const token = demo.tokens.issue(scope);
      const response = await demo.app.inject({ url: "/v1/me/services", headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(403);
      expect(demo.providerCalls).toEqual([]);
    } finally { await demo.app.close(); }
  });
  it.each(["HUMAN_ACTIVE", "HUMAN_NEEDED", "CLOSED"] as const)("revokes previously minted context when state is %s", async (state) => {
    const demo = createMockSupport();
    try {
      const token = await demo.bridge.contextForCustomer(MOCK_SCOPE);
      const snapshot = demo.snapshots.get(MOCK_SCOPE.channelId)!;
      demo.snapshots.set(MOCK_SCOPE.channelId, { ...snapshot, state, revision: snapshot.revision + 1 });
      const response = await demo.app.inject({ url: "/v1/me/services", headers: { authorization: `Bearer ${token}` } });
      expect(response.statusCode).toBe(403);
      expect(demo.providerCalls).toEqual([]);
    } finally { await demo.app.close(); }
  });
  it("accepts only the bounded restart route and rejects client identifiers as query parameters", async () => {
    const demo = createMockSupport();
    try {
      const authorization = `Bearer ${await demo.bridge.contextForCustomer(MOCK_SCOPE)}`;
      const query = await demo.app.inject({ url: "/v1/me/services?clientid=2", headers: { authorization } });
      expect(query.statusCode).toBe(400);
      const badMutation = await demo.app.inject({ method: "POST", url: "/v1/me/servers/whmcs-service:1/restart",
        headers: { authorization, "content-type": "application/json" }, payload: JSON.stringify({ clientid: 2 }) });
      expect(badMutation.statusCode).toBe(400);
      const mutation = await demo.app.inject({ method: "POST", url: "/v1/me/servers/whmcs-service:1/restart",
        headers: { authorization, "content-type": "application/json" }, payload: "{}" });
      expect(mutation.statusCode).toBe(200);
      expect(demo.providerCalls.some((call) => call.endsWith("/power"))).toBe(true);
    } finally { await demo.app.close(); }
  });
});

describe("ticket bridge lifecycle", () => {
  it("chunks a long handoff within Discord's limit using stable receipt keys", async () => {
    const demo = createMockSupport();
    try {
      await demo.bridge.handoff(MOCK_SCOPE, {
        summary: "測".repeat(2000), reason: "需".repeat(500),
        attemptedSteps: Array.from({ length: 12 }, () => "步".repeat(300))
      });
      expect(demo.sent.length).toBeGreaterThan(1);
      expect(demo.sent.every((part) => part.text.length <= 1800)).toBe(true);
      const length = demo.sent.length;
      await demo.bridge.handoff(MOCK_SCOPE, { summary: "測".repeat(2000), reason: "需".repeat(500),
        attemptedSteps: Array.from({ length: 12 }, () => "步".repeat(300)) });
      expect(demo.sent).toHaveLength(length);
    } finally { await demo.app.close(); }
  });
  it("keeps independent ticket state and waits/resumes only the customer conversation", async () => {
    const demo = createMockSupport();
    try {
      await demo.bridge.waitForCustomer(MOCK_SCOPE);
      expect(demo.snapshots.get(MOCK_SCOPE.channelId)?.state).toBe("WAITING_CUSTOMER");
      expect(demo.snapshots.get(MOCK_OTHER_SCOPE.channelId)?.state).toBe("AI_ACTIVE");
      await demo.bridge.customerMessage(MOCK_SCOPE);
      expect(demo.snapshots.get(MOCK_SCOPE.channelId)?.state).toBe("AI_ACTIVE");
      await demo.bridge.humanTakeover(MOCK_SCOPE);
      await demo.bridge.customerMessage(MOCK_SCOPE);
      expect(demo.snapshots.get(MOCK_SCOPE.channelId)?.state).toBe("HUMAN_ACTIVE");
      await demo.bridge.close(MOCK_SCOPE);
      await expect(demo.bridge.contextForCustomer(MOCK_SCOPE)).rejects.toThrow();
    } finally { await demo.app.close(); }
  });
  it("retries failed handoff delivery with the same bot-side idempotency key", async () => {
    const demo = createMockSupport();
    try {
      const send = vi.fn().mockRejectedValueOnce(new Error("synthetic send failure")).mockResolvedValue(undefined);
      const bridge = new TicketBridge(demo.store, { send, sendIfCurrent: vi.fn() }, demo.tokens);
      const request = { summary: "Synthetic issue", reason: "Staff needed", attemptedSteps: [] };
      await expect(bridge.handoff(MOCK_SCOPE, request)).rejects.toThrow("Ticket operation unavailable");
      expect(demo.snapshots.get(MOCK_SCOPE.channelId)?.state).toBe("HUMAN_NEEDED");
      await bridge.handoff(MOCK_SCOPE, request);
      expect(send.mock.calls[0]?.[2]).toEqual(send.mock.calls[1]?.[2]);
      expect(send.mock.calls[1]?.[2]).toMatchObject({ allowedMentions: [] });
    } finally { await demo.app.close(); }
  });
  it("deduplicates handoff notifications through the bot receipt contract", async () => {
    const demo = createMockSupport();
    try {
      const request = { summary: "Synthetic issue", reason: "Staff needed", attemptedSteps: [] };
      await demo.bridge.handoff(MOCK_SCOPE, request);
      await demo.bridge.handoff(MOCK_SCOPE, request);
      expect(demo.sent).toHaveLength(1);
    } finally { await demo.app.close(); }
  });
  it("delegates final send to the serialized state-check port", async () => {
    const demo = createMockSupport();
    try {
      const snapshot = (await demo.bridge.read(MOCK_SCOPE))!;
      const sendIfCurrent = vi.fn().mockResolvedValue(false);
      const bridge = new TicketBridge(demo.store, { send: vi.fn(), sendIfCurrent }, demo.tokens);
      expect(await bridge.replyIfCurrent(snapshot, "Pending reply")).toBe(false);
      expect(sendIfCurrent).toHaveBeenCalledWith(snapshot, "Pending reply", { allowedMentions: [] });
    } finally { await demo.app.close(); }
  });
});

describe("thin tool wrapper safety", () => {
  it("does not release data if host authority changes during HTTP work", async () => {
    let current = true;
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(() => {
      current = false;
      return Promise.resolve(new Response('{"linked":true}', { headers: { "content-type": "application/json" } }));
    });
    const tools = createHostingTools("https://support.example.invalid", {
      getTicketToken: async () => Promise.resolve("synthetic"),
      assertCurrent: () => { if (!current) throw new Error("synthetic private authority detail"); }
    }, fetchMock);
    await expect(tools[0]!.execute("synthetic", {})).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });

  it("rejects a successful-looking response carrying excess customer data", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      '{"linked":true,"email":"synthetic@example.invalid"}', { headers: { "content-type": "application/json" } }
    ));
    const tools = createHostingTools("https://support.example.invalid", {
      getTicketToken: async () => Promise.resolve("synthetic"), assertCurrent: () => undefined
    }, fetchMock);
    await expect(tools[0]!.execute("synthetic", {})).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
  });
  it("provides no tools without a host-established trusted context", () => {
    expect(hostingToolFactory("https://support.example.invalid", null, vi.fn())).toBeNull();
  });
  it("redacts raw Core errors and provider credentials", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(
      '{"code":"UPSTREAM_UNAVAILABLE","message":"synthetic-secret customer email"}',
      { status: 503, headers: { "content-type": "application/json" } }
    ));
    const tools = createHostingTools("https://support.example.invalid", {
      getTicketToken: async () => Promise.resolve("synthetic-opaque-capsule"), assertCurrent: () => undefined
    }, fetchMock);
    await expect(tools[0]!.execute("synthetic", {})).rejects.toMatchObject({ message: "Support tool failed (UPSTREAM_UNAVAILABLE)" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects path injection before HTTP", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const tools = createHostingTools("https://support.example.invalid", {
      getTicketToken: async () => Promise.resolve("synthetic"), assertCurrent: () => undefined
    }, fetchMock);
    await expect(tools.find((tool) => tool.name === "get_my_server_status")!.execute("synthetic", { serviceRef: "../../api/admin" }))
      .rejects.toMatchObject({ code: "INVALID_REQUEST" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
