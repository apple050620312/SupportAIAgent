# OpenClaw Hosting Support

Foundation for an AI-assisted hosting support platform. The repository is private, pre-MVP, and currently establishes contracts and authorization boundaries without connecting to production systems.

## Architecture

```text
Discord Ticket Bot -> OpenClaw Support Agent -> Hosting Support Core -> WHMCS / Pterodactyl
```

Support Core is the trusted authorization boundary. It resolves a Discord actor to a linked WHMCS customer, scopes service access to that customer, and only then resolves a game server. OpenClaw remains replaceable orchestration and never receives privileged provider credentials.

## Layout

- `apps/support-core`: Fastify health service and provider-independent support orchestration.
- `packages/contracts`: small TypeBox schemas and inferred TypeScript types.
- `packages/whmcs`: future WHMCS adapter types and configuration boundary.
- `packages/pterodactyl`: future Pterodactyl adapter types and configuration boundary.
- `packages/openclaw-hosting-plugin`: placeholder documentation for the future plugin.
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

## Next milestone

Implement read-only WHMCS identity/service resolution and Pterodactyl server lookup, beginning with discovery of the existing WHMCS Discord Link addon's supported interface.
