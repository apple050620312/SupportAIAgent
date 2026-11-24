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

Set `MODEL_PROVIDER=sub2api` (the default) with `SUB2API_API_KEY`, or
`MODEL_PROVIDER=openai` with `OPENAI_API_KEY` for the official API. `MODEL_ID`
defaults to `gpt-6-luna` through the OpenAI-compatible Responses API. Luna requests
Fast tier and `max` reasoning. An explicit provider rejection of the effort tries
the remaining supported values in descending order. Hosting, ticket storage
and Discord remain synthetic. The sub2api path is live-tested by the golden eval;
the official chat path remains construction-tested only; step 9 uses official OpenAI for embeddings only.

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
- Require fresh KB retrieval each turn. The default offline lexical gate accepts passages
  with at least 0.2 lexical query coverage, or the best returned passage at
  0.1 (English tokens / Chinese bigrams). The optional semantic mode below replaces lexical admission.
  The draft must use exact `[source:start-end]` labels for admitted ranges and can paraphrase the evidence.
  A separate `gpt-6.1-sol` review checks that all material claims have support in the cited passages or verified account reads,
  and that applicable steps and qualifications are present. Review runs inside the same turn deadline.
  Missing or irrelevant evidence, invalid tools, failed review, missing citations or step exhaustion lead to staff handoff.
  Account-only requests also require KB evidence. The prompt requests the customer's language.
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

## Golden-set evaluation (step 3)

`GOLDEN_LIVE_MODEL=1 pnpm eval:golden --limit 10` runs an explicitly opted-in
live-model evaluation through the unchanged runner and synthetic Core. A reviewed
Markdown KB and an environment API key are required. See the [measurement report](../../docs/evals/golden-set-step3.md)
for input isolation, strict lexical scoring, observability limits, per-category
coverage and the currently blocked smoke/full runs. Offline correctness is not
seven-day true resolution; this harness does not enable production delivery.

## Semantic retrieval (step 9)

Chat and embedding configuration are independent. The comparable live eval uses
`MODEL_PROVIDER=sub2api MODEL_ID=gpt-6-luna` and the wrapper below for chat.
Embeddings use `EMBEDDING_PROVIDER=openai EMBEDDING_MODEL=text-embedding-3-small`
and **the official OpenAI key from the environment**, only against
`https://api.openai.com/v1/embeddings`. Future builds/runs require
`OPENAI_API_KEY` in the process environment; never put it in a file. Embeddings
are opt-in; existing offline mocks retain lexical retrieval. No automatic
fallback from a failed semantic request to permissive lexical admission exists.

After changing `knowledge/`, rebuild the ignored content-fingerprinted index:

```sh
pnpm build
EMBEDDING_PROVIDER=openai EMBEDDING_MODEL=text-embedding-3-small node --import tsx scripts/build-kb-index.ts
EMBEDDING_PROVIDER=openai EMBEDDING_MODEL=text-embedding-3-small node --import tsx scripts/calibrate-kb-retrieval.ts
MODEL_PROVIDER=sub2api MODEL_ID=gpt-6-luna GOLDEN_LIVE_MODEL=1 EMBEDDING_PROVIDER=openai EMBEDDING_MODEL=text-embedding-3-small /home/hatch/workspace/run-with-sub2api-key.sh pnpm eval:golden --limit 10
```

The build embeds canonical returned excerpts (title + heading + up to 800 excerpt
characters), batches 32 passages per request, and stores vectors in
`.kb-index/passages.json` (override `KB_INDEX_PATH`). Loading rejects a changed
corpus/model or invalid vectors. The Core knowledge adapter implements the same
domain port; no business logic calls a provider HTTP client. Rank is cosine plus
`0.02 / (lexical rank + 1)` for the lexical top eight. The agent's host-supplied
semantic relevance port admits returned passages only at cosine **0.40** against
the original customer prompt, independently of the model's search wording. Semantic search itself uses the first
300 characters of that original prompt and returns eight candidates, avoiding
model query drift before admission; admission scores the full prompt.
Only exact returned excerpts can be admitted; unknown passages score -1.

The checked-in calibration script projects the golden data to IDs and customer
problems only; it never uses expected points or staff answers. Six unrelated
controls and manual inspection of customer-problem/passage pairs set the
threshold. This is an empirical relevance heuristic, not a semantic proof of an
answer or account authority. Vague/in-domain-but-unsupported questions can still
match generic documentation. Exact excerpt/citation checks, no writes, fresh
ownership checks, tool validation and deterministic handoff continue to apply.

Official API reference: [OpenAI embeddings guide](https://developers.openai.com/api/docs/guides/embeddings). The account probe, rather than documentation alone, established model access.
