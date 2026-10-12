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
- `packages/openclaw-hosting-plugin`: bounded tool factory, native OpenClaw 2026.9.8 entry/turn route and support Skill.
- `docs`: architecture, security, integration questions, and decisions.

## Markdown support knowledge

Place reviewed customer-safe UTF-8 `.md` files under the ignored `knowledge/` directory, or set `SUPPORT_KNOWLEDGE_ROOT` to an absolute folder in `.env.ticket-support`. Run `corepack pnpm knowledge:check` for an offline corpus check. The manual ticket launcher loads this corpus before starting the bot. OpenClaw can search in Chinese/English, read cited pages and use existing Core tools to attempt resolution, verify results or hand off. See [the knowledge guide](docs/support-knowledge.md) and [article template](docs/examples/support-knowledge-article.md).

Knowledge documents do not authorize operations. Unsupported or unverified procedures still require staff help; this integration does not claim every documented issue is solved or the 80% target has been achieved.

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

No live WHMCS, Pterodactyl, Discord or model request has been made during development. Normal dev/start has no provider wiring. Bounded restart and the approved-mutation prototype have offline implementations; actual staff-approval integration, provider compatibility and post-operation semantics remain deployment gates. Order review, a new database, Redis, a persistent queue and container orchestration remain unimplemented. OpenClaw is supplied by the operator's Gateway, not installed as a workspace runtime dependency.

The WHMCS identity adapter is tested with synthetic mocked responses only. It accepts a trusted `ActorContext`, returns a minimal `customerRef`, and rejects unknown responses without treating them as not linked. It is not enabled by `pnpm dev` or `pnpm start`. See [the integration notes](docs/integrations/whmcs-discord-link.md#provisional-read-only-adapter) for its assumptions and deployment gates.

## Next milestone

The operator reports WHMCS 9.0.9 and Pterodactyl 1.15.1. The offline chain includes identity, Active client verification, owned services, server diagnosis, bounded restart, the approved-mutation prototype, Markdown knowledge and staff handoff. The native factory registers fifteen bounded tools. [Provider evidence](docs/integrations/read-only-providers.md) separates official-source facts from unverified deployment assumptions.

```sh
corepack pnpm demo:mock
corepack pnpm eval:mock
```

These commands use only synthetic mocks and Fastify injection, with no provider, Discord, model or OpenClaw network calls. `pnpm dev`/`start` remain health-only; customer routes require explicit `buildApp({ readOnly: ... })` dependencies and a real authoritative ticket adapter.

Start with [GetClientID manual testing](docs/testing-get-client-id.md), then [the read-only integration test guide](docs/testing-read-only-support.md). That guide includes the separately acknowledged `probe:read-only` command and the real Ticket Bot / Harness integration gates. Do not run the probe before reviewing identity results or install the tool factory as a native plugin without verifying a pinned host SDK.

Mapping uniqueness, real response compatibility, key scopes, policy approval, bot state/send integration and host context binding remain operator-tested deployment gates. Bounded restart and the high-risk prototype still need real permission and operation-specific verification; the manual launcher does not wire trusted staff approval. Order Agent remains deferred. ADR 0003 is not created; [ADR 0004](docs/decisions/0004-trusted-ticket-context.md) documents prototype trusted-context delivery without claiming GetClientID authority.

The unchanged `ticket-main.zip` baseline now has a separate single-process launcher, owner-derived message ingress and serialized delivery/mutation guard. OpenClaw is selected and pinned to 2026.9.8. Native entry, Gateway-authenticated turn routing and out-of-band capsule binding are implemented with synthetic tests; actual bot/native SDK activation remains manual. Follow [the bot/OpenClaw guide](docs/testing-ticket-openclaw.md) before `corepack pnpm start:ticket-support`. That command starts a live baseline only after explicit setup acknowledgements. Restart revokes AI admission; uncertain sends are never blindly retried. [ADR 0005](docs/decisions/0005-unchanged-ticket-baseline-openclaw.md) records the limited scope.

The inspected `PteroAI-main.zip` is treated as a legacy reference. OpenClaw replaces its identity, ownership, diagnosis and handoff path through Support Core. File/startup/power/reinstall capabilities use scoped reads or the approved-mutation prototype rather than direct model access to provider credentials. See [the migration baseline](docs/integrations/pteroai.md) and [mutation prototype notes](docs/integrations/pteroai-high-risk-capabilities.md); real high-risk execution still requires reviewed staff-approval wiring and integration tests.
