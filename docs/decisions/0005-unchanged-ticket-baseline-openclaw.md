# ADR 0005: unchanged Ticket Bot baseline with OpenClaw

- Status: Accepted for the isolated single-process read-only prototype
- Date: 2026-10-06

## Context

The operator chose OpenClaw and requires `ticket-main.zip` as the baseline without changing the archive. The inspected bot uses a shared Mongoose ticket model and CommonJS handlers. Its schema lacks AI state/revision/receipts; its close, delete, reopen, membership and ready paths use `findOneAndUpdate`. Core must not gain database access, and model-authored IDs remain untrusted.

## Decision

Use the unchanged extracted bot with an opt-in runtime launcher in this repo. Before importing its entry, decorate the shared model's mutation-query execution with the same serialization gate used for AI delivery. Preserve the original methods and source files. Any guarded legacy mutation conservatively retires all admitted AI tickets before executing; reopening does not revive them.

AI lifecycle/revisions and confirmed/uncertain handoff receipts live only in the bot process. Restart or guard removal revokes admission. An uncertain Discord send is never automatically retried. This deliberately sacrifices automatic recovery rather than claiming durable or exactly-once delivery. Only the configured test channel is enabled by the launcher.

Pin the native plugin to OpenClaw `2026.9.8`, verified against its public tagged contracts. The Gateway-authenticated `/hosting-support/turn` route first verifies the signed capsule through Core, binds a random session ID to its verified scope, and initiates a bounded embedded run. The capsule travels through runtime `toolBindings`, never the prompt or tool arguments. Both advertised and execution tool allowlists contain exactly the seven hosting tools. Final Discord delivery belongs to the bot and repeats the state/revision check.

## Alternatives considered

- Modify the archive/schema: contrary to the operator's instruction.
- Read MongoDB from Support Core: rejected; its `TicketAccessProvider` remains a port, with the bot's reader injected at composition.
- A second bot or independent observer process: cannot serialize legacy writes against sends.
- Persistent receipts with automatic retries: requires bot schema changes or another store, neither introduced here.
- Plain Discord/customer IDs from model arguments or session naming: rejected as authority.

## Security implications

This integration requires one bot process and exclusive use of its decorated model for ticket mutations. External writers, document `save`, bulk writes, retained pre-install query executors and additional bot processes are outside its guarantee. Verify those deployment conditions before enabling it. Do not install it beside another instance of the same bot.

Staff takeover comes from authenticated Discord events and an operator-configured staff ID allowlist. Guest messages grant no staff or customer authority. Core still resolves customer identity, status and ownership on every operation; the bot database stores only ticket authority, not a second WHMCS mapping.

Old baseline credential handling remains unchanged and is not endorsed. The operator must review and rotate historical credentials separately before running the baseline. Provider credentials for the new flow come only from ignored local configuration and never enter OpenClaw. No live provider or bot was started during implementation.

## Consequences

The main repo contains the native entry/manifest, authenticated turn route, bot event ingress, provider composition and manual launcher. Tests use synthetic model records, injected HTTP and a mocked embedded agent; native loader, actual SDK behavior, Discord ordering and provider responses remain manual integration tests.

The prototype is not a multi-process or unattended production deployment. A legacy membership/background update can also silence AI tickets, and the existing bot's independent replies remain in place. Before a broader rollout, review those behaviors and choose an explicit production lifecycle/receipt design. ADR 0003 remains deferred until GetClientID authority is characterized.
