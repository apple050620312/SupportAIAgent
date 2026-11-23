# Step 12 docs subset rerun 12 — KB rerun-11 fixes

Two live runs on the same 6 items (GS-023, GS-056, GS-084, GS-108, GS-140, GS-166),
`gpt-6.1-sol` via sub2api, semantic retrieval (`openai`, `text-embedding-3-small`,
digest `898c35b5b203…`, 71 articles / 566 passages). Baseline for these 6 items in
rerun 11: 0 correct / 0 partial / 6 wrong, handoff 4.

## Run 1 — after the 5 diagnosis fixes

Checkpoint `eval-results/golden-2026-11-23T18-42-05-435Z-6.json`.
Headline: **0 correct / 1 partial / 5 wrong / 0 unscored, handoff 5**.

| Item | Verdict | Delivery | Gate | Coverage | Note |
| --- | --- | --- | --- | --- | --- |
| GS-023 | Partial | Delivered | Pass | True | DNS flush + Google DNS covered (2/3 points) — fix 1 worked |
| GS-056 | Wrong | Handoff | Pass | False | Reinstall passage never admitted; draft still warns against reinstall |
| GS-084 | Wrong | Handoff | Pass | False | Draft content correct (handoffContentVerdict correct), gate fixed — but the new 0.20 reflection threshold blocked it |
| GS-108 | Wrong | Handoff | Fail | True | Gate failed on 3× missing_citation (startup.md quotes without citations); marker retained is not the cause this run |
| GS-140 | Wrong | Handoff | Fail | True | Support-flow passage never admitted; draft still installer troubleshooting |
| GS-166 | Wrong | Handoff | Pass (after repair) | False | SFTP passage admitted and cited; draft partial (2/3 points) — but the reflection threshold blocked it |

## Three defects found by measuring run 1

1. **Fix 5's 0.20 reflection threshold is too blunt as a delivery gate.**
   The admitted list is inflated with companions (20–36 entries, mostly irrelevant),
   so a correct draft legitimately uses 1–2 passages. GS-084 (correct draft) reflected
   1/7 distinct passages (0.14) and GS-166 (partial draft) likewise fell below 0.20,
   so both were handed off despite passing the gate. The threshold replaces the gate
   as the "good draft discarded" trigger instead of removing it.
2. **Fix 2's reinstall symptom regex misses the actual GS-056 prompt.**
   The prompt is「我剛剛把資料全刪了 會影響嗎」— the regex required the literal
   「刪除」, but the prompt says「全刪了」. The checkpoint eventLog shows a single
   knowledge/search call: the focused search never fired, settings.md never admitted.
3. **GS-108 is blocked by missing_citation, not by the marker.**
   The draft quoted `panel/config/startup.md:10-13, 14-17, 18-21` verbatim without
   citations. Fix 4's marker change was never exercised because the gate failed first.

Also established from the prompt construction (`inputFor` feeds only the
customer_problem plus leading customer messages, stopping at the first staff
message): **GS-140 has no support-flow cue in its prompt at all** — the
duplicate-ticket / after-sales / wait-for-reply points appear only in the staff
replies, which are never fed. No prompt-cued focused search can fire for this
item, and the KB has no passage stating "duplicate tickets do not accelerate
handling". GS-140's support-flow points are structurally unanswerable in the
eval as designed; in production the agent would see the ticket context.

## Follow-up repairs (same branch)

- `6deb003` — split `answerComplete` (delivery gate: the pre-fix-5 conditions)
  from `contentCoverage` (diagnostic: old conditions AND reflection ≥ 0.20).
  Low-reflection drafts can now deliver; the checkpoint still records
  `contentCoverage=false` as the diagnostic.
- `d127b79` — `hasReinstallSymptom` now matches「資料全刪」(`資料.{0,12}刪`),
  so the GS-056 prompt triggers the focused settings retrieval.
- `c2a8d0b` — citation-gate repair extended: when the only blocking failures are
  `missing_citation`, append the admitted citation label after each standalone exact
  quote and re-validate; adopted only if the gate then passes. `unknown_citation`
  still blocks.

Full verification on the final head (`c2a8d0b`): build, typecheck,
406 + 56 tests, eval:mock 76, lint — all green.

## Run 2 — after the follow-up repairs

Checkpoint `eval-results/golden-2026-11-23T19-07-16-986Z-6.json`.
Headline: **1 correct / 2 partial / 3 wrong / 0 unscored, handoff 0** — all 6 delivered.

| Item | Verdict | Delivery | Gate | Coverage | Note |
| --- | --- | --- | --- | --- | --- |
| GS-023 | Partial | Delivered | Pass | False | DNS flush + Google DNS covered; rejoin-when-DNS-normal still missing; coverage=false is now diagnostic only |
| GS-056 | Wrong | Delivered | Pass | False | settings.md:1-14 admitted (regex fix worked) — but the draft still does not state world reset or the reinstall steps |
| GS-084 | Correct | Delivered | Pass | True | Wrong → correct. Gate fix + coverage split both confirmed |
| GS-108 | Partial | Delivered | Pass | True | Wrong → partial. Marker present but overridden (fix 4 exercised); gate passed this run — the model cited the startup passages itself, so the missing-citation repair was not triggered live (covered by unit tests only) |
| GS-140 | Wrong | Delivered | Pass | True | Gate passed, marker overridden; content still installer troubleshooting, all 3 support-flow points missing (see structural note above) |
| GS-166 | Wrong | Delivered | Pass (after repair) | False | SFTP + folder drag covered (2/3 points); wrong on the 100MB threshold — the judge expects the historical 10MB, current KB says 100MB; needs owner adjudication |

## Comparison

| | Correct | Partial | Wrong | Unscored | Handoff |
| --- | --- | --- | --- | --- | --- |
| Rerun 11 (these 6) | 0 | 0 | 6 | 0 | 4 |
| Rerun 12 run 1 | 0 | 1 | 5 | 0 | 5 |
| **Rerun 12 run 2** | **1** | **2** | **3** | **0** | **0** |

No primary verdict regressed at any step. Improvements: GS-023 wrong → partial,
GS-084 wrong → correct, GS-108 wrong → partial; handoffs 4 → 0.

## Still wrong

- **GS-056** — retrieval supply now works (settings.md admitted), but the model
  still does not use the passage: no world-reset statement, no reinstall steps.
  Next target is evidence use, not retrieval.
- **GS-140** — structurally unanswerable in the eval (no prompt cue, no KB source
  for the duplicate-ticket policy). Needs either owner-written KB content for the
  duplicate-ticket policy or an eval-side decision; do not hack a symptom for it.
- **GS-166** — 100MB (current KB) vs 10MB (historical staff answer) conflict.
  Needs owner adjudication before any KB wording change.
