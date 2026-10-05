export type SupportErrorCode =
  | "IDENTITY_NOT_LINKED"
  | "SERVICE_NOT_FOUND"
  | "SERVICE_NOT_OWNED"
  | "SERVER_NOT_FOUND"
  | "MUTATION_NOT_ALLOWED"
  | "MUTATION_RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE";

export abstract class SupportDomainError extends Error {
  abstract readonly code: SupportErrorCode;

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class IdentityNotLinkedError extends SupportDomainError {
  readonly code = "IDENTITY_NOT_LINKED" as const;

  constructor() {
    super("The Discord actor is not linked to a customer");
  }
}

export class ServiceNotFoundError extends SupportDomainError {
  readonly code = "SERVICE_NOT_FOUND" as const;

  constructor() {
    super("The requested hosting service was not found");
  }
}

export class ServiceNotOwnedError extends SupportDomainError {
  readonly code = "SERVICE_NOT_OWNED" as const;

  constructor() {
    super("The requested hosting service is not owned by the resolved customer");
  }
}

export class ServerNotFoundError extends SupportDomainError {
  readonly code = "SERVER_NOT_FOUND" as const;

  constructor() {
    super("No game server was found for the owned hosting service");
  }
}

export class UpstreamUnavailableError extends SupportDomainError {
  readonly code = "UPSTREAM_UNAVAILABLE" as const;
  readonly provider: string;

  constructor(provider: string, options?: ErrorOptions) {
    super(`${provider} is currently unavailable`, options);
    this.provider = provider;
  }
}

export class MutationNotAllowedError extends SupportDomainError {
  readonly code = "MUTATION_NOT_ALLOWED" as const;
  constructor() { super("This support operation requires a different approval"); }
}

export class MutationRateLimitedError extends SupportDomainError {
  readonly code = "MUTATION_RATE_LIMITED" as const;
  constructor() { super("This support operation was recently requested"); }
}
