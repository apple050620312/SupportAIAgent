# Step 12 docs-answerable subset rerun

The 13-item subset was run on 2026-11-23 with the Step 12 fixes, `gpt-6.1-sol` through sub2api, and the official OpenAI `text-embedding-3-small` index. The harness selected the exact requested IDs with `--ids`.

| Item | Baseline | Rerun |
| --- | --- | --- |
| GS-018 | unscored | wrong |
| GS-023 | wrong | wrong |
| GS-030 | wrong | wrong |
| GS-049 | partial | unscored |
| GS-053 | wrong | wrong |
| GS-056 | wrong | wrong |
| GS-062 | wrong | wrong |
| GS-084 | wrong | wrong |
| GS-094 | partial | wrong |
| GS-108 | wrong | wrong |
| GS-140 | wrong | wrong |
| GS-163 | wrong | unscored |
| GS-166 | wrong | wrong |

The baseline subset totals were 0 correct, 2 partial, 10 wrong, and 1 unscored. The rerun totals were 0 correct, 0 partial, 11 wrong, and 2 unscored. Baseline handoff count was 8 of 13 and rerun handoff count was 10 of 13.

None of the fixes visibly improved a scored item. GS-049 changed from partial to an unscored model-error result, and GS-094 changed from partial to wrong. GS-049 and GS-163 were unscored in the rerun. GS-018 went from unscored to wrong. The rerun therefore shows no measurable docs-subset gain from these fixes.

The run artifact is `eval-results/golden-2026-11-23T10-31-36-243Z-13.json`. Its row labels use positions within the subset instead of positions in the full dataset. All 13 items belong to the docs-answerable group.
