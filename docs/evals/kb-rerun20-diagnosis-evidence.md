# Rerun 20 diagnosis evidence

The primary source is the final clean checkpoint in the gitignored `eval-results/` directory. The table maps the local logs under `~/workspace/tmp/rerun20/` to checkpoints in `eval-results/`. This checkout has named logs at the root of the temporary directory.

| Sample | Log | Checkpoint |
|---|---|---|
| Routing repeat 1 | `routing-1.log` | `golden-2026-11-24T04-02-03-003Z-2.json` |
| Routing repeat 2 | `routing-2.log` | `golden-2026-11-24T04-06-27-536Z-2.json` |
| Standard timeout arm | `timeout-baseline.log` | `golden-2026-11-24T04-08-26-494Z-2.json` |
| Luna timeout arm | `timeout-luna.log` | `golden-2026-11-24T04-15-04-193Z-2.json` |
| Narrow timeout arm | `timeout-narrow.log` | `golden-2026-11-24T04-21-08-477Z-2.json` |
| Stability repeat 1 | `stability-1.log` | `golden-2026-11-24T04-27-48-339Z-6.json` |
| Fix 4 repeat 1 | `fix4-1.log` | `golden-2026-11-24T04-32-58-037Z-1.json` |
| Stability repeat 2 | `stability-2.log` | `golden-2026-11-24T04-34-27-709Z-6.json` |
| Fix 4 repeat 2 | `fix4-2.log` | `golden-2026-11-24T04-39-31-338Z-1.json` |
| Final clean | `full-clean.log` | `golden-2026-11-24T04-40-33-409Z-13.json` |
| Final fix 4 | `full-fix4.log` | `golden-2026-11-24T04-54-50-415Z-1.json` |

## Final checkpoint traces

| Item | Answer attempts (s) | Retrieved / admitted spans | Citation / completeness | Outcome |
|---|---:|---:|---|---|
| GS-018 | 60.2 / 60.0 / 60.0 | 8 / 17 on each | Not reached | Unscored, three timeouts |
| GS-023 | 45.5 | 24 / 31 | Passed / passed | Correct |
| GS-030 | 58.8 | 21 / 28 | Passed / passed | Partial |
| GS-049 | 35.8 | 8 / 9 | Passed / passed | Correct |
| GS-053 | 35.9 | 8 / 26 | Passed / passed | Partial |
| GS-056 | 26.6 | 11 / 21 | Passed / failed | Wrong, handoff |
| GS-062 | 31.7 | 18 / 30 | Passed / failed | Wrong, handoff |
| GS-084 | 29.6 | 8 / 9 | Passed / passed | Correct |
| GS-094 | 58.3 | 8 / 18 | Passed / passed | Correct |
| GS-108 | 39.6 | 8 / 19 | Passed / passed | Correct |
| GS-140 | 41.2 | 8 / 19 | Passed / passed | Partial |
| GS-163 | 34.0 | 8 / 13 | Passed / passed | Correct |
| GS-166 | 36.8 | 10 / 24 | Failed / passed | Wrong, handoff |

The checkpoint saved all 13 rows and reports 12 scored. Its status remains `running` with GS-018 unscored after retries. Attempt time excludes judging and retry backoff.

## GS-062 live and replay

| Sample | Policy sources admitted | Routing / no-speedup / distinction in replay | Live result |
|---|---|---|---|
| Routing repeat 1 | Both | No completed answer | Three timeouts before gates |
| Routing repeat 2 | Both | Pass / pass / pass | 36.2 s, both gates passed, synthetic log 404, staff marker overridden, correct delivery |
| Final clean | Both | Pass / pass / fail | 31.7 s, citations passed, completeness failed, staff marker retained, wrong lifecycle |

Both sources are `store/discord.md` and `store/services/duplicate-tickets.md`. The final draft says 「一般支持工单不处理产品售后问题」. That sentence names both routes but its exclusion verb falls outside the same-sentence contrast pattern in `answerCompletenessCheck`. The adjacent-sentence path has its own list of distinction cues and does not rescue this draft. The handoff-content judge credited all three points in the final draft. The replay isolates the predicate result for the saved inputs. The targeted delivery is the only live pass. See [rerun 20 replay analysis](kb-rerun20.md) and the [existing routing controls](../../scripts/test/vercel-agent.test.ts#L934).

## Timeout evidence

The standard targeted arm and scratch narrower arm each timed out on all three attempts per item. Standard model calls consumed 58.25–59.72 s per attempt and narrower model calls consumed 58.27–59.60 s. The scratch arm reduced tool counts on two GS-018 attempts. GS-030 reached the deadline on the second model call before the step-three restriction could affect tool use.

| Standard loop sample | GS-018 | GS-030 |
|---|---|---|
| Luna targeted | Two timeouts, then 58.4 s partial. 17 admissions, one search and eight article reads on delivery. | One timeout, then 49.0 s partial. 28 admissions and the same tool counts as standard targeted. Model calls 3.80 + 15.99 + 28.88 s. |
| 6.1-sol final clean | Three timeouts with 17 admissions and only search/article reads. Model-call totals 58.70 / 59.58 / 59.53 s. | 58.8 s partial on first attempt. 28 admissions and same tool counts as targeted baseline. Model calls 4.74 + 51.63 s. |

Luna GS-018 separated upload failure from server-side mod loading and suggested SFTP if panel upload kept failing. The judge wanted the panel upload connection checked first. Both delivered GS-030 answers gave cache flush and retry guidance and suggested Google DNS without explaining the faster updates. The final 6.1-sol answer also covered automatic route switching, which the Luna judge marked missing. The serial sample order and provider-inclusive call timings leave the cause of the timing difference unresolved.

## Stability and corpus control

| Item | Clean repeat 1 | Clean repeat 2 | Final clean |
|---|---|---|---|
| GS-023 | Partial, 48.4 s | Correct, 51.2 s | Correct, 45.5 s |
| GS-084 | Correct, 28.8 s | Correct, 29.7 s | Correct, 29.6 s |
| GS-094 | Correct, 42.5 s | Correct, 33.0 s | Correct, 58.3 s |
| GS-108 | Correct, 36.6 s | Correct, 38.7 s | Correct, 39.6 s |
| GS-163 | Correct, 53.8 s | Correct, 38.0 s | Correct, 34.0 s |
| GS-056 | Handoff, 22.9 s | Handoff, 25.2 s | Handoff, 26.6 s |

GS-023 repeat 1 passed with ten exact citation matches, but the judge only partly credited rejoin. Repeat 2 passed with nine exact matches and explicitly tied rejoin to normal DNS. Both targeted GS-094 drafts had seven exact citation matches and gave Startup Settings → 26.3, then Settings → Reinstall Server. All rows in the stability table completed their first attempts.

Fix 4 expanded the admitted settings span and delivered both restart and world-reset claims in all three samples at 56.0, 21.9 and 24.8 s. Clean withheld those claims in all three samples. The answering model, judge and deadline match across the corpus arms.

## GS-140, GS-166 and retention

GS-140 was partial in both routing repeats (46.1 and 31.5 s) and final clean (41.2 s). All three admitted 19 spans and neither policy article. All three overrode the staff marker. The drafts received credit for after-sales and no-speedup advice, while explicit waiting for technical staff remained missing.

GS-166 reached the gate after model calls of 8.25 and 27.68 s. The checkpoint records `excerpt_mismatch` for `[panel/manage/upload.md:6-30]` and `[panel/common/sftp.md:1-47]`. Completeness was true and the citation check recorded zero matches. The handoff-content judge credited SFTP for large files or folders, flagged the categorical claim that folders cannot be uploaded directly, and marked destination by file type missing. The checkpoint marks the reference conflict uncertain and records no owner-confirmed current KB passage.

GS-049 remained correct under current references and GS-053 remained partial. Their results do not adjudicate the retention or restoration policy. The owner decisions listed in the prior diagnosis remain open. See [rerun 19 retention evidence](kb-rerun19-diagnosis-evidence.md#gs-049-gs-053-and-gs-056).
