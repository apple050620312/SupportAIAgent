import { describe, expect, it, vi } from "vitest";
import type { HostingService } from "@support-ai-agent/contracts";
import { HostingSupportService } from "../src/services/hosting-support-service.js";

const actor = { actor: { discordUserId: "18446744073709551615" }, correlationId: "synthetic" };
const service: HostingService = { serviceRef: "whmcs-service:1", customerRef: "whmcs:1", displayName: "Synthetic", status: "active", runtimeProvider: "pterodactyl" };
describe("authorization port regressions", () => {
  it.each([
    { services: [{ ...service, customerRef: "whmcs:2" }] }, { services: [service, service] }
  ])("rejects foreign/duplicate owned lists before panel calls %#", async ({ services }) => {
    const panel = vi.fn();
    const core = new HostingSupportService({ identityResolver: { resolveActor: async () => Promise.resolve({ customerRef: "whmcs:1" }) },
      hostingServices: { listForCustomer: async () => Promise.resolve(services), findByReference: vi.fn() },
      gameServers: { findForOwnedService: panel } });
    await expect(core.listMyServers(actor)).rejects.toMatchObject({ code: "SERVICE_NOT_OWNED" });
    expect(panel).not.toHaveBeenCalled();
  });
  it.each(["suspended", "pending", "terminated", "unknown"] as const)("stops panel access for a %s service", async (status) => {
    const panel = vi.fn();
    const core = new HostingSupportService({ identityResolver: { resolveActor: async () => Promise.resolve({ customerRef: "whmcs:1" }) },
      hostingServices: { listForCustomer: vi.fn(), findByReference: async () => Promise.resolve({ ...service, status }) },
      gameServers: { findForOwnedService: panel } });
    await expect(core.getMyServer(actor, service.serviceRef)).rejects.toMatchObject({ code: "SERVER_NOT_FOUND" });
    expect(panel).not.toHaveBeenCalled();
  });
  it("rejects a substituted selector even if ownership matches", async () => {
    const panel = vi.fn();
    const core = new HostingSupportService({ identityResolver: { resolveActor: async () => Promise.resolve({ customerRef: "whmcs:1" }) },
      hostingServices: { listForCustomer: vi.fn(), findByReference: async () => Promise.resolve({ ...service, serviceRef: "whmcs-service:2" }) },
      gameServers: { findForOwnedService: panel } });
    await expect(core.getMyService(actor, service.serviceRef)).rejects.toMatchObject({ code: "SERVICE_NOT_FOUND" });
    await expect(core.getMyServer(actor, service.serviceRef)).rejects.toMatchObject({ code: "SERVICE_NOT_FOUND" });
    expect(panel).not.toHaveBeenCalled();
  });
});
