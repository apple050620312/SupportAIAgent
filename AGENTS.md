# AGENTS.md

## Purpose

This repository is the foundation for an AI-assisted hosting support platform. It is currently pre-MVP and intentionally contains no live provider integrations.

## Boundaries

- `apps/support-core`: application orchestration and the final authorization boundary.
- `packages/contracts`: pure TypeBox schemas and domain types; no I/O.
- `packages/whmcs`: future WHMCS adapter boundary; no endpoint guesses.
- `packages/pterodactyl`: future Pterodactyl adapter boundary; no endpoint guesses.
- `packages/openclaw-plugin`: future agent adapter; it must call Support Core.
- `docs`: architecture, security invariants, integration questions, and decisions.

Business logic must depend on domain ports, never directly on provider HTTP clients. Do not bypass ports. OpenClaw is not an authorization boundary and must never receive raw WHMCS/Pterodactyl administrative API access. Never trust model-provided customer IDs, service ownership, or server UUID ownership. Do not introduce a database, Redis, or a queue without a documented architecture decision.

## Commands

- `pnpm install`
- `pnpm build`
- `pnpm typecheck`
- `pnpm test`
- `pnpm lint`
- `pnpm dev`

Use Node.js 24.16 or newer. Keep secrets out of source, fixtures, logs, and commits. After every change, run tests and typecheck; run lint for source or configuration changes.

## Handover (2026-11-23)

Read this first if you are picking this project up. It records where the work stands, what is blocked, and what not to redo.

### Where this stands

- Branch: `feat/vercel-ai-sdk-step1` (pushed; main is still the pre-agent-loop state).
- Repo: `github.com/apple050620312/SupportAIAgent` (public since 2026-11-23; formerly `Coffee-Host/OpenClawHostingSupport`, private).
- Agent layer swapped from the OpenClaw plugin to Vercel AI SDK (`packages/agent-loop`, ToolLoopAgent): only 4 T0 read-only tools through Support Core (KB search, own-server status, redacted logs, own-invoice read), temp 0.2, 10-step cap, file-based JSON session history keyed by Discord thread ID. The `openclaw-plugin` package still exists but is no longer the agent loop. Support Core is untouched and remains the final authorization boundary.
- Risk tiers: T0 read auto / T1 restart gated + confirmation + rate limit / T2 reinstall & refund need single-use exact-transaction human approval / T3 cross-customer and credential rotation never exposed.

### Honest numbers

- Golden set: 175 sampled tickets (154 should-resolve, 21 should-hand-off), de-identified. It lives OUTSIDE this repo (`~/workspace/coffee-host-golden/golden_set.json`) — do not move it in, and never copy past-ticket content into the KB (it would leak eval answers and invalidate scores).
- Eval: strict lexical score is 0/154 resolved across steps 3–9. Step 10 semantic judge (gpt-6.1-sol judging gpt-6-luna's answers): 1 correct, 5 partial, 32 wrong out of 38 delivered. The bottleneck is answer quality and items needing real account state (logs, invoices, backend dates), not retrieval.
- KB: 61 articles, 551 sections (`knowledge/`, gitignored). 10 new articles from owner answers landed in step 11. Eval report: `docs/evals/golden-set-step3.md`.

### Todo list (in order)

1. ✅ KB gaps from owner answers (step 11, `e7621d1`).
2. ✅ Contradiction fix — SYSTEM_PROMPT must check retrieved passages for current restrictions before confirming availability (`0245716`).
3. ⏳ Shadow mode — wire the Vercel loop into Discord draft-only; staff approves before anything is sent. Proposal: `~/workspace/goals/coffee-host-support-ai-agent/files/shadow-mode-proposal.md`. BLOCKED on 3 owner decisions: (a) approver IDs / whether `staffUserIds` is current, (b) first 3–5 test tickets, (c) per-ticket staff thread destination. `createVercelTicketRunner` exists but is NOT wired into the Discord launcher; the current Discord path replies directly to customers.
4. ⏳ Semantic scoring as primary metric (with a docs-answerable vs needs-account-state split).
5. ⏳ KB staff review — the 51 published-docs articles are still marked draft v1.

### Blockers — things you need from the owner

- The semantic index (`.kb-index/passages.json`, gitignored) was NOT rebuilt after step 11, so the 10 new articles are not yet retrievable. Rebuilding needs the official OpenAI embeddings key; it is NOT stored anywhere. Ask the owner to supply it again before the next eval re-run.
- Model provider: sub2api for now, but production must also support official OpenAI — the provider stays env-configurable (`MODEL_PROVIDER`), never hardcoded. Embeddings via official OpenAI ONLY; chat models stay on sub2api.
- Do not connect production adapters (real WHMCS/Pterodactyl/Discord ticket handling) until the owner says so — explicitly deferred.

### Verification

- `pnpm test` (302+56), `pnpm run eval:mock` (76), `pnpm typecheck`, `pnpm lint`.
- Eval harness: retry a failing question several times before counting it failed (transient provider errors).
- Full context, todo tracking, and the owner's verbatim KB answers: `~/workspace/goals/coffee-host-support-ai-agent/GOAL.md`.
