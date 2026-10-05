# ADR 0006: approved provider mutations and a reviewed improvement loop

- Status: Proposed implementation boundary
- Date: 2026-10-06

## Context

The legacy PteroAI can edit files, change startup variables, operate power state and reinstall servers. It gives the model direct provider access and uses Discord buttons as a coarse confirmation layer. The new OpenClaw flow must eventually replace useful low-risk remediation without weakening the Support Core authorization boundary.

The project also wants the support agent to improve over time. Automatic changes to production tools, permissions or prompts based on unreviewed customer conversations would create a second authorization path and could turn a model mistake into a repeated behavior.

## Decision

All provider writes other than the explicitly bounded restart use a two-stage operation:

1. OpenClaw proposes a typed operation using a service reference already scoped to the signed ticket actor.
2. Support Core re-resolves the customer, service and server, checks operation policy and binds a short-lived single-use approval to the ticket revision. A trusted staff or operator event approves it. Only then may the provider adapter execute it.

The approval contains no model-supplied customer ID, server UUID or provider credential. It is bound to the ticket scope, service reference, operation digest, current revision, expiry and a random nonce. Takeover, close, ownership change, policy change or an uncertain upstream result invalidates it. Mutations are never automatically retried.

The implementation exposes bounded read operations and a typed mutation proposal flow for file writes, file moves, startup changes, power operations, reinstall and suspend/unsuspend. Those mutations require trusted staff approval before a single-use execution. Core verifies ownership immediately before execution, applies path and startup editability policy, and reads the server back after the provider call. The existing restart operation remains a bounded autonomous low-risk recovery; deployments may require staff approval for restart as well.

Continuous improvement is a reviewed loop rather than online weight training:

```text
deidentified outcome
  -> human label / staff feedback
  -> synthetic regression case
  -> deterministic safety and quality eval
  -> reviewed Skill/prompt/tool-policy change
  -> versioned release
```

Runtime feedback records fixed metadata only. It excludes credentials, capsules, Discord IDs, WHMCS IDs, raw provider responses and unreviewed customer text. No model may write its own policy, grant itself tools or promote a learning artifact.

## Alternatives considered

- Copy PteroAI's direct client-key calls: rejected because the model would bypass Core ownership and ticket state.
- A single Discord confirmation button for every write: rejected because it does not bind the exact operation to a current server ownership check or prevent replay.
- Automatic online prompt or weight updates: rejected because an unreviewed error would become production behavior.
- Add a database, Redis or queue immediately: rejected under ADR 0002. The prototype uses restart-revoked in-memory approvals; durable receipts require a separate decision.

## Security implications

The model remains an untrusted proposer. Provider credentials stay in adapters. Core rechecks identity and ownership immediately before execution. Every operation has a bounded schema, timeout, no redirect policy, static errors and an explicit result-verification requirement. A failed or ambiguous mutation becomes a human handoff; it is never reported as successful.

The reviewed learning loop limits poisoning by requiring synthetic fixtures, human labels, fixed evals and an explicit release review. Staff-only audit output remains operational evidence and never becomes an authorization source.

## Consequences

The system can eventually provide safer remediation than PteroAI, but each mutation requires a separate contract, policy, provider test fixture and manual integration test. Restart-revoked approval is less convenient than unattended recovery, but it avoids claiming durability before the project has a durable receipt design. Continuous improvement has a slower release cycle, with an auditable explanation for every behavior change.
