import {
  OwnInvoiceSchema, RedactedServerLogsSchema,
  CustomerIdentitySchema,
  HostingServiceSchema,
  GameServerSchema,
  MutationOperationSchema,
  type ActorContext,
  type CustomerIdentity,
  type FileContentsResponse,
  type FileListResponse,
  type GameServer,
  type HostingService,
  type MutationOperation,
  type StartupConfigResponse
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
  InvoiceProvider, RedactedServerLogProvider,
  CustomerIdentityResolver,
  GameServerProvider,
  GameServerFileProvider,
  HostingServiceProvider,
  GameServerMutationProvider
} from "../ports/index.js";

export interface HostingSupportDependencies {
  readonly invoices?: InvoiceProvider;
  readonly logs?: RedactedServerLogProvider;
  readonly identityResolver: CustomerIdentityResolver;
  readonly hostingServices: HostingServiceProvider;
  readonly gameServers: GameServerProvider;
  readonly gameServerFiles?: GameServerFileProvider;
  readonly gameServerMutations?: GameServerMutationProvider;
}

export class HostingSupportService {
  #restartAt = new Map<string, number>();
  constructor(private readonly dependencies: HostingSupportDependencies) {}

  async getInvoice(actor: ActorContext, invoiceRef: string) {
    const customer = await this.resolveCustomer(actor);
    if (!this.dependencies.invoices) throw new ServiceNotFoundError();
    const record = await this.callUpstream("Invoice provider", () => this.dependencies.invoices!.find(invoiceRef, actor));
    if (!record || record.customerRef !== customer.customerRef) throw new ServiceNotFoundError();
    if (!Value.Check(OwnInvoiceSchema, record.invoice)) throw new UpstreamUnavailableError("Invoice provider");
    return record.invoice;
  }

  async getServerLogs(actor: ActorContext, serviceRef: string) {
    const server = await this.getMyServer(actor, serviceRef);
    if (!this.dependencies.logs) throw new ServiceNotFoundError();
    const logs = await this.callUpstream("Redacted server logs", () => this.dependencies.logs!.read(server, actor));
    if (!Value.Check(RedactedServerLogsSchema, logs)) throw new UpstreamUnavailableError("Redacted server logs");
    return logs;
  }

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

  async listMyFiles(actorContext: ActorContext, serviceRef: string, path = "/"): Promise<FileListResponse> {
    const server = await this.getMyServer(actorContext, serviceRef);
    if (!this.dependencies.gameServerFiles) throw new MutationNotAllowedError();
    return this.callUpstream("Game server file provider", () => this.dependencies.gameServerFiles!.listFiles(server, path, actorContext));
  }

  async readMyFile(actorContext: ActorContext, serviceRef: string, path: string): Promise<FileContentsResponse> {
    const server = await this.getMyServer(actorContext, serviceRef);
    if (!this.dependencies.gameServerFiles) throw new MutationNotAllowedError();
    return this.callUpstream("Game server file provider", () => this.dependencies.gameServerFiles!.readFile(server, path, actorContext));
  }

  async getMyStartupConfig(actorContext: ActorContext, serviceRef: string): Promise<StartupConfigResponse> {
    const server = await this.getMyServer(actorContext, serviceRef);
    if (!this.dependencies.gameServerFiles) throw new MutationNotAllowedError();
    return this.callUpstream("Game server startup provider", () => this.dependencies.gameServerFiles!.getStartupConfig(server, actorContext));
  }

  /** Called only by the approval workflow after it has consumed a single-use approval. */
  async executeApprovedMutation(actorContext: ActorContext, operation: MutationOperation, binding: { customerRef: string; serverRef: string }): Promise<void> {
    if (!Value.Check(MutationOperationSchema, operation) || !this.dependencies.gameServerMutations) {
      throw new MutationNotAllowedError();
    }
    const customer = await this.resolveCustomer(actorContext);
    const server = await this.getMyServer(actorContext, operation.serviceRef);
    if (customer.customerRef !== binding.customerRef || server.serverRef !== binding.serverRef) throw new MutationNotAllowedError();
    if (server.serviceRef !== operation.serviceRef) throw new ServiceNotOwnedError();
    if (operation.operation === "update_startup_variable") {
      if (!this.dependencies.gameServerFiles) throw new MutationNotAllowedError();
      const startup = await this.callUpstream("Game server startup provider", () =>
        this.dependencies.gameServerFiles!.getStartupConfig(server, actorContext));
      const variable = startup.variables.find((item) => item.key === operation.key);
      if (!variable?.editable) throw new MutationNotAllowedError();
    }
    await this.callUpstream("Game server mutation provider", () =>
      this.dependencies.gameServerMutations!.execute(operation, server, actorContext)
    );
    const verified = await this.getMyServer(actorContext, operation.serviceRef);
    if (verified.status === "unknown") throw new UpstreamUnavailableError("Game server mutation verification");
  }

  /** Low-risk, reversible remediation. Ownership and active state are checked immediately before execution. */
  async restartMyServer(actorContext: ActorContext, serviceRef: string): Promise<void> {
    if (!this.dependencies.gameServerMutations) throw new MutationNotAllowedError();
    const server = await this.getMyServer(actorContext, serviceRef);
    if (!["running"].includes(server.status)) throw new MutationNotAllowedError();
    const key = server.serverRef;
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
