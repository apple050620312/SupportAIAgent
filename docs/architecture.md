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

`HostingSupportService` depends on `CustomerIdentityResolver`, `HostingServiceProvider`, and `GameServerProvider`. Concrete adapters point inward toward these ports. Provider adapters share private bounded HTTP transport; Core never imports provider network clients. The opt-in delivery layer also depends on `TicketAccessProvider`, backed by the existing bot's authoritative ticket state.

The lookup sequence is fixed:

1. Resolve the Discord actor to a customer identity.
2. Retrieve or select a hosting service and verify its resolved customer ownership.
3. Resolve the game server from that proven-owned hosting service.
4. Apply operation-specific policy before any future action.

The core accepts `serviceRef` only as a selector. It never accepts a WHMCS client ID or Pterodactyl server UUID from the agent-facing operation.

## Markdown support knowledge

`SupportKnowledgeService` depends on a `SupportKnowledgeProvider` port. The read-only local Markdown adapter indexes an operator-configured shared corpus, with English/Chinese lexical search and bounded article pages. Signed-ticket Core routes provide `search_support_knowledge` and `read_support_article`; the model supplies a query or content-versioned article reference, never a filesystem root or path. Citations contain relative sources and line numbers. Documents are `reference_only` and cannot grant ownership or approve writes.

Every OpenClaw support turn receives a reviewed search/read/diagnose/act/verify/handoff workflow. The manual launcher loads the knowledge folder before importing the live bot. No database or network retrieval service is introduced. See [the setup guide](support-knowledge.md) and ADR 0007; retrieval availability does not prove an incident was resolved.

## Error model

Expected failures use stable error codes: `IDENTITY_NOT_LINKED`, `SERVICE_NOT_FOUND`, `SERVICE_NOT_OWNED`, `SERVER_NOT_FOUND`, and `UPSTREAM_UNAVAILABLE`. Messages are safe for logs/API translation and must not contain credentials or raw upstream bodies. Adapters map provider failures to these domain errors.

## HTTP surface

Normal startup exposes only `GET /health`. `buildApp` can explicitly register prototype `/v1/me/identity`, `/services`, `/services/:serviceRef`, `/servers`, `/servers/:serviceRef/status`, `/servers/:serviceRef/resources`, the bounded `/servers/:serviceRef/restart` operation and `/handoff` with supplied dependencies. These routes reject additional parameters and use signed bot-issued ticket context, not model actor IDs. Public responses omit customer references and Pterodactyl UUIDs.

Handoff is a bounded existing-bot effect, not a provider mutation. Core validates ticket authority before requests and again before releasing customer data after awaited work. The bot must serialize final reply delivery against takeover/close and persist revisioned handoff receipts; the demo's in-memory store is not production persistence.

Operational audit is optional and separate from authorization. When configured, it emits only fixed operation/outcome/correlation metadata to a reviewed staff-only Discord channel; missing or failed audit delivery never grants access or turns a support request into success.

See ADR 0004 and the manual testing guide. Real provider activation, identity authority, bot/session adapters and native Harness host binding remain unverified. The concrete tool factory and provider chain are exercised by the offline demo and regression evals without a model.

The operator chose OpenClaw 2026.9.8 and the unchanged Ticket Bot archive as baseline. The opt-in launcher composes Core inside that bot process through ports; it reuses the bot's model/client and installs a serialized legacy mutation/send gate before importing handlers. Its overlay revokes admission on restart and refuses uncertain-send retries. The native Gateway route starts bounded runs with a fixed fifteen-tool allowlist and signed capsules in runtime `toolBindings`; the bot owns final Discord delivery. Reads include scoped server files/startup and shared Markdown knowledge. Restart uses its bounded policy; other provider writes require the separately configured approval prototype. The manual launcher does not supply staff approval. ADR 0005 limits this to one process and the configured test ticket, pending manual integration testing.

Future provider writes follow ADR 0006: OpenClaw proposes a typed operation, Core re-resolves ownership and a trusted host approves the exact digest before one execution. Runtime learning uses deidentified feedback and reviewed eval promotion; it does not let the model alter its own tools, policies or production prompt.
