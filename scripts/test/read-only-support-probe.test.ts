import { describe, expect, it, vi } from "vitest";
import { probeReadOnlySupport } from "../lib/read-only-support-probe.js";

function environment(): Record<string, string> {
  return {
    SUPPORT_PROBE_ACK: "I_HAVE_AUTHORIZATION", GETCLIENTID_REVIEW_ACK: "I_HAVE_REVIEWED_IDENTITY_CONTRACT",
    PTERODACTYL_EXTERNAL_ID_ACK: "WHMCS_SERVICE_ID", WHMCS_BASE_URL: "https://whmcs.example.invalid/",
    WHMCS_API_IDENTIFIER: "synthetic-identifier", WHMCS_API_SECRET: "synthetic-secret",
    PTERODACTYL_BASE_URL: "https://panel.example.invalid/", PTERODACTYL_APPLICATION_API_KEY: "synthetic-app-key",
    PTERODACTYL_CLIENT_API_KEY: "synthetic-client-key", TEST_LINKED_DISCORD_ID: "18446744073709551615",
    TEST_OWNED_SERVICE_ID: "1", TEST_OTHER_CUSTOMER_SERVICE_ID: "2"
  };
}
function json(body: unknown) { return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }); }
describe("manual read-only support probe", () => {
  it.each(["SUPPORT_PROBE_ACK", "GETCLIENTID_REVIEW_ACK", "PTERODACTYL_EXTERNAL_ID_ACK",
    "WHMCS_API_SECRET", "PTERODACTYL_CLIENT_API_KEY"])("requires %s before any request", async (name) => {
    const env = environment(); delete env[name];
    const fetchMock = vi.fn<typeof fetch>();
    await expect(probeReadOnlySupport(env, fetchMock)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("requires every target to be HTTPS before making WHMCS requests", async () => {
    const env = { ...environment(), PTERODACTYL_BASE_URL: "http://remote.example.invalid" };
    const fetchMock = vi.fn<typeof fetch>();
    await expect(probeReadOnlySupport(env, fetchMock)).rejects.toThrow("configuration");
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("stops on identity failure without treating it as not linked", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ result: "error", message: "synthetic-secret" }));
    expect(await probeReadOnlySupport(environment(), fetchMock)).toEqual([
      { stage: "customer", outcome: "failed", code: "UPSTREAM_UNAVAILABLE" }
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("runs the fixed owned-service flow and rejects a known foreign fixture", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation((url, init) => {
      const path = new URL(typeof url === "string" ? url : url instanceof URL ? url.href : url.url).pathname;
      if (path === "/includes/api.php") {
        const body = init?.body as URLSearchParams;
        switch (body.get("action")) {
          case "GetClientID": return Promise.resolve(json({ result: "success", clientid: 1 }));
          case "GetClientsDetails": return Promise.resolve(json({ result: "success", client: { id: 1, status: "Active" } }));
          case "GetClientsProducts": return Promise.resolve(json({ result: "success", clientid: 1, totalresults: 1, startnumber: 0,
            numreturned: 1, products: { product: [{ id: 1, clientid: 1, name: "Synthetic", status: "Active", servername: "Pterodactyl" }] } }));
          default: throw new Error("Unapproved action");
        }
      }
      if (path === "/api/application/servers/external/1") return Promise.resolve(json({ object: "server", attributes: {
        id: 1, external_id: "1", uuid: "00000000-0000-4000-8000-000000000001", name: "Synthetic", suspended: false,
        status: null, limits: { memory: 0, disk: 0 }
      } }));
      if (path === "/api/client/servers/00000000-0000-4000-8000-000000000001/resources") return Promise.resolve(json({ object: "stats", attributes: {
        current_state: "running", is_suspended: false, resources: { memory_bytes: 0, disk_bytes: 0, cpu_absolute: 0 }
      } }));
      throw new Error("Unapproved path");
    });
    const results = await probeReadOnlySupport(environment(), fetchMock);
    expect(results).toHaveLength(4);
    expect(results.every((row) => row.outcome === "success")).toBe(true);
    expect(results[3]?.code).toBe("FOREIGN_SERVICE_DENIED");
    const output = JSON.stringify(results);
    for (const sensitive of ["synthetic-secret", "synthetic-identifier", "synthetic-app-key", "synthetic-client-key",
      "18446744073709551615", "00000000-0000-4000-8000-000000000001", "clientid", "serviceRef"]) {
      expect(output).not.toContain(sensitive);
    }
    expect(fetchMock.mock.calls.filter(([url]) => typeof url === "string" && url.includes("/api/application/"))).toHaveLength(1);
  });
});
