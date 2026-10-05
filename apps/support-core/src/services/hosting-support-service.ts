import {
  CustomerIdentitySchema,
  HostingServiceSchema,
  GameServerSchema,
  type ActorContext,
  type CustomerIdentity,
  type GameServer,
  type HostingService
} from "@openclaw-hosting/contracts";
import { Value } from "@sinclair/typebox/value";
import {
  IdentityNotLinkedError,
  ServerNotFoundError,
  ServiceNotFoundError,
  ServiceNotOwnedError,
  SupportDomainError,
  MutationNotAllowedError,
  MutationRateLimitedError,
  UpstreamUnavailableError
} from "../domain/errors.js";
import type {
  CustomerIdentityResolver,
  GameServerProvider,
  HostingServiceProvider,
  GameServerMutationProvider
} from "../ports/index.js";

export interface HostingSupportDependencies {
  readonly identityResolver: CustomerIdentityResolver;
  readonly hostingServices: HostingServiceProvider;
  readonly gameServers: GameServerProvider;
  readonly gameServerMutations?: GameServerMutationProvider;
}

export class HostingSupportService {
  #restartAt = new Map<string, number>();
  constructor(private readonly dependencies: HostingSupportDependencies) {}

  async resolveCustomer(actorContext: ActorContext): Promise<CustomerIdentity> {
    const customer = await this.callUpstream("Customer identity provider", () =>
      this.dependencies.identityResolver.resolveActor(actorContext)
    );

    if (customer === null) {
      throw new IdentityNotLinkedError();
    }

    if (!Value.Check(CustomerIdentitySchema, customer)) throw new UpstreamUnavailableError("Customer identity provider");

    return customer;
  }

  async listMyServices(actorContext: ActorContext): Promise<readonly HostingService[]> {
    const customer = await this.resolveCustomer(actorContext);
    const services = await this.callUpstream("Hosting service provider", () =>
      this.dependencies.hostingServices.listForCustomer(customer, actorContext)
    );

    // Treat a faulty adapter as an authorization failure, never as usable data.
    const rawServices: unknown = services;
    if (!Array.isArray(rawServices) || rawServices.some((service: unknown) => !Value.Check(HostingServiceSchema, service))) {
      throw new UpstreamUnavailableError("Hosting service provider");
    }
    if (services.some((service) => service.customerRef !== customer.customerRef) ||
        new Set(services.map((service) => service.serviceRef)).size !== services.length) {
      throw new ServiceNotOwnedError();
    }

    return services;
  }

  async getMyServer(
    actorContext: ActorContext,
    serviceRef: string
  ): Promise<GameServer> {
    const customer = await this.resolveCustomer(actorContext);
    const service = await this.callUpstream("Hosting service provider", () =>
      this.dependencies.hostingServices.findByReference(serviceRef, actorContext)
    );

    if (service === null) {
      throw new ServiceNotFoundError();
    }

    if (!Value.Check(HostingServiceSchema, service)) throw new UpstreamUnavailableError("Hosting service provider");
    if (service.serviceRef !== serviceRef) throw new ServiceNotFoundError();

    if (service.customerRef !== customer.customerRef) {
      throw new ServiceNotOwnedError();
    }

    if (service.status !== "active") throw new ServerNotFoundError();

    const server = await this.callUpstream("Game server provider", () =>
      this.dependencies.gameServers.findForOwnedService(service, actorContext)
    );

    if (server === null || server.serviceRef !== service.serviceRef) {
      throw new ServerNotFoundError();
    }

    if (!Value.Check(GameServerSchema, server)) throw new UpstreamUnavailableError("Game server provider");

    return server;
  }

  async getMyService(actorContext: ActorContext, serviceRef: string): Promise<HostingService> {
    const customer = await this.resolveCustomer(actorContext);
    const service = await this.callUpstream("Hosting service provider", () =>
      this.dependencies.hostingServices.findByReference(serviceRef, actorContext)
    );
    if (service === null) throw new ServiceNotFoundError();
    if (!Value.Check(HostingServiceSchema, service)) throw new UpstreamUnavailableError("Hosting service provider");
    if (service.serviceRef !== serviceRef) throw new ServiceNotFoundError();
    if (service.customerRef !== customer.customerRef) throw new ServiceNotOwnedError();
    return service;
  }

  async listMyServers(actorContext: ActorContext): Promise<readonly GameServer[]> {
    const services = await this.listMyServices(actorContext);
    const servers: GameServer[] = [];
    const seen = new Set<string>();
    for (const service of services) {
      if (service.runtimeProvider !== "pterodactyl" || service.status !== "active") continue;
      const server = await this.callUpstream("Game server provider", () =>
        this.dependencies.gameServers.findForOwnedService(service, actorContext)
      );
      if (server === null) continue;
      if (!Value.Check(GameServerSchema, server)) throw new UpstreamUnavailableError("Game server provider");
      if (server.serviceRef !== service.serviceRef || seen.has(server.serverRef)) throw new ServerNotFoundError();
      seen.add(server.serverRef);
      servers.push(server);
    }
    return servers;
  }

  /** Low-risk, reversible remediation. Ownership and active state are checked immediately before execution. */
  async restartMyServer(actorContext: ActorContext, serviceRef: string): Promise<void> {
    if (!this.dependencies.gameServerMutations) throw new MutationNotAllowedError();
    const server = await this.getMyServer(actorContext, serviceRef);
    if (!["running", "starting", "stopping"].includes(server.status)) throw new MutationNotAllowedError();
    const key = `${actorContext.actor.discordUserId}:${serviceRef}`;
    const now = Date.now();
    const previous = this.#restartAt.get(key) ?? 0;
    if (now - previous < 120_000) throw new MutationRateLimitedError();
    // Reserve the cooldown before the provider call. A timeout or failed
    // readback may leave the provider mutation uncertain, so never retry it
    // immediately from the same actor/service pair.
    this.#restartAt.set(key, now);
    await this.callUpstream("Game server mutation provider", () =>
      this.dependencies.gameServerMutations!.restart(server, actorContext)
    );
    // Read back through the same ownership path before reporting the request as
    // accepted. This does not claim the incident is fixed; it only confirms that
    // the target is still resolvable and the provider returned a known status.
    const verified = await this.getMyServer(actorContext, serviceRef);
    if (!Value.Check(GameServerSchema, verified) || verified.status === "unknown") {
      throw new UpstreamUnavailableError("Game server mutation verification");
    }
  }

  private async callUpstream<T>(provider: string, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof SupportDomainError) {
        throw error;
      }

      // An arbitrary port failure may contain raw credentials/customer information.
      throw new UpstreamUnavailableError(provider);
    }
  }
}
