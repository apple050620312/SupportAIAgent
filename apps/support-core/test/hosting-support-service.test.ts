import type {
  ActorContext,
  CustomerIdentity,
  GameServer,
  HostingService
} from "@openclaw-hosting/contracts";
import { describe, expect, it } from "vitest";
import {
  IdentityNotLinkedError,
  ServerNotFoundError,
  ServiceNotFoundError,
  ServiceNotOwnedError,
  UpstreamUnavailableError
} from "../src/domain/errors.js";
import { HostingSupportService } from "../src/services/hosting-support-service.js";
import {
  FakeCustomerIdentityResolver,
  FakeGameServerProvider,
  FakeHostingServiceProvider
} from "./fakes.js";

const actor: ActorContext = {
  actor: { discordUserId: "discord-user-1", displayName: "Customer" },
  correlationId: "request-1"
};

const customer: CustomerIdentity = {
  customerRef: "customer-internal-1",
  displayName: "Customer"
};

const ownedService: HostingService = {
  serviceRef: "service-1",
  customerRef: customer.customerRef,
  displayName: "Survival Server",
  status: "active"
};

const anotherCustomersService: HostingService = {
  serviceRef: "service-2",
  customerRef: "customer-internal-2",
  displayName: "Other Server",
  status: "active"
};

const ownedServer: GameServer = {
  serverRef: "server-internal-1",
  serviceRef: ownedService.serviceRef,
  displayName: "Survival Server",
  status: "running",
  resources: { memoryBytes: 1024, cpuPercent: 12, diskBytes: 4096 }
};

function createService(options?: {
  identityFailure?: Error;
  hostingFailure?: Error;
}) {
  const identityResolver = new FakeCustomerIdentityResolver(
    new Map([[actor.actor.discordUserId, customer]]),
    options?.identityFailure
  );
  const hostingServices = new FakeHostingServiceProvider(
    [ownedService, anotherCustomersService],
    options?.hostingFailure
  );
  const gameServers = new FakeGameServerProvider([ownedServer]);

  return {
    subject: new HostingSupportService({ identityResolver, hostingServices, gameServers }),
    hostingServices,
    gameServers
  };
}

describe("HostingSupportService", () => {
  it("resolves a customer through the injected identity resolver", async () => {
    const { subject } = createService();

    await expect(subject.resolveCustomer(actor)).resolves.toEqual(customer);
  });

  it("fails when the Discord actor has no customer link", async () => {
    const subject = new HostingSupportService({
      identityResolver: new FakeCustomerIdentityResolver(new Map()),
      hostingServices: new FakeHostingServiceProvider([]),
      gameServers: new FakeGameServerProvider([])
    });

    await expect(subject.resolveCustomer(actor)).rejects.toBeInstanceOf(IdentityNotLinkedError);
  });

  it("lists services only after resolving and scoping to the customer", async () => {
    const { subject, hostingServices } = createService();

    await expect(subject.listMyServices(actor)).resolves.toEqual([ownedService]);
    expect(hostingServices.requestedCustomerRefs).toEqual([customer.customerRef]);
  });

  it("looks up a game server only through an owned hosting service", async () => {
    const { subject, gameServers } = createService();

    await expect(subject.getMyServer(actor, ownedService.serviceRef)).resolves.toEqual(ownedServer);
    expect(gameServers.requestedServiceRefs).toEqual([ownedService.serviceRef]);
  });

  it("fails closed for an unknown service reference", async () => {
    const { subject, gameServers } = createService();

    await expect(subject.getMyServer(actor, "missing-service")).rejects.toBeInstanceOf(
      ServiceNotFoundError
    );
    expect(gameServers.requestedServiceRefs).toEqual([]);
  });

  it("fails closed before server lookup for another customer's service", async () => {
    const { subject, gameServers } = createService();

    await expect(
      subject.getMyServer(actor, anotherCustomersService.serviceRef)
    ).rejects.toBeInstanceOf(ServiceNotOwnedError);
    expect(gameServers.requestedServiceRefs).toEqual([]);
  });

  it("fails closed when the server adapter returns a mismatched service", async () => {
    const subject = new HostingSupportService({
      identityResolver: new FakeCustomerIdentityResolver(
        new Map([[actor.actor.discordUserId, customer]])
      ),
      hostingServices: new FakeHostingServiceProvider([ownedService]),
      gameServers: {
        findForOwnedService: () =>
          Promise.resolve({ ...ownedServer, serviceRef: "different-service" })
      }
    });

    await expect(subject.getMyServer(actor, ownedService.serviceRef)).rejects.toBeInstanceOf(
      ServerNotFoundError
    );
  });

  it("maps upstream failures to an explicit sanitized domain error", async () => {
    const upstreamError = new Error("raw provider response containing sensitive detail");
    const { subject } = createService({ hostingFailure: upstreamError });

    const failure = await subject.listMyServices(actor).catch((error: unknown) => error);

    expect(failure).toBeInstanceOf(UpstreamUnavailableError);
    expect((failure as UpstreamUnavailableError).code).toBe("UPSTREAM_UNAVAILABLE");
    expect((failure as Error).message).not.toContain("sensitive detail");
  });
});
