# Hosting Support native OpenClaw plugin

This package now exports `createHostingTools` and `hostingToolFactory`: six bounded read-only tools, one rate-limited restart tool and a ticket-side handoff tool. They call authenticated Support Core only. They use concrete tool `execute(toolCallId, parameters, signal?)` semantics described in the official [tool plugin documentation](https://docs.openclaw.ai/plugins/tool-plugins). No OpenClaw runtime dependency is installed.

The host supplies `TrustedHostingToolContext`, an opaque ticket capsule getter and an invocation-currency guard, per verified ticket session. Unknown sessions receive no tools. A model cannot supply an actor/customer/server ID or a destination channel; it may select only `serviceRef` from its owned service list. Strict TypeBox validation rejects extra parameters.

The factory holds no WHMCS/Pterodactyl credential or context signing key. HTTPS is required remotely; localhost HTTP is permitted for an explicitly local Core. Core errors are reduced to safe fixed codes, raw bodies are bounded and not logged, and customer references/server UUIDs are excluded from public tool results.

`skills/hosting-support/SKILL.md` describes read-only diagnosis, facts versus hypotheses, and staff handoff. Skills do not grant authority.

Run `corepack pnpm demo:mock` or `corepack pnpm eval:mock` to exercise the concrete tools with Core and mocked providers. These are not model-quality or native SDK compatibility benchmarks.

The operator chose OpenClaw. The package now ships `openclaw.plugin.json`, the native `dist/native.js` entry and a Gateway-authenticated `/hosting-support/turn` route, pinned to **2026.9.8**. `registerHostingPlugin` registers optional version-two factories. No SDK runtime is installed in this workspace; the Gateway supplies its native API. Structural subsets are reviewed against the tagged source, not an assertion of live loader compatibility.

The turn route verifies the capsule through Core before invoking `runEmbeddedAgent`. It binds a random session to the verified scope, places the capsule exclusively in `toolBindings`, restricts both tool allowlists, enforces a 45-second run deadline, and extracts only final text. The bot retains final delivery authority. Native tool `details` wrap domain data under `data`, avoiding OpenClaw's reserved top-level status/error outcome fields.

Use the [manual bot/OpenClaw guide](../../docs/testing-ticket-openclaw.md). Unknown bindings get no tools; model IDs and session naming grant nothing. Live loader, SDK, model and provider tests are still pending. Do not use this single-process prototype as unattended production infrastructure.
