import { describe, expect, it } from "vitest";
import { createMockSupport, MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

describe("offline tool to Core to provider flow", () => {
  it("executes the read-only tools and low-risk restart with minimal output", async () => {
    const demo = createMockSupport();
    try {
      for (const tool of demo.toolsFor(MOCK_SCOPE).filter((candidate) => !["handoff_to_staff", "propose_mutation", "execute_approved_mutation"].includes(candidate.name))) {
        const parameters = ["get_service_details", "get_my_server_status", "get_my_server_resources", "restart_my_server", "get_my_startup_config"].includes(tool.name)
          ? { serviceRef: "whmcs-service:1" } : tool.name === "list_my_files" ? { serviceRef: "whmcs-service:1", path: "/" }
            : tool.name === "read_my_file" ? { serviceRef: "whmcs-service:1", path: "/config.yml" } : {};
        const result = await tool.execute("synthetic", parameters);
        const output = JSON.stringify(result);
        expect(output).not.toContain("customerRef");
        expect(output).not.toContain("serverRef");
        expect(output).not.toContain("00000000-0000-4000-8000-000000000001");
        expect(output).not.toContain("synthetic-secret");
      }
      expect(demo.providerCalls).toContain("GetClientsDetails");
      expect(demo.providerCalls.some((call) => call.endsWith("/power"))).toBe(true);
    } finally { await demo.app.close(); }
  });
  it("cannot select another customer's service or inject a customer/actor ID", async () => {
    const demo = createMockSupport();
    try {
      const tool = demo.toolsFor(MOCK_SCOPE).find((candidate) => candidate.name === "get_my_server_status")!;
      await expect(tool.execute("synthetic", { serviceRef: "whmcs-service:2" })).rejects.toMatchObject({ code: "SERVICE_NOT_FOUND" });
      expect(demo.providerCalls.some((call) => call.startsWith("/api/"))).toBe(false);
      for (const extra of [{ clientid: 2 }, { discordUserId: MOCK_OTHER_SCOPE.discordUserId }, { serverUuid: "arbitrary" }]) {
        await expect(tool.execute("synthetic", { serviceRef: "whmcs-service:1", ...extra })).rejects.toMatchObject({ code: "INVALID_REQUEST" });
      }
      const other = await demo.toolsFor(MOCK_OTHER_SCOPE).find((candidate) => candidate.name === "list_my_services")!.execute("synthetic", {});
      expect(other.details).toMatchObject([{ serviceRef: "whmcs-service:2" }]);
    } finally { await demo.app.close(); }
  });
  it("creates a handoff and prevents subsequent proactive tools/replies", async () => {
    const demo = createMockSupport();
    try {
      const tools = demo.toolsFor(MOCK_SCOPE);
      const snapshot = await demo.bridge.read(MOCK_SCOPE);
      expect(snapshot).not.toBeNull();
      await tools.find((tool) => tool.name === "handoff_to_staff")!.execute("synthetic", {
        summary: "Synthetic issue", reason: "Needs staff inspection", attemptedSteps: ["Read server status"]
      });
      expect(demo.snapshots.get(MOCK_SCOPE.channelId)?.state).toBe("HUMAN_NEEDED");
      expect(demo.sent).toHaveLength(1);
      expect(demo.sent[0]?.text).toContain("尚未由人工驗證");
      await demo.bridge.humanTakeover(MOCK_SCOPE);
      expect(await demo.bridge.replyIfCurrent(snapshot!, "Must not send")).toBe(false);
      await expect(tools.find((tool) => tool.name === "list_my_services")!.execute("synthetic", {})).rejects.toMatchObject({ code: "TICKET_ACCESS_DENIED" });
    } finally { await demo.app.close(); }
  });
});
