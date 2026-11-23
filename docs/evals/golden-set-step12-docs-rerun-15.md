# Rerun 15 — full docs-answerable group

**2026-11-24. 3 correct / 4 partial / 6 wrong / 0 unscored, 3 handoffs.** All 13 items completed in one run, with one attempt each. Clean checkpoint `golden-2026-11-23T20-33-56-444Z-13.json`.

Rerun 15 used `gpt-6.1-sol` via sub2api and the same 60-second per-question deadline. Retrieval used `openai` and `text-embedding-3-small` with index digest `6b7b4b6d68e2` (72 articles / 570 passages).

Rerun 13 scored **4 correct / 4 partial / 5 wrong / 0 unscored, 2 handoffs**. Its checkpoint `golden-2026-11-23T19-17-04-458Z-13.json` records digest `898c35b5b203` (71 articles / 566 passages). Compared with rerun 13, the clean run had one fewer correct answer, one more wrong answer, and one more handoff.

The comparison isolates fixes 1–3 as far as possible. The corpus also changed between runs. The clean index includes the GS-140 duplicate-tickets article and the `upload.md` 100 MB clarification added before rerun 14. Both KB additions are part of the measured difference and were separate from fixes 1–3.

## Per-item results

Cells show the primary semantic verdict, delivery, last citation gate status, `contentCoverage`, and `answerCompletenessAttempts`, in that order.

| Item | Rerun 13 | Rerun 15 | Change vs rerun 13 |
| --- | --- | --- | --- |
| GS-018 | partial / Delivered / passed / false / `[true]` | partial / Delivered / passed / false / `[true]` | — |
| GS-023 | partial / Delivered / passed / true / `[true]` | wrong / Delivered / passed / false / `[true]` | Verdict partial → wrong. Coverage true → false |
| GS-030 | partial / Delivered / passed / true / `[true]` | partial / Delivered / passed / true / `[true]` | — |
| GS-049 | correct / Delivered / passed / true / `[true]` | correct / Delivered / passed / true / `[true]` | — |
| GS-053 | partial / Delivered / passed / false / `[true]` | partial / Delivered / passed / false / `[true]` | — |
| GS-056 | wrong / Delivered / passed / false / `[true]` | wrong / Handoff / passed / false / `[false]` | Delivery Delivered → Handoff. Completeness attempts `[true]` → `[false]` |
| GS-062 | wrong / Delivered / passed / true / `[true]` | wrong / Delivered / passed / true / `[true]` | — |
| GS-084 | correct / Delivered / passed / true / `[true]` | correct / Delivered / passed / true / `[true]` | — |
| GS-094 | correct / Delivered / passed / true / `[true]` | correct / Delivered / passed / true / `[true]` | — |
| GS-108 | correct / Delivered / passed / true / `[true]` | partial / Delivered / passed / true / `[true]` | Verdict correct → partial |
| GS-140 | wrong / Delivered / passed / true / `[true]` | wrong / Delivered / passed / true / `[true]` | — |
| GS-163 | wrong / Handoff / failed / false / `[true]` | wrong / Handoff / passed / false / `[false]` | Gate failed → passed. Completeness attempts `[true]` → `[false]` |
| GS-166 | wrong / Handoff / failed / false / `[true]` | wrong / Handoff / failed / false / `[true]` | — |

## Pass standard

**Failed all four criteria.**

- **GS-163 delivered — fail.** It handed off even though the last citation gate passed.
- **GS-056 at least partial — fail.** It was wrong and handed off.
- **GS-062 at least partial — fail.** It was delivered and scored wrong.
- **No primary verdict regressions — fail.** GS-023 fell from partial to wrong and GS-108 fell from correct to partial.

The superseded run used fixes 1–3 plus the fix 4 sentence. Checkpoint `golden-2026-11-23T20-17-56-803Z-13.json` recorded digest `04003b9bec889`, 2 correct / 3 partial / 8 wrong, and 4 handoffs (GS-018, GS-056, GS-094, GS-163). Against the verified rerun 13 baseline, GS-018 fell from partial to wrong, and GS-049 and GS-094 fell from correct to wrong. That run also failed the pass standard. It was discarded because its index digest did not match the intended clean corpus and its draft used the wrong baseline.
