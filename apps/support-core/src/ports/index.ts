import type {
  ActorContext,
  CustomerIdentity,
  GameServer,
  HostingService,
  HandoffRequest,
  TicketScope,
  TicketSnapshot,
  SupportAuditEvent
} from "@openclaw-hosting/contracts";

export interface SupportAuditRecorder {
  /** Best effort only; implementations must bound waiting and discard raw failures. */
  record(event: SupportAuditEvent): Promise<void>;
}

export interface CustomerIdentityResolver {
  resolveActor(actorContext: ActorContext): Promise<CustomerIdentity | null>;
}

export interface TicketAccessProvider {
  read(scope: TicketScope): Promise<TicketSnapshot | null>;
  handoff(scope: TicketScope, request: HandoffRequest): Promise<void>;
}

export interface HostingServiceProvider {
  listForCustomer(
    customer: CustomerIdentity,
    actorContext: ActorContext
  ): Promise<readonly HostingService[]>;

  findByReference(
    serviceRef: string,
    actorContext: ActorContext
  ): Promise<HostingService | null>;
}

export interface GameServerProvider {
  findForOwnedService(
    service: HostingService,
    actorContext: ActorContext
  ): Promise<GameServer | null>;
}
