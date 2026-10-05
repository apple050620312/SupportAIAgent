# OpenClaw Hosting Support

Foundation for an AI-assisted hosting support platform. The repository is private, pre-MVP, and currently establishes contracts and authorization boundaries without connecting to production systems.

## Architecture

```text
Discord Ticket Bot -> OpenClaw Support Agent -> Hosting Support Core -> WHMCS / Pterodactyl
```

Support Core is the trusted authorization boundary. It resolves a Discord actor to a linked WHMCS customer, scopes service access to that customer, and only then resolves a game server. OpenClaw remains replaceable orchestration and never receives privileged provider credentials.

## Layout

- `apps/support-core`: health service, port-based authorization and opt-in authenticated read-only delivery.
- `packages/contracts`: small TypeBox schemas and inferred TypeScript types.
- `packages/whmcs`: provisional identity, client existence/status and owned-service read adapters.
- `packages/pterodactyl`: Pterodactyl 1.15.1 external mapping and resource read adapter.
- `packages/provider-http`: private bounded provider transport, never an agent tool.
- `packages/trusted-context`: bot-issued short-lived signed ticket capsules.
- `packages/ticket-bridge`: ticket lifecycle, handoff and serialized-send ports for the existing bot.
- `packages/openclaw-hosting-plugin`: bounded tool factory and support Skill, pending native host wrapper.
- `docs`: architecture, security, integration questions, and decisions.

## Development

Requires Node.js 24.16+ and pnpm.

```sh
corepack enable
pnpm install
pnpm build
pnpm typecheck
pnpm test
pnpm lint
pnpm dev
```

If the environment cannot install Corepack's global shim, prefix the same commands with
`corepack` (for example, `corepack pnpm install` and `corepack pnpm test`).

`GET http://127.0.0.1:3000/health` returns the health status. Request logs include Fastify request IDs; callers may pass `x-correlation-id` for end-to-end correlation.

## Deliberately not implemented

There are no live WHMCS or Pterodactyl calls, Discord ticket events, OpenClaw runtime dependency, order review workflow, mutation tools, database, Redis, queue, or container orchestration. Identity transport from OpenClaw is also intentionally unresolved.

The WHMCS identity adapter is tested with synthetic mocked responses only. It accepts a trusted `ActorContext`, returns a minimal `customerRef`, and rejects unknown responses without treating them as not linked. It is not enabled by `pnpm dev` or `pnpm start`. See [the integration notes](docs/integrations/whmcs-discord-link.md#provisional-read-only-adapter) for its assumptions and deployment gates.

## Next milestone

The operator reports WHMCS 9.0.9 and Pterodactyl 1.15.1. The offline read-only chain now includes identity, existing Active client verification, owned services, server status/resources, six agent tools and staff handoff. [Provider evidence](docs/integrations/read-only-providers.md) separates official-source facts from unverified deployment assumptions.

```sh
corepack pnpm demo:mock
corepack pnpm eval:mock
```

These commands use only synthetic mocks and Fastify injection, with no provider, Discord, model or OpenClaw network calls. `pnpm dev`/`start` remain health-only; customer routes require explicit `buildApp({ readOnly: ... })` dependencies and a real authoritative ticket adapter.

Start with [GetClientID manual testing](docs/testing-get-client-id.md), then [the read-only integration test guide](docs/testing-read-only-support.md). That guide includes the separately acknowledged `probe:read-only` command and the real Ticket Bot / Harness integration gates. Do not run the probe before reviewing identity results or install the tool factory as a native plugin without verifying a pinned host SDK.

Mapping uniqueness, real response compatibility, key scopes, policy approval, bot state/send integration and host context binding remain operator-tested deployment gates. Provider mutations, restart and Order Agent remain deferred. ADR 0003 is not created; [ADR 0004](docs/decisions/0004-trusted-ticket-context.md) documents prototype trusted-context delivery without claiming GetClientID authority.
