# ADR 0004: trusted ticket context for the read-only prototype

- Status: Accepted for the offline prototype; live integration requires operator testing
- Date: 2026-10-06

## Context

The conversation plan requires a trusted Discord actor, independent Support Core authorization, per-ticket context, and silence after human takeover. A model-provided Discord ID is not authentication. No database, Redis, or second customer mapping store is wanted. The existing Ticket Bot remains the owner of ticket state and Discord lifecycle.

## Decision

The trusted Ticket Bot issues a sixty-second HMAC-SHA256 bearer capsule containing only audience, issued/expiry timestamps, customer Discord ID, guild ID and channel ID. The signing key belongs to the bot and Core, not the agent or tool arguments. Core verifies the signature and rechecks the authoritative ticket snapshot through `TicketAccessProvider` on every operation. Unknown scopes, actor mismatch, closed tickets and human takeover fail closed before customer provider calls.

Read-only routes are registered only when explicit delivery dependencies are supplied to `buildApp`. Normal startup remains health-only. This is an implemented prototype transport decision, not approval to trust GetClientID in production; ADR 0003 remains deferred.

The model selects only service references within owned resources. Core's public responses omit customer references and Pterodactyl UUIDs. The tool factory binds an opaque capsule getter from verified host context and has no provider credentials or signing key. An unknown host session receives no tools.

## Alternatives considered

- Actor IDs in request bodies or plain headers: rejected because callers/models could select a different customer.
- A single agent-visible signing key: rejected because the agent could mint arbitrary identities.
- A database-backed token/session store: unnecessary for the prototype and contrary to the stateless MVP decision.
- Discord signature verification at every Core call: not a substitute for ticket ownership/lifecycle; the existing bot already receives authenticated Discord events and must attest that context.
- Relying on OpenClaw session naming or owner flags: rejected as customer authorization evidence.

## Security implications

Capsules are bearer credentials, not encrypted payloads. Keep them in trusted host memory, out of model-visible text, logs, URLs, archives and fixtures. Use TLS remotely, short lifetimes, a random signing key of at least 32 bytes, and a protected service network. Read-only replay within the lifetime is possible; the current authoritative state check still revokes a ticket after takeover/close. This protocol is not suitable for future provider mutations without a separate approval/replay/idempotency design.

The real bot must derive the customer actor and channel ownership from authenticated Discord events and its stored ticket data. It must authorize staff roles before takeover/close methods, atomically compare/update revisions, serialize final sends against takeover/close, check the expected HUMAN_NEEDED revision when sending handoff chunks, and persist handoff delivery receipts in its existing ticket state. These cannot be replaced by model assertions or the offline in-memory demo.

Handoff is a bounded ticket-side effect, not a hosting mutation. Generated text disables mentions, is chunked for Discord's message limit, and is labelled agent-reported/unverified. Failed handoff delivery remains HUMAN_NEEDED and can be retried with the same receipt key; the bot implements receipt deduplication. Notifications to staff are configured by the bot, not selected by the model.

## Consequences

The prototype can test routes, tool schemas, ownership and ticket lifecycle without any live providers or model. Production bot/session integration must implement the declared state and serialized-send ports and verify them in the operator's environment. The existing external repositories are left unchanged.

Native OpenClaw plugin packaging and final host authority-context binding require a pinned target host version and the planned runtime comparison. The current package supplies testable concrete factory tools with `execute(toolCallId, params, signal?)`, not a claim of installed SDK compatibility.
