# Golden set docs rerun 24

Rerun 24 scored **2 correct, 2 partial, 9 wrong and 0 unscored** on the 13 clean items, with **9 scored handoffs**. Rerun 23 scored 0 correct, 1 partial, 1 wrong and 11 unscored. The clean run recorded **0 verifier HTTP 400s and 2 review timeouts**. [Rerun 23](kb-rerun23.md) · [Rerun 23 diagnosis](kb-rerun23-diagnosis.md)

The scheduled revision was `b8d1554`. The serial runner used `gpt-6-luna` through sub2api with Fast requested. The draft effort was max, with medium pinned for the scheduled GS-030 experiment. Review requested `gpt-6.1-sol` at low effort with the 900-token cap. The independent judge requested `gpt-6.1-sol` under `step10-v1`. Each attempt had at most 60 seconds, including review and delivery. Ticket sessions and account reads were synthetic. The runtime restart interrupted sample 4. The resume kept the clean run, samples 2 and 3, and sample 4 GS-018.

## Corpus

The settings article was backed up to `~/workspace/fix4-settings.md` with 「世界已被重置」 present. The clean settings article was restored, checked for the absence of that sentence and indexed with official OpenAI `text-embedding-3-small` embeddings before the scheduled run. The active passages and the clean index matched again at resume. After the clean controls, the settings backup was restored. The fix-4 index was rebuilt with the same official embeddings and verified against the restored passages before the five GS-056 runs.

| Corpus | Articles / passages | Digest |
|---|---:|---|
| Clean full run and controls | 72 / 570 | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| Fix 4, targeted GS-056 | 72 / 570 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

## Clean results

| Run | Scheduled | Scored | Correct | Partial | Wrong | Unscored | Handoffs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Rerun 23 Luna | 13 | 2 | 0 | 1 | 1 | 11 | 1 |
| Rerun 24 Luna | 13 | 13 | 2 | 2 | 9 | 0 | 9 |

All 13 items are docs-answerable. Handoff counts refer to scored lifecycle outcomes. The strict lexical diagnostic credited 0/13. The harness took 572.6 s, including judging. [Semantic scoring](../../scripts/lib/semantic-judge.ts)

| Item | Rerun 23 | Rerun 24 | Rerun 24 evidence |
|---|---|---|---|
| GS-018 | Unscored | Wrong / handoff | First review reached its cutoff. On retry, the verifier accepted SFTP as a transfer check and rejected the draft's speculation about the cause. |
| GS-023 | Unscored | Wrong / handoff | Review found the Minecraft reopen step missing after DNS verification. |
| GS-030 | Unscored | Correct | First medium attempt gave automatic switching, the DNS procedure and the faster-update rationale with three matched citations. |
| GS-049 | Partial | Partial | Delivered the cancellation and backup advice and deferred retention. The judge required the provisional retention reference for full credit. |
| GS-053 | Unscored | Wrong / handoff | Review found missing service-selection and checkout steps in the conditional renewal procedure. |
| GS-056 | Wrong / handoff | Wrong / handoff | The clean draft failed with a missing citation. The runner handed off without asserting a reset or recovery outcome. |
| GS-062 | Unscored | Wrong / handoff | The verifier rejected the unconditional screenshot and WinMTR advice for the Minecraft branch. |
| GS-084 | Unscored | Correct | First attempt delivered the cited password-reset path and passed the judge. |
| GS-094 | Unscored | Wrong / handoff | The version and reinstall procedure passed completeness. Review withheld the draft for an unqualified claim about the backup feature. |
| GS-108 | Unscored | Wrong / handoff | The verifier rejected reinstall advice for the missing JAR as phrased. |
| GS-140 | Unscored | Wrong / handoff | Both policy articles were admitted. The draft asked staff to inspect the installer stages and index. Review wanted the wait instruction to explicitly name technical staff. |
| GS-163 | Unscored | Wrong / handoff | The first review timed out. The second rejected the activation and startup wording for claim support. |
| GS-166 | Unscored | Partial | Gave cited Settings and Launch SFTP steps, then WinSCP drag-and-drop. The reply deferred the threshold. The judge wanted a file-type destination point. |

An initial launch at `f21811c` stopped after six checkpointed rows. Its GS-030 medium draft finished in 4.9 s and failed claim support for the DNS step order. GS-023 introduced a separate host diagnostic and GS-018 suggested an unsupported file rename. The revised prompt specifies the documented DNS order, scopes separate host checks to a relevant branch, and keeps the upload advice focused on the transfer and compatibility checks. The six pilot rows include two timeout attempts and zero verifier HTTP 400s. [Draft guidance and passage admission](../../packages/agent-loop/src/index.ts)

## Verification and timeouts

| Group | Attempts | Draft timeouts | Review timeouts | Total timeout attempts | Unscored rows with a timeout | Verifier HTTP 400s |
|---|---:|---:|---:|---:|---:|---:|
| Rerun 23 clean | 22 | 11 | 2 | 13 | 5 | 4 |
| Rerun 24 clean | 15 | 0 | 2 | 2 | 0 | 0 |
| Rerun 24 durability repeats | 30 | 5 | 2 | 7 | 1 | 0 |
| Rerun 24 clean and durability | 45 | 5 | 4 | 9 | 1 | 0 |
| GS-140 trigger off | 1 | 0 | 0 | 0 | 0 | 0 |
| GS-030 max control | 5 | 0 | 0 | 0 | 0 | 0 |
| Fix-4 GS-056 | 8 | 1 | 2 | 3 | 0 | 0 |
| Rerun 24 scheduled total | 59 | 6 | 6 | 12 | 1 | 0 |

The zero-timeout target was missed. GS-140 accounted for all seven durability timeout attempts. Its sample 3 exhausted retries during drafting and was the only scheduled unscored row. The initial pilot and gate replay used separate denominators.

The clean draft traces recorded 14 max attempts and one medium attempt, with `default` returned every time. All 12 clean reviews with model metadata reported `gpt-6.2-sol` through the gateway. Across the scheduled runs, 46 reviews reported that model and six timed-out calls returned no model metadata. [Trace recording](../../scripts/eval-golden.ts) · [Judge request](../../scripts/lib/semantic-judge.ts)

## Gate replay and paraphrases

All four legacy combined ranges failed `wrong_lines`. Rendering the individual admitted spans cleared the range check on GS-062, GS-140, GS-023 and GS-094. The converted GS-140 draft passed. The other three were rejected on claim support after the label change.

| Negative control | Final replay |
|---|---|
| Reversed panel and SFTP guidance | `unsupported_claim` for reversing the supported transfer advice |
| Purported full-span excerpt omitted the reinstall step | `incomplete_answer` for missing Settings → Reinstall |
| Unadmitted upload range | `wrong_lines` before review |
| Unsupported restoration guarantee | `unsupported_claim` for guaranteeing data recovery |
| Missing required procedure point | `incomplete_answer` for missing Settings → Reinstall |

All five negative controls failed for their intended reasons. In the offline replay, the reinstall omission also failed with the R23 verifier's passing flags. The supported version paraphrase passed. The transfer paraphrase failed claim support on the panel-password and third-party-login setup wording. Two cases hit the replay's 30-second review cap and returned verdicts on retry. Across 12 verifier calls, there were zero HTTP 400s. The ten calls with response model metadata reported `gpt-6.2-sol`. [Citation gate](../../packages/agent-loop/src/citation-gate.ts) · [Draft verifier](../../packages/agent-loop/src/draft-verifier.ts)

## GS-140 trigger

All 11 attempts with the trigger enabled admitted both `store/discord.md` and `store/services/duplicate-tickets.md`. The off attempt admitted neither. The figures give first drafting call times in attempt order, including provider wait.

| Sample | Searches / reads per attempt | Spans | Prompt bytes | First calls (s) | Outcome |
|---|---|---:|---:|---|---|
| On, clean | 3 / 5 | 8 | 6,748 | 33.5 | Wrong / handoff, missing explicit wait for technical staff |
| On, sample 2 | 3 / 5 | 8 | 6,748 | 34.1 | Wrong / handoff, missing explicit wait for technical staff |
| On, sample 3 | 3 / 5 | 8 | 6,748 | 45.4 / 47.4 / 47.6 | Unscored, three draft cutoffs |
| On, sample 4 | 3 / 5 | 8 | 6,748 | 34.8 / 47.6 / 47.3 | Wrong / handoff, missing explicit wait for technical staff after review and draft cutoffs |
| On, sample 5 | 3 / 5 | 8 | 6,748 | 45.8 / 43.1 / 35.4 | Correct on attempt three after draft and review cutoffs |
| Off | 1 / 3 | 12 | 8,063 | 24.2 | Wrong / handoff, missing after-sales routing, wait and duplicate-ticket guidance |

The one correct trigger-on reply gave the after-sales route, told the customer to wait for technical staff in the existing ticket and explained that duplicate tickets offer no speedup. The on samples yielded 1/5 correct against the 5/5 target. The single off attempt and cutoff-limited on calls leave the latency effect unresolved. The mock control for an explicit request to inspect live installer state still reaches `HUMAN_NEEDED` with a passing citation gate. [Installer-state test](../../scripts/test/vercel-agent.test.ts#L449)

## Fast route

A pinned Luna max request at 11:05:15 UTC asked for `fast` and returned HTTP 200 with `default` in 2.516 s. The gateway request ID was `eece3360-f532-45b4-bc01-8a66592d771b`. The effective policy, account route and upstream request and response tiers were unavailable. **Fast remains unconfirmed**, so the concurrency benchmark was skipped. All 53 scheduled draft responses with tier metadata reported `default`. Six draft calls returned no tier metadata.

## GS-030 effort experiment

Both arms used the clean corpus, identical recorded admission spans, 4,647-byte prompts, four distinct read windows and a 3,072-token draft cap. The gateway returned `gpt-6-luna` at the requested effort and `default` tier in all ten calls. The control ran serially after the medium samples and replays.

| Pinned effort | First draft calls in sample order (s) | Median draft (s) | Reported reasoning / text tokens | Correct on first attempt | Scored handoffs | Timeout attempts |
|---|---|---:|---|---:|---:|---:|
| Medium | 4.2 / 5.0 / 5.6 / 4.9 / 4.0 | 4.9 | 0 / 182–212 | 3/5 | 2 | 0 |
| Max | 10.6 / 13.9 / 12.3 / 20.1 / 17.8 | 13.9 | 391–1,103 / 186–277 | 3/5 | 2 | 0 |

The two medium handoffs omitted the explicit instruction to reopen Minecraft after DNS verification. The two max handoffs included an escalation when the connection still failed, which the verifier rejected against the cited switching and DNS procedure. Both arms fit the turn budget on all five first attempts. Each missed the five-correct target. The sequential blocks and unconfirmed upstream tier limit the latency comparison. [Pinned effort in the harness](../../scripts/eval-golden.ts)

## Durability

The clean full run is sample one. Each cell gives the verdict and the number of attempts. Correct deliveries passed the citation gate and had matched evidence.

| Item | Full | Sample 2 | Sample 3 | Sample 4 | Sample 5 | Correct deliveries |
|---|---|---|---|---|---|---:|
| GS-018 | Handoff (2) | Handoff (1) | Handoff (1) | Handoff (1) | Handoff (1) | 0/5 |
| GS-023 | Handoff (1) | Partial (1) | Correct (1) | Handoff (1) | Correct (1) | 2/5 |
| GS-030 | Correct (1) | Handoff (1) | Handoff (1) | Correct (1) | Correct (1) | 3/5 |
| GS-062 | Handoff (1) | Handoff (1) | Handoff (1) | Handoff (1) | Handoff (1) | 0/5 |
| GS-094 | Handoff (1) | Correct (1) | Correct (1) | Correct (1) | Correct (1) | 4/5 |
| GS-140 | Handoff (1) | Handoff (1) | Unscored (3) | Handoff (3) | Correct (3) | 1/5 |

The 24 repeats yielded 9 correct, 1 partial, 13 wrong and 1 unscored. All 13 wrong rows were scored handoffs. Each durability item fell short of 5/5. On GS-018, review withheld drafts that attributed the upload error to the connection or put compatibility checks after uploading. The two correct GS-023 replies covered the cache flush, Google DNS and conditional rejoin. Sample 2 received partial credit on the rejoin point. The GS-062 drafts in samples 4 and 5 passed citation review and failed the local completeness check. All four GS-094 repeats delivered the cited version-then-reinstall procedure.

## GS-023 blind rescore

The five fixed R21 answers scored three correct and two partial. They had all scored partial in R23. Cache flush and Google DNS stayed covered across all five. Conditional rejoin moved from partial to covered on three answers and from missing to partial on one. The rescore used the same saved answers and requested `gpt-6.1-sol` under `step10-v1`. [R23 judge control](kb-rerun23.md#durability-and-gs-023-judge-control)

## Pending policy

The retention and reuse decision for GS-049, restoration eligibility for GS-053, the upload threshold and file-type destinations for GS-166, and section 5 of the conventions report remain deferred. [Conventions report](kb-conventions-report.md#5-conventions-versus-procedures)

## Fix-4 corpus check

The clean GS-056 row handed off with a missing citation. On the restored corpus, **5/5 runs delivered correctly**, including three first-attempt deliveries. All five cited `panel/common/settings.md:1-16` and explained that deleting all data resets the world, then gave reinstall and restart in order.

| Sample | Attempts | Timeout stages before delivery | Delivered draft / review (s) | Verdict |
|---|---:|---|---|---|
| 1 | 3 | review, draft | 29.4 / 3.0 | Correct |
| 2 | 1 | None | 26.5 / 4.6 | Correct |
| 3 | 1 | None | 27.4 / 17.2 | Correct |
| 4 | 1 | None | 29.5 / 2.7 | Correct |
| 5 | 2 | review | 27.9 / 13.8 | Correct |

The working settings article and active index are at fix 4.

## Attribution

The R24 schedule, pilot and gate replay recorded zero verifier HTTP 400s. The R23 controlled probe isolated effort compatibility by clearing the reproduced `unsupported_value` error when the same request used `low`. The R24 clean comparison also included revised prompting and completeness checks, a pinned GS-030 effort and different provider timings. Those changes limit attribution of delivery and latency differences. [R23 verifier reproduction](kb-rerun23-diagnosis-evidence.md#review-errors-and-gate-replay)

Diagnostic judging credited five of the nine withheld clean drafts as correct. The live gate withheld those five drafts for unsupported claims or missing required procedure details. The GS-023 blind rescore also showed variation on the same delivered text.

## Saved evidence

The local `eval-results/rerun24/` directory holds `full-clean.json`, `initial-clean-pilot.json`, `durability-manifest.json`, `trigger-off-manifest.json`, `gate-replay.json`, `offline-gates.json`, `gs023-blind-rescore.json`, `max-control-manifest.json`, `fast-route.json` and `fix4-manifest.json`. The corpus verification records are `clean-index-verified.json` and `fix4-index-verified.json`. The manifests identify the individual scheduled checkpoints.
