# Golden eval semantic scoring

`pnpm eval:golden` reports `semanticSummary` as its primary result. The
harness uses the step 10 rubric (`step10-v1`) and gpt-6.1-sol via sub2api.
The judge sees the customer problem, delivered answer, expected points,
and staff resolution. The answer generator sees only the opening customer
messages. The judge accepts paraphrases, credits a partial answer when it
covers at least one complete point but misses another, and grades any
contradiction as wrong.

A successful required handoff is correct. An unexpected handoff or a delivered
answer when handoff was required is wrong. Agent errors and unresolved judge
errors appear as unscored. The harness attempts each failed judgment up to
three times. Each summary reports correct, partial, wrong, and unscored
counts. The correct rate divides correct by scored items, including scored
handoffs. Use the coverage counts alongside the rate when comparing runs.
The strict normalized whole-point match remains under `lexicalDiagnostic`.

## Answerability

Classify each item from the opening customer messages, expected points, staff
resolution, and source KB before running the agent. Use the materials that would
be available to the synthetic harness, regardless of what its search happens to
retrieve.

- **Docs-answerable.** The KB supports the required answer using the facts in
  the opening messages. A general policy, a documented troubleshooting step,
  or a documented rule for routing to staff can qualify.
- **Needs account state.** At least one required point depends on real state
  unavailable to the synthetic harness, such as the customer's actual logs,
  invoice status, expiration date, assigned address, or the result of a staff
  action. This label takes precedence when the reference mixes such a point
  with documented guidance.
- **KB gap.** The reference can be answered without account state but the KB
  lacks or contradicts a required point. This includes historical policy that
  conflicts with current documentation.

The initial manifest records a conservative review of the current golden set
against the local source KB. It assigns 13 items to docs-answerable, 102 to
needs-account-state, and 60 to KB gap. These are classification counts. The
scores for each group in `byAnswerability` use the same rubric and denominator
rules as the overall score, which includes every group. The source KB may
contain articles missing from the search index.

The manifest stores only the dataset SHA-256 and one-based row positions.
When the dataset changes, review it and provide a matching manifest of the same
shape with `GOLDEN_ANSWERABILITY_PATH`. A digest mismatch places the selected
rows in `unclassified` while preserving the overall score. Revisit labels when
the KB changes. `--limit` scores the selected prefix with the same labels.

The private golden set is read from
`~/workspace/coffee-host-golden/golden_set.json` by default, or from
`GOLDEN_SET_PATH`. Live golden runs require `GOLDEN_LIVE_MODEL=1` and
the configured answer provider's credentials. The semantic judge uses
`SUB2API_API_KEY` independently of the answer provider. `pnpm run eval:mock`
runs the offline support checks.

Use `--ids GS-001,GS-002` to evaluate exactly those items in the listed order.
Transient failures such as `TimeoutError` and `AbortError` can trigger up to
three attempts per item, with backoff between attempts.

After an interruption, rerun with the same dataset, model, and retrieval
settings and pass the path to the running checkpoint:

```sh
pnpm run eval:golden --resume eval-results/<result-file>.json
```

Replace `<result-file>` with the actual filename. The eval keeps the original
item selection, skips scored rows, and retries saved rows with no semantic
verdict before evaluating new items. It atomically updates the same file after
each row and leaves it resumable if any verdict is still missing. For a run
started with `--ids`, the checkpoint records the full selection. If you supply
`--ids` or `--limit` on resume, it must match the checkpoint's selection. Use
only one process per checkpoint.
