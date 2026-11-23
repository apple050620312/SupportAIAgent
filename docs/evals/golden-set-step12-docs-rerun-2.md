# Step 12 docs-answerable subset rerun

The exact 13-item docs-answerable subset was rerun on 2026-11-23 with `gpt-6.1-sol` through sub2api and the official OpenAI `text-embedding-3-small` index. The command selected the requested IDs with `--ids`, and the run completed successfully.

| Item | Baseline | Rerun |
| --- | --- | --- |
| GS-018 | unscored | wrong |
| GS-023 | wrong | wrong |
| GS-030 | wrong | wrong |
| GS-049 | partial | wrong |
| GS-053 | wrong | wrong |
| GS-056 | wrong | wrong |
| GS-062 | wrong | wrong |
| GS-084 | wrong | wrong |
| GS-094 | partial | wrong |
| GS-108 | wrong | wrong |
| GS-140 | wrong | wrong |
| GS-163 | wrong | correct |
| GS-166 | wrong | wrong |

The step-12 baseline totals were 0 correct, 2 partial, 10 wrong, and 1 unscored. Its checkpoint records 8 handoffs among the 13 selected items. The rerun totals were 1 correct, 0 partial, 12 wrong, and 0 unscored. Its checkpoint records 12 handoffs among the 13 selected items.

GS-163 is the only improved item, changing from wrong to correct. GS-018 moved from unscored to wrong. GS-049 and GS-094 moved from partial to wrong. All other items remained wrong. The semantic checkpoint labels all 13 items as `docs-answerable`, confirming the answerability-label fix.

The rerun checkpoint is `eval-results/golden-2026-11-23T10-53-02-770Z-13.json`. The step-12 baseline checkpoint is `eval-results/golden-2026-11-23T07-13-56-915Z-175.json`.
