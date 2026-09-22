# ADR 0001: pnpm TypeScript monorepo

- Status: Accepted
- Date: 2026-09-22

## Decision

Use a pnpm workspace with separate packages for contracts, provider adapters, the OpenClaw plugin, and the Support Core application. Use strict TypeScript, ESM, and TypeBox for runtime-validatable shared contracts.

## Consequences

The separation makes provider and agent dependencies replaceable and keeps pure contracts free of I/O. It adds workspace build ordering, but avoids coupling the core to any one orchestration system or upstream response format.
