# Vercel read-only ticket loop

Offline alternative to the unchanged OpenClaw plugin. `createVercelTicketRunner`
implements `TicketAgentRunner` with AI SDK 7 `ToolLoopAgent`; it is deliberately
not wired into the Discord launcher. Support Core remains the authorization
boundary, using its existing routes, domain ports, permission matrix, ownership
checks and invocation audit. The runner never calls provider clients.

The model sees exactly four T0 tools:

- `search_support_knowledge`: reviewed, reference-only KB passages.
- `get_my_server_status`: trusted ticket's selected own server.
- `get_server_logs`: bounded, already redacted own-server logs, marked untrusted.
- `get_invoice`: trusted ticket's own invoice, with no selector input.

Status, logs and invoice tools accept only `{}`. The authenticated host supplies
selection; Core checks it afresh. A failed/unsupported answer triggers Core's
T0 `handoff_to_staff` lifecycle route in application code. Handoff is not a model
tool, and there are no restart, mutation, generic HTTP or cross-customer tools.

## Run

```sh
pnpm demo:vercel
```

Default execution uses `MockLanguageModelV4`, synthetic providers and Fastify
injection: no network or API key. Local dialogue is stored in `.agent-history/`,
which is gitignored. No production ticket or hosting integrations are enabled.

Optional live model only (set the key securely in the shell environment first):

```sh
AGENT_LIVE_MODEL=1 pnpm demo:vercel
```

This requires `SUB2API_API_KEY` (or `OPENAI_API_KEY`) from the environment. It sends
synthetic dialogue to `https://sub2api.coffeehost.net/v1`, using `gpt-6.1-sol` via
the OpenAI-compatible Responses API. Hosting, ticket storage and Discord remain
synthetic. The default does not switch to live merely because a key is present.
No live request was made to verify endpoint/model compatibility in this step.

## DECISIONS

- Pin `ai` to **7.0.164** and `@ai-sdk/openai` to **4.0.110**, preserving the
  interrupted implementation's compatible SDK 7/provider pairing. Use the
  Responses API for the requested GPT model; never silently fall back to another
  provider, model or protocol. Temperature **0.2**, **10** steps, serial tool
  execution, zero model retries, 60-second turn and 10-second Core request limits.
- Require host authentication, ticket/channel binding and fresh lifecycle checks.
  Model/chat input never selects identity or resources. Recheck before each Core
  request and after reads; Core independently enforces authorization.
- Use a SHA-256 filename over trusted guild + ticket/thread ID + actor for history
  isolation. Persist only user/final assistant text, at most 40 messages with
  6,000 characters each; do not persist capsules or tool traces. Known runtime
  keys and the ticket capsule are scrubbed. Files/directories request modes
  0600/0700; atomic replacement plus a cross-process lock fails closed on
  contention. An abandoned lock needs operator removal after confirming no turn
  is active. This is a single-host interim store, without DB/Redis/queue.
- Require fresh KB retrieval each turn, at least 0.5 lexical query coverage
  (English tokens / Chinese bigrams), and a final answer containing an exact
  returned excerpt plus `[source:start-end]`. Missing/irrelevant retrieval,
  invalid tools, provider failure, missing citations or step exhaustion hands
  off. This conservative heuristic is not calibrated confidence or a semantic
  proof that every sentence is supported. Account-only requests also require KB
  evidence in this first version. The prompt requests the customer's language;
  deterministic handoff text supports Chinese (Han detected) and English.
- Retain the existing synthetic harness defaults for baseline tests. Optional
  synthetic invoice/log ports let the new tests verify successful reads and
  wrong-owner denial without changing the OpenClaw plugin or adding live adapters.

The referenced `/tmp/codex-step2-resume-prompt.md` was absent after the runtime
restart. Implementation was checked against the supplied finish checklist and
repository security/architecture decisions; its unavailable contents could not
be independently verified.

## Comparison with the OpenClaw baseline

These are offline wiring/security checks, not a measured model-quality contest.
Both paths use the same synthetic harness and Core authorization boundary.

| Mock scenario | Existing OpenClaw baseline | New Vercel loop |
| --- | --- | --- |
| Own status | Existing tool-to-Core read tests | Mock model calls status through Core |
| Cross-customer selector | Core rejects service B for actor A | Host-selection mismatch and wrong-owner invoice release no record |
| KB evidence | Existing knowledge tool tests | Exact excerpt/citation gate; empty or irrelevant retrieval triggers handoff |
| Ticket injection / writes | Existing security tests constrain Core operations; baseline includes gated restart | Only four T0 reads; malicious write/foreign selector calls cannot dispatch |
| Same-ticket continuation | Existing native session/context tests | Two independently constructed runners round-trip local dialogue |
| Handoff | Existing ticket lifecycle checks | Application invokes the same Core lifecycle and stops tool generation |

The baseline has broader tools, including gated restart, resources and files;
this loop intentionally cannot execute those scenarios. `pnpm eval:mock` keeps
its existing baseline suite and does not silently change the comparison target.
New loop coverage is in `scripts/test/vercel-agent.test.ts` under `pnpm test`.

## Before real tickets

Still required: a bilingual golden set and measured quality/cost/latency comparison,
Langfuse tracing with safe redaction/retention, a durable approval queue/workflow
before any writes, authenticated production host/selection and lifecycle adapters,
verified model gateway compatibility, real provider adapters for invoice/redacted
logs, and operational history retention/encryption/lock recovery. Arbitrary user
text can contain secrets not known to the scrubber: local history is private
customer data and needs a production privacy design. No golden set, tracing,
approval queue, new database, live Discord integration or write capability is
implemented in this step.
