# Step 12 docs-answerable subset rerun 3

The 13 docs-answerable items were rerun on 2026-11-23 after the five step-12 fixes, using `gpt-6.1-sol` through sub2api, official OpenAI `text-embedding-3-small`, the existing 557-passage and 64-article index, and the required 60-second item deadline.

| Metric | Clean rerun 2 | Rerun 3 | Change |
| --- | ---: | ---: | ---: |
| Correct | 1 | 0 | -1 |
| Partial | 0 | 0 | 0 |
| Wrong | 12 | 13 | +1 |
| Unscored | 0 | 0 | 0 |
| Handoff | 12 | 13 | +1 |

The primary score is lifecycle-based. Rerun 3 scored every item wrong because every item handed off. This is a regression from rerun 2, with one fewer correct answer and one additional handoff. The semantic and lifecycle score therefore shows no measurable improvement from the five fixes on this subset.

| Item | Rerun 2 | Rerun 3 | Change |
| --- | --- | --- | --- |
| GS-018 | wrong | wrong | unchanged |
| GS-023 | wrong | wrong | unchanged |
| GS-030 | wrong | wrong | unchanged |
| GS-049 | wrong | wrong | unchanged |
| GS-053 | wrong | wrong | unchanged |
| GS-056 | wrong | wrong | unchanged |
| GS-062 | wrong | wrong | unchanged |
| GS-084 | wrong | wrong | unchanged |
| GS-094 | wrong | wrong | unchanged |
| GS-108 | wrong | wrong | unchanged |
| GS-140 | wrong | wrong | unchanged |
| GS-163 | correct | wrong | regressed |
| GS-166 | wrong | wrong | unchanged |

The previous rerun's GS-163 correct result did not reproduce. The earlier rerun's GS-018, GS-049, and GS-094 labels were already wrong in its report, so they did not move in this comparison.

## Target-5 diagnostics

All 13 drafts were handed off. The independent handoff-content judge found 2 substantively correct drafts, 5 partial drafts, and 6 wrong drafts. The correct-content drafts were GS-108 and GS-163. The partial drafts were GS-018, GS-030, GS-049, GS-053, and GS-094. These content verdicts are diagnostic and do not replace the lifecycle score. In particular, the two correct handoff drafts still count as wrong because the lifecycle outcome was a handoff.

There were 13 citation-gate attempts. One passed, on GS-084. Twelve failed. The failures occurred on handoffs and generally involved excerpt mismatch, wrong lines, truncated excerpts, or ungrounded citations. GS-084's gate passed even though its handoff content was judged wrong. The gate result therefore did not translate into a correct lifecycle outcome in this run.

All 13 items carried `referenceConflict: uncertain`, with the recorded reason that no owner-confirmed current-KB passage was available. This is diagnostic metadata, not an additional scoring category.

The event logs show optional read failures before many handoffs. `/v1/me/server-logs` returned HTTP 404 on GS-018, GS-023, GS-030, GS-049, GS-053, GS-056, GS-062, GS-108, and GS-140. `/v1/me/invoice` returned HTTP 403 on GS-018, GS-049, and GS-053. GS-084, GS-094, and GS-166 had no tool errors. GS-163 had two invalid semantic-judge-output events on its first attempt before the final handoff verdict. These failures remain visible in the event log, while the gate policy allowed a grounded draft to proceed to handoff.

The five fixes produced diagnostic evidence that some handoff drafts contain useful guidance, including two substantively correct drafts and five partial drafts. The primary lifecycle metric regressed from 1 correct and 12 handoffs to 0 correct and 13 handoffs, so the fixes did not improve the docs subset's measured resolution performance. The content-verdict improvement is therefore limited to diagnostics and cannot be reported as a primary-score gain.

The completed checkpoint is `eval-results/golden-2026-11-23T12-21-23-601Z-13.json`. The comparison baseline is `eval-results/golden-2026-11-23T10-53-02-770Z-13.json`.
