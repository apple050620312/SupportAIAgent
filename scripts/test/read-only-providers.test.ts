import { describe, expect, it, vi } from "vitest";
import { WhmcsCustomerIdentityResolver, VerifiedWhmcsCustomerResolver, WhmcsHostingServiceProvider } from "@openclaw-hosting/whmcs";
import { PterodactylGameServerProvider } from "@openclaw-hosting/pterodactyl";
import type { ActorContext, HostingService } from "@openclaw-hosting/contracts";
import { HostingSupportService } from "../../apps/support-core/dist/src/services/hosting-support-service.js";

const actor: ActorContext = { actor: { discordUserId: "18446744073709551615" }, correlationId: "synthetic" };
const config = { baseUrl: "https://whmcs.example.invalid/", apiIdentifier: "synthetic-identifier", apiSecret: "synthetic-secret" };
const pteroConfig = { baseUrl: "https://panel.example.invalid/", applicationApiKey: "synthetic-application-key", clientApiKey: "synthetic-client-key", externalIdStrategy: "whmcs-service-id" as const };
const customer = { customerRef: "whmcs:1" };
const candidates = { resolveActor: vi.fn(async () => Promise.resolve(customer)) };
const owned: HostingService = { serviceRef: "whmcs-service:1", customerRef: "whmcs:1", displayName: "Synthetic service", status: "active", runtimeProvider: "pterodactyl" };
const uuid = "00000000-0000-4000-8000-000000000001";
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
}
function product(id = 1, owner = 1) {
  return { id, clientid: owner, name: "Synthetic service", status: "Active", servername: "Pterodactyl", password: "synthetic-private-password", domain: "private.example.invalid" };
}
function products(rows: unknown[], total = rows.length, start = 0) {
  return { result: "success", clientid: 1, totalresults: total, startnumber: start, numreturned: rows.length, products: { product: rows } };
}
function mapping() {
  return { object: "server", attributes: { id: 1, external_id: "1", uuid, name: "Synthetic server", suspended: false, status: null,
    limits: { memory: 1024, disk: 2048 }, container: { environment: { PASSWORD: "synthetic-secret" } } } };
}
function stats(state = "running") {
  return { object: "stats", attributes: { current_state: state, is_suspended: false, resources: { memory_bytes: 1024, cpu_absolute: 120.5, disk_bytes: 2048 } } };
}

describe("verified WHMCS client candidate", () => {
  it("checks the exact client and Active policy, discarding full customer records", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ result: "success", client: {
      id: 1, client_id: "1", userid: 1, owner_user_id: 99, status: "Active", email: "synthetic@example.invalid"
    } }));
    const result = await new VerifiedWhmcsCustomerResolver(candidates, config, fetchMock).resolveActor(actor);
    expect(result).toEqual(customer);
    const body = fetchMock.mock.calls[0]![1]?.body as URLSearchParams;
    expect(body.get("action")).toBe("GetClientsDetails");
    expect(body.get("clientid")).toBe("1");
    expect(body.has("stats")).toBe(false);
    expect(JSON.stringify(result)).not.toContain("email");
  });
  it.each(["Closed", "Inactive", "Unknown", undefined])("rejects non-Active client state %s", async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ result: "success", client: { id: 1, status } }));
    await expect(new VerifiedWhmcsCustomerResolver(candidates, config, fetchMock).resolveActor(actor)).rejects.toThrow();
  });
  it.each([
    { result: "success", client: { id: 2, status: "Active" } },
    { result: "success", client: { id: 1, userid: 2, status: "Active" } },
    { result: "error", message: "Client Not Found" }, { result: "success" }
  ])("rejects stale, missing or conflicting customer responses %#", async (value) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(value));
    await expect(new VerifiedWhmcsCustomerResolver(candidates, config, fetchMock).resolveActor(actor)).rejects.toThrow();
  });
  it("does not call client API for a verified null candidate", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    const resolver = new VerifiedWhmcsCustomerResolver({ resolveActor: async () => Promise.resolve(null) }, config, fetchMock);
    expect(await resolver.resolveActor(actor)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("WHMCS owned service provider", () => {
  it("projects only allowed fields and always scopes clientid", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(products([product()])));
    const provider = new WhmcsHostingServiceProvider(config, candidates, fetchMock);
    expect(await provider.listForCustomer(customer, actor)).toEqual([owned]);
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://whmcs.example.invalid/includes/api.php");
    const body = init?.body as URLSearchParams;
    expect(body.get("clientid")).toBe("1");
    expect(body.get("limitnum")).toBe("50");
    expect(body.get("identifier")).toBe(config.apiIdentifier);
    expect(init?.redirect).toBe("error");
    expect(JSON.stringify(provider)).not.toContain(config.apiSecret);
  });
  it("reads every page of the resolved customer's services", async () => {
    const first = Array.from({ length: 50 }, (_, index) => product(index + 1));
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json(products(first, 51)))
      .mockResolvedValueOnce(json(products([product(51)], 51, 50)));
    const result = await new WhmcsHostingServiceProvider(config, candidates, fetchMock).listForCustomer(customer, actor);
    expect(result).toHaveLength(51);
    expect((fetchMock.mock.calls[1]![1]?.body as URLSearchParams).get("limitstart")).toBe("50");
  });
  it.each([
    products([product(1, 2)]), products([product(), product()]), products([], 1),
    { ...products([product()]), clientid: 2 }, { ...products([product()]), numreturned: 2 },
    { ...products([product()]), totalresults: 1001 }, { ...products([product()]), startnumber: 1 },
    { result: "error", message: "authentication failed" }
  ])("fails closed for ownership, duplicate and inconsistent pagination %#", async (value) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(value));
    await expect(new WhmcsHostingServiceProvider(config, candidates, fetchMock).listForCustomer(customer, actor)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("returns null for a foreign selector without querying that customer's records", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json(products([product()])));
    const provider = new WhmcsHostingServiceProvider(config, candidates, fetchMock);
    expect(await provider.findByReference("whmcs-service:2", actor)).toBeNull();
    expect((fetchMock.mock.calls[0]![1]?.body as URLSearchParams).get("clientid")).toBe("1");
  });
  it("rejects URL-shaped selectors before HTTP", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    await expect(new WhmcsHostingServiceProvider(config, candidates, fetchMock).findByReference("../../2", actor)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts an explicit empty owned list and preserves unknown status", async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json(products([])))
      .mockResolvedValueOnce(json(products([{ ...product(), status: "NewStatus", servername: "DirectAdmin" }])));
    const provider = new WhmcsHostingServiceProvider(config, candidates, fetchMock);
    expect(await provider.listForCustomer(customer, actor)).toEqual([]);
    expect(await provider.listForCustomer(customer, actor)).toEqual([{ ...owned, runtimeProvider: undefined, status: "unknown" }]);
  });
});

describe("Pterodactyl 1.15.1 read-only provider", () => {
  it("maps a proven service external ID, then reads resources using the returned UUID", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(json(mapping())).mockResolvedValueOnce(json(stats()));
    const result = await new PterodactylGameServerProvider(pteroConfig, fetchMock).findForOwnedService(owned, actor);
    expect(result).toMatchObject({ serviceRef: owned.serviceRef, status: "running", resources: {
      memoryBytes: 1024, memoryLimitBytes: 1024 * 1_048_576, cpuPercent: 120.5, diskLimitBytes: 2048 * 1_048_576
    } });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "https://panel.example.invalid/api/application/servers/external/1",
      `https://panel.example.invalid/api/client/servers/${uuid}/resources`
    ]);
    const [application, client] = fetchMock.mock.calls;
    expect(application?.[1]?.headers).toMatchObject({ authorization: `Bearer ${pteroConfig.applicationApiKey}` });
    expect(client?.[1]?.headers).toMatchObject({ authorization: `Bearer ${pteroConfig.clientApiKey}` });
    expect(fetchMock.mock.calls.every(([, init]) => init?.method === "GET" && init.redirect === "error")).toBe(true);
    expect(JSON.stringify(result)).not.toContain("PASSWORD");
  });
  it.each(["suspended", "pending", "terminated", "unknown"] as const)("does not query %s services", async (status) => {
    const fetchMock = vi.fn<typeof fetch>();
    expect(await new PterodactylGameServerProvider(pteroConfig, fetchMock).findForOwnedService({ ...owned, status }, actor)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([401, 403, 429, 500])("does not interpret HTTP %s as missing mapping", async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ errors: [] }, status));
    await expect(new PterodactylGameServerProvider(pteroConfig, fetchMock).findForOwnedService(owned, actor)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("returns null for an external lookup 404, but fails on a resource 404", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(json({}, 404)).mockResolvedValueOnce(json(mapping())).mockResolvedValueOnce(json({}, 404));
    const provider = new PterodactylGameServerProvider(pteroConfig, fetchMock);
    expect(await provider.findForOwnedService(owned, actor)).toBeNull();
    await expect(provider.findForOwnedService(owned, actor)).rejects.toThrow();
  });
  it.each([
    { ...mapping().attributes, external_id: "2" }, { ...mapping().attributes, suspended: true },
    { ...mapping().attributes, uuid: "../../another" }, { ...mapping().attributes, status: "installing" }
  ])("rejects wrong mapping or unacceptable server state before client read %#", async (attributes) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(json({ object: "server", attributes }));
    await expect(new PterodactylGameServerProvider(pteroConfig, fetchMock).findForOwnedService(owned, actor)).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(["future-state", "constructor", "toString"])("preserves unknown runtime state %s and treats zero limits as unlimited", async (state) => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(json({ ...mapping(), attributes: { ...mapping().attributes, limits: { memory: 0, disk: 0 } } }))
      .mockResolvedValueOnce(json(stats(state)));
    const result = await new PterodactylGameServerProvider(pteroConfig, fetchMock).findForOwnedService(owned, actor);
    expect(result?.status).toBe("unknown");
    expect(result?.resources).not.toHaveProperty("memoryLimitBytes");
  });
});

describe("end-to-end mocked identity to owned server", () => {
  it("composes ports and never exposes raw provider data", async () => {
    const whmcs = vi.fn<typeof fetch>().mockImplementation((_url, init) => {
      const body = init?.body as URLSearchParams;
      switch (body.get("action")) {
        case "GetClientID": return Promise.resolve(json({ result: "success", clientid: 1 }));
        case "GetClientsDetails": return Promise.resolve(json({ result: "success", client: { id: 1, status: "Active" } }));
        case "GetClientsProducts": return Promise.resolve(json(products([product()])));
        default: throw new Error("Unapproved action");
      }
    });
    const identities = new VerifiedWhmcsCustomerResolver(new WhmcsCustomerIdentityResolver(config, whmcs), config, whmcs);
    const ptero = vi.fn<typeof fetch>().mockResolvedValueOnce(json(mapping())).mockResolvedValueOnce(json(stats()));
    const core = new HostingSupportService({ identityResolver: identities,
      hostingServices: new WhmcsHostingServiceProvider(config, identities, whmcs),
      gameServers: new PterodactylGameServerProvider(pteroConfig, ptero) });
    expect(await core.getMyServer(actor, "whmcs-service:1")).toMatchObject({ status: "running" });
    const actions = whmcs.mock.calls.map(([, init]) => (init?.body as URLSearchParams).get("action"));
    expect(actions).toEqual(["GetClientID", "GetClientsDetails", "GetClientID", "GetClientsDetails", "GetClientsProducts"]);
  });
});
