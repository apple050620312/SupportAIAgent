# Golden set: Vercel loop, step 3

## Run status — 2026-11-07

**Blocked, not measured.** Explicit-live smoke (10 items) and full (175 items)
preflights both refused to make model calls: neither `SUB2API_API_KEY` nor
`OPENAI_API_KEY` is available, and the default reviewed `knowledge/` corpus is
absent. No endpoint compatibility, latency, cost or quality has been measured.
No model output exists to quote as a real failure. Do not interpret the missing
scores as zero scores or treat all items as handoffs. Raw blocked-run records
are under gitignored `eval-results/`; they contain zero per-item results.

| Run | Selected | Executed | Resolved-correct | Handoff-correct | Partial | Wrong |
| --- | ---: | ---: | --- | --- | --- | --- |
| Smoke | 10 | 0 | N/A | N/A | N/A | N/A |
| Full | 175 | 0 | N/A | N/A | N/A | N/A |

True resolution means **no reopen within seven days**. This static set cannot
observe that outcome: true-resolution rate/estimate is **not identifiable**.
The harness reports a separate offline proxy, resolved-correct / all evaluated
items, never counting correct staff handoff as autonomous resolution. Even a
perfect offline answer is not evidence of a completed operation or no reopen.
The set is selected for clear historical resolutions and is not the full ticket
population; extrapolation would also introduce selection bias.

## Reproduce

Set keys securely in the shell environment, and point `SUPPORT_KNOWLEDGE_ROOT`
at an absolute directory containing reviewed customer-safe Markdown. Do not
create a KB from held-out staff answers/expected points. No `.env` files are
loaded automatically. The golden file remains outside this repository.

```sh
# Optional: export GOLDEN_SET_PATH=/absolute/path/to/golden_set.json
GOLDEN_LIVE_MODEL=1 pnpm eval:golden --limit 10
GOLDEN_LIVE_MODEL=1 pnpm eval:golden
```

Default execution refuses live calls, even if a key is present. Missing KB also
blocks: evaluating against synthetic recovery text or an empty corpus would not
measure hosting-answer quality. Model is `gpt-6.1-sol`, sub2api Responses endpoint
`https://sub2api.coffeehost.net/v1`; no fallback. Each item runs serially in a fresh
synthetic Core/ticket harness and isolated temporary history, deleted afterwards.
Status data is synthetic, invoice/log ports are unavailable: this is not a test
of real account-state diagnosis. The unchanged loop enforces its four T0 tools,
temperature 0.2, ten-step limit, existing timeouts and KB/citation gate.

Input is `customer_problem`, followed by customer messages before the first
non-customer conversation message, omitting exact duplicates of the problem.
No staff/bot answers or later customer turns are fed to the loop. Over-6000-char
inputs fail as errors; no silent truncation. Expected points, historical outcome,
category and resolution summaries never enter the model prompt. Categories are
used only for aggregation; their known imprecision is preserved.

## Scoring and observability

Each expected point must occur **in full** in the delivered answer after NFKC,
lowercasing, and punctuation/space removal. Coverage is matching points / total
points. All points plus no handoff/error is resolved-correct; positive incomplete
coverage without handoff/error is partial; zero coverage, unexpected handoff or
runtime failure is wrong. For historical handoff items, only successful Core
handoff with no turn error is correct: the shipped loop replaces any draft with
its fixed non-confident staff-handoff reply. Resolved-correct and partial rates
use the historical resolved denominator; handoff-correct uses the historical
handoff denominator. Counts retain errors in the denominator.

This strict lexical rule can reject valid paraphrases, cannot detect negation or
contradictions, and cannot judge equivalent Chinese expressions or factual truth.
Partial point coverage is not a pass. Historical case-specific compensation,
quotes or backend work may be impossible from the initial question/read-only
permissions; their failure is retained rather than inventing actions or leaking
answers into input. Limitation explanations are scored by the same points.

Raw results include delivered text, model draft text, matched-point flags,
lifecycle handoff, per-item elapsed time, model generation attempts (including
failed attempts), Core HTTP tool errors and runner errors. Average steps is the
average model generation-attempt count, not a hidden reasoning count. The SDK's
provider exceptions are deliberately not serialized. The loop internally swallows
some provider/tool failures: their exact cause is unavailable and must not be
inferred from a handoff. Price is not supplied by the endpoint instrumentation;
cost remains null rather than guessed.

`citationGateViolation` checks a delivered non-handoff answer for an exact
retrieved excerpt and its source/line citation. Drafts rejected by the loop remain
raw diagnostic output. **Semantic support is unassessed**: the existing gate
requires one supported excerpt, not evidence for every assertion. It cannot
identify an unrelated extra claim, a misleading citation or every hallucination.
A zero gate-violation rate must never be advertised as zero hallucinations.
Manual/semantic claim-to-passage assessment is still needed.

## Per-category coverage (full set, unexecuted)

Rates below are unavailable, not zero. R = resolved-correct / historical resolved;
H = handoff-correct / historical handoff; P = partial / historical resolved.

| Category | N | Resolved | Handoff | R | H | P | Offline resolution proxy |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| account_access | 8 | 8 | 0 | N/A | N/A | N/A | N/A |
| billing_other | 6 | 5 | 1 | N/A | N/A | N/A | N/A |
| billing_payment | 11 | 10 | 1 | N/A | N/A | N/A | N/A |
| billing_question | 3 | 3 | 0 | N/A | N/A | N/A | N/A |
| cannot_connect | 19 | 18 | 1 | N/A | N/A | N/A | N/A |
| custom_quote | 6 | 3 | 3 | N/A | N/A | N/A | N/A |
| files_panel | 6 | 6 | 0 | N/A | N/A | N/A | N/A |
| general_other | 9 | 8 | 1 | N/A | N/A | N/A | N/A |
| lag_performance | 11 | 10 | 1 | N/A | N/A | N/A | N/A |
| plan_cancel | 6 | 5 | 1 | N/A | N/A | N/A | N/A |
| plan_upgrade | 8 | 8 | 0 | N/A | N/A | N/A | N/A |
| plugin_mod | 13 | 12 | 1 | N/A | N/A | N/A | N/A |
| pre_sales | 6 | 6 | 0 | N/A | N/A | N/A | N/A |
| purchase_help | 5 | 4 | 1 | N/A | N/A | N/A | N/A |
| refund | 6 | 6 | 0 | N/A | N/A | N/A | N/A |
| server_other | 13 | 10 | 3 | N/A | N/A | N/A | N/A |
| server_start_crash | 22 | 18 | 4 | N/A | N/A | N/A | N/A |
| version_core | 9 | 7 | 2 | N/A | N/A | N/A | N/A |
| world_backup | 8 | 7 | 1 | N/A | N/A | N/A | N/A |

## Findings and deferred work

No loop-quality findings are claimed until live results exist. Dataset inspection
shows why semantic review will matter: GS-001 expects a specific VPS quote and
a later undeliverable-order refund despite initially asking about availability;
GS-002 expects staff backend inspection and a customer retest after an outage,
without a documented backend fix. These are dataset examples, not observed model
failures. A read-only assistant must not pretend to have performed either action.

`pnpm eval:mock` is the step-2 wiring/security baseline (76 tests), not a model
quality comparison and not evidence for any golden-set score. Source/scoring tests
cover answer leakage, normalization, partial scoring, handoff/error treatment and
undefined denominators. No loop tools or permissions were changed.

Live smoke/full execution and a report of actual failure quotes remain blocked
on the two missing prerequisites above. Shadow mode, tracing and a durable staff
approval queue remain later steps. Discord, production provider adapters, new
storage services and writes are outside this step.

## Validation

`pnpm build` (also executed by `pnpm test`), `pnpm typecheck`, `pnpm test`
(306 script tests plus 56 Support Core tests), `pnpm lint`, and `pnpm eval:mock`
(76 tests) passed. Explicit-live smoke/full preflights exited nonzero as designed
for absent key and KB; no billable model calls were attempted.
