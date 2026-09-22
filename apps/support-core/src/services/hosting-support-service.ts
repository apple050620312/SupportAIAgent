import type {
  ActorContext,
  CustomerIdentity,
  GameServer,
  HostingService
} from "@openclaw-hosting/contracts";
import {
  IdentityNotLinkedError,
  ServerNotFoundError,
  ServiceNotFoundError,
  ServiceNotOwnedError,
  SupportDomainError,
  UpstreamUnavailableError
} from "../domain/errors.js";
import type {
  CustomerIdentityResolver,
  GameServerProvider,
  HostingServiceProvider
} from "../ports/index.js";

export interface HostingSupportDependencies {
  readonly identityResolver: CustomerIdentityResolver;
  readonly hostingServices: HostingServiceProvider;
  readonly gameServers: GameServerProvider;
}

export class HostingSupportService {
  constructor(private readonly dependencies: HostingSupportDependencies) {}

  async resolveCustomer(actorContext: ActorContext): Promise<CustomerIdentity> {
    const customer = await this.callUpstream("Customer identity provider", () =>
      this.dependencies.identityResolver.resolveActor(actorContext)
    );

    if (customer === null) {
      throw new IdentityNotLinkedError();
    }

    return customer;
  }

  async listMyServices(actorContext: ActorContext): Promise<readonly HostingService[]> {
    const customer = await this.resolveCustomer(actorContext);
    const services = await this.callUpstream("Hosting service provider", () =>
      this.dependencies.hostingServices.listForCustomer(customer, actorContext)
    );

    // Treat a faulty adapter as an authorization failure, never as usable data.
    if (services.some((service) => service.customerRef !== customer.customerRef)) {
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

    if (service.customerRef !== customer.customerRef) {
      throw new ServiceNotOwnedError();
    }

    const server = await this.callUpstream("Game server provider", () =>
      this.dependencies.gameServers.findForOwnedService(service, actorContext)
    );

    if (server === null || server.serviceRef !== service.serviceRef) {
      throw new ServerNotFoundError();
    }

    return server;
  }

  private async callUpstream<T>(provider: string, operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: unknown) {
      if (error instanceof SupportDomainError) {
        throw error;
      }

      throw new UpstreamUnavailableError(provider, { cause: error });
    }
  }
}
