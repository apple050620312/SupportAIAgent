import type {
  ActorContext,
  CustomerIdentity,
  GameServer,
  HostingService
} from "@support-ai-agent/contracts";
import type {
  CustomerIdentityResolver,
  GameServerProvider,
  HostingServiceProvider
} from "../src/ports/index.js";

export class FakeCustomerIdentityResolver implements CustomerIdentityResolver {
  constructor(
    private readonly customersByDiscordId: ReadonlyMap<string, CustomerIdentity>,
    private readonly failure?: Error
  ) {}

  resolveActor(actorContext: ActorContext): Promise<CustomerIdentity | null> {
    if (this.failure !== undefined) throw this.failure;
    return Promise.resolve(
      this.customersByDiscordId.get(actorContext.actor.discordUserId) ?? null
    );
  }
}

export class FakeHostingServiceProvider implements HostingServiceProvider {
  readonly requestedCustomerRefs: string[] = [];

  constructor(
    private readonly services: readonly HostingService[],
    private readonly failure?: Error
  ) {}

  listForCustomer(customer: CustomerIdentity): Promise<readonly HostingService[]> {
    if (this.failure !== undefined) throw this.failure;
    this.requestedCustomerRefs.push(customer.customerRef);
    return Promise.resolve(
      this.services.filter((service) => service.customerRef === customer.customerRef)
    );
  }

  findByReference(serviceRef: string): Promise<HostingService | null> {
    if (this.failure !== undefined) throw this.failure;
    return Promise.resolve(
      this.services.find((service) => service.serviceRef === serviceRef) ?? null
    );
  }
}

export class FakeGameServerProvider implements GameServerProvider {
  readonly requestedServiceRefs: string[] = [];

  constructor(
    private readonly servers: readonly GameServer[],
    private readonly failure?: Error
  ) {}

  findForOwnedService(service: HostingService): Promise<GameServer | null> {
    if (this.failure !== undefined) throw this.failure;
    this.requestedServiceRefs.push(service.serviceRef);
    return Promise.resolve(
      this.servers.find((server) => server.serviceRef === service.serviceRef) ?? null
    );
  }
}
