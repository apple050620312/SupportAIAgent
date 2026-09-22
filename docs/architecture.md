# Architecture

## System context

```text
Discord ticket conversation (source of truth)
  -> existing Discord Ticket Bot
  -> future OpenClaw Support Agent (orchestration)
  -> Support Core (authorization and policy)
  -> WHMCS (customers, billing, services)
  -> Pterodactyl (game server runtime)
```

Support Core is stateless in the MVP. Each operation carries an `ActorContext` containing the Discord identity and a correlation ID. The core resolves identity and ownership on every customer-specific operation through injected ports. Provider adapters translate upstream data into the small stable domain contracts; raw provider responses do not cross the adapter boundary.

## Dependency direction

`HostingSupportService` depends on `CustomerIdentityResolver`, `HostingServiceProvider`, and `GameServerProvider`. Concrete adapters point inward toward these ports. Fastify is only a delivery mechanism and currently exposes health, not customer operations.

The lookup sequence is fixed:

1. Resolve the Discord actor to a customer identity.
2. Retrieve or select a hosting service and verify its resolved customer ownership.
3. Resolve the game server from that proven-owned hosting service.
4. Apply operation-specific policy before any future action.

The core accepts `serviceRef` only as a selector. It never accepts a WHMCS client ID or Pterodactyl server UUID from the agent-facing operation.

## Error model

Expected failures use stable error codes: `IDENTITY_NOT_LINKED`, `SERVICE_NOT_FOUND`, `SERVICE_NOT_OWNED`, `SERVER_NOT_FOUND`, and `UPSTREAM_UNAVAILABLE`. Messages are safe for logs/API translation and must not contain credentials or raw upstream bodies. Adapters map provider failures to these domain errors.

## HTTP surface

Only `GET /health` exists in Task 1. Future customer routes require a separately designed authenticated identity transport; adding demonstration routes that accept provider identifiers would undermine the boundary.
