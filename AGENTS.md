# AGENTS.md

## Purpose

This repository is the foundation for an AI-assisted hosting support platform. It is currently pre-MVP and intentionally contains no live provider integrations.

## Boundaries

- `apps/support-core`: application orchestration and the final authorization boundary.
- `packages/contracts`: pure TypeBox schemas and domain types; no I/O.
- `packages/whmcs`: future WHMCS adapter boundary; no endpoint guesses.
- `packages/pterodactyl`: future Pterodactyl adapter boundary; no endpoint guesses.
- `packages/openclaw-hosting-plugin`: future agent adapter; it must call Support Core.
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
