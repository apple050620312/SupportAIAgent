# Hosting tool factory prototype

This package now exports `createHostingTools` and `hostingToolFactory`: six bounded read-only tools and a ticket-side handoff tool. They call authenticated Support Core only. They use concrete tool `execute(toolCallId, parameters, signal?)` semantics described in the official [tool plugin documentation](https://docs.openclaw.ai/plugins/tool-plugins). No OpenClaw runtime dependency is installed.

The host supplies `TrustedHostingToolContext`, an opaque ticket capsule getter and an invocation-currency guard, per verified ticket session. Unknown sessions receive no tools. A model cannot supply an actor/customer/server ID or a destination channel; it may select only `serviceRef` from its owned service list. Strict TypeBox validation rejects extra parameters.

The factory holds no WHMCS/Pterodactyl credential or context signing key. HTTPS is required remotely; localhost HTTP is permitted for an explicitly local Core. Core errors are reduced to safe fixed codes, raw bodies are bounded and not logged, and customer references/server UUIDs are excluded from public tool results.

`skills/hosting-support/SKILL.md` describes read-only diagnosis, facts versus hypotheses, and staff handoff. Skills do not grant authority.

Run `corepack pnpm demo:mock` or `corepack pnpm eval:mock` to exercise the concrete tools with Core and mocked providers. These are not model-quality or native SDK compatibility benchmarks.

Native plugin manifest/entry packaging and the real host-context binding are intentionally pending a pinned operator OpenClaw host version and the conversation's planned Harness trial. SDK APIs are experimental; do not install an invented manifest or infer customer authority from session key patterns. The current factory is the reusable implementation for that thin host wrapper and for another Harness.
