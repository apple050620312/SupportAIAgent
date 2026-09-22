# ADR 0002: no application database in the MVP

- Status: Accepted
- Date: 2026-09-22

## Decision

Support Core remains stateless. WHMCS, Pterodactyl, and Discord remain the systems of record for their respective domains. Do not add a database, Redis, or a message queue without a new architecture decision describing the concrete consistency and operational need.

## Consequences

Every customer operation re-resolves identity and ownership. This favors correctness and a small operational footprint over caching. Availability depends on upstream systems, and failures are returned explicitly rather than answered from fabricated or stale state.
