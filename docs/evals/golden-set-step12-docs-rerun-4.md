# Step 12 docs-answerable subset rerun 4

The 13 docs-answerable items were rerun on 2026-11-23 after the citation-gate relaxation, using `gpt-6.1-sol` through sub2api and the official OpenAI key for the configured embedding path. The completed checkpoint is `eval-results/golden-2026-11-23T12-43-22-696Z-13.json`.

| Metric | Clean baseline | Rerun 3 | Rerun 4 | Change vs rerun 3 |
| --- | ---: | ---: | ---: | ---: |
| Correct | 1 | 0 | 1 | +1 |
| Partial | 0 | 0 | 1 | +1 |
| Wrong | 12 | 13 | 11 | -2 |
| Unscored | 0 | 0 | 0 | 0 |
| Handoff | 12 | 13 | 8 | -5 |

The primary semantic score improved from rerun 3's 0 correct, 0 partial, and 13 wrong to 1 correct, 1 partial, and 11 wrong. It remains below the clean baseline's 1 correct, 0 partial, and 12 wrong when partial and wrong outcomes are considered together. The rerun therefore shows a measurable improvement after the gate fix, with remaining answer-quality failures.

| Item | Clean baseline | Rerun 3 | Rerun 4 | Change vs rerun 3 |
| --- | --- | --- | --- | --- |
| GS-018 | wrong | wrong | wrong | unchanged |
| GS-023 | wrong | wrong | wrong | unchanged |
| GS-030 | wrong | wrong | wrong | unchanged |
| GS-049 | wrong | wrong | wrong | unchanged |
| GS-053 | wrong | wrong | wrong | unchanged |
| GS-056 | wrong | wrong | wrong | unchanged |
| GS-062 | wrong | wrong | wrong | unchanged |
| GS-084 | wrong | wrong | wrong | unchanged semantic verdict |
| GS-094 | wrong | wrong | partial | improved to partial |
| GS-108 | wrong | wrong | wrong | unchanged |
| GS-140 | wrong | wrong | wrong | unchanged |
| GS-163 | correct | wrong | correct | recovered to correct |
| GS-166 | wrong | wrong | wrong | unchanged |

GS-163 is the clearest gate-related recovery. Its rerun-4 draft resolved without handoff and received a correct semantic verdict. The repeated citation pattern that previously caused rerun 3's grounded draft to be discarded now passes because one exact occurrence grounds the citation and the repeated mismatched quote remains diagnostic.

GS-094 resolved without handoff and received a partial semantic verdict. GS-084 also resolved without handoff, but its semantic verdict remained wrong. The other eight items handed off and remained wrong. Handoff-content diagnostics are available in the checkpoint for items that handed off, but they do not replace the lifecycle outcome.

The checkpoint records lexical retrieval for rerun 4 and 64 articles with 557 passages. That differs from rerun 3's recorded OpenAI semantic retrieval metadata, so the semantic result should be interpreted together with this retrieval-mode difference. No citation-gate instrumentation was removed. The checkpoint retains per-attempt gate decisions and final violations.
