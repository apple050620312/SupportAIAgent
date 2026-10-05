import { describe, expect, it, vi } from "vitest";
import plugin, { registerHostingPlugin, type OpenClawHostingApi, type OpenClawHostingContext } from "@openclaw-hosting/openclaw-plugin/native";
import { createMockSupport, MOCK_SCOPE } from "../lib/mock-support.js";

function registrations(fetchMock: typeof fetch) {
  const registerTool = vi.fn<OpenClawHostingApi["registerTool"]>();
  registerHostingPlugin({ pluginConfig: { coreBaseUrl: "https://support.example.invalid" }, registerTool }, fetchMock);
  return registerTool.mock.calls;
}
describe("OpenClaw v2026.9.8 native entry", () => {
  it("ships native optional version-two factories", () => {
    expect(plugin.id).toBe("hosting-support");
    const factories = registrations(vi.fn());
    expect(factories).toHaveLength(13);
    expect(factories.every(([factory, options]) => factory.contextVersion === 2 && options.optional)).toBe(true);
    expect(factories.map(([, options]) => options.names[0])).toContain("handoff_to_staff");
  });
  it.each([undefined, {}, { "hosting-support": { discordUserId: MOCK_SCOPE.discordUserId } },
    { "hosting-support": { ticketToken: "model-generated" } }])("provides no tools without out-of-band capsule %#", (toolBindings) => {
    const context = { ...(toolBindings ? { toolBindings } : {}), assertInvocationCurrent: () => undefined };
    expect(registrations(vi.fn())[0]![0].create(context)).toBeNull();
  });
  it("uses real Core verification of the capsule and avoids reserved top-level status", async () => {
    const fixture = createMockSupport();
    try {
      const token = await fixture.bridge.contextForCustomer(MOCK_SCOPE);
      const fetchMock = vi.fn<typeof fetch>().mockImplementation(async (_url, init) => {
        const response = await fixture.app.inject({ url: "/v1/me/servers/whmcs-service:1/status",
          headers: Object.fromEntries(new Headers(init?.headers)) });
        return new Response(response.body, { status: response.statusCode, headers: { "content-type": "application/json" } });
      });
      const guard = vi.fn();
      const factory = registrations(fetchMock).find(([, options]) => options.names[0] === "get_my_server_status")![0];
      const tool = factory.create({ toolBindings: { "hosting-support": { ticketToken: token } }, assertInvocationCurrent: guard })!;
      const result = await tool.execute("synthetic-call", { serviceRef: "whmcs-service:1" });
      expect(result.details).toEqual({ data: { serviceRef: "whmcs-service:1", status: "running" } });
      expect(result.details).not.toHaveProperty("status");
      expect(guard).toHaveBeenCalled();
      expect(tool.executionMode).toBe("sequential");
      expect(JSON.stringify(result)).not.toContain(token);
      expect(JSON.stringify(tool.outputSchema)).not.toContain(token);
    } finally { await fixture.app.close(); }
  });
  it("host revocation prevents any Core request", async () => {
    const fixture = createMockSupport();
    try {
      const token = await fixture.bridge.contextForCustomer(MOCK_SCOPE);
      const fetchMock = vi.fn<typeof fetch>();
      const context: OpenClawHostingContext = {
        toolBindings: { "hosting-support": { ticketToken: token } },
        assertInvocationCurrent: () => { throw new Error("retired synthetic invocation"); }
      };
      const tool = registrations(fetchMock)[0]![0].create(context)!;
      await expect(tool.execute("synthetic", {})).rejects.toMatchObject({ code: "TICKET_ACCESS_DENIED" });
      expect(fetchMock).not.toHaveBeenCalled();
    } finally { await fixture.app.close(); }
  });
});
