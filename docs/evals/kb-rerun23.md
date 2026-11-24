# Golden set docs rerun 23

Rerun 23 scored **0 correct, 1 partial, 1 wrong and 11 unscored** on the 13 clean items, with **1 scored handoff**. The clean run and 20 additional durability samples recorded **21 timeout attempts out of 50**. The round missed the zero-timeout and five-delivery durability targets. [Rerun 22](kb-rerun22.md) · [Rerun 22 diagnosis](kb-rerun22-diagnosis.md)

The scheduled runs used `06a5069` and `gpt-6-luna` through sub2api with max effort and Fast requested. Draft verification and the independent `step10-v1` judge used `gpt-6.1-sol`. Each answer attempt had at most 60 seconds. Ticket sessions and account reads were synthetic. Retrieval used official OpenAI `text-embedding-3-small` embeddings.

## Corpus

The active settings article was backed up to `~/workspace/fix4-settings.md` with 「世界已被重置」 present. The clean settings article was restored and indexed before the first live request. The active passages and index were verified again before the resumed clean run. After the clean phases, the backup was restored and the fix-4 index was rebuilt with official embeddings and verified against the restored passages.

| Corpus | Articles / passages | Digest |
|---|---:|---|
| Clean full run, repeats and gate replay | 72 / 570 | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| Fix 4, targeted GS-056 | 72 / 570 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

## Clean results

| Run | Scheduled | Scored | Correct | Partial | Wrong | Unscored | Handoffs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Rerun 22 Luna | 13 | 8 | 1 | 0 | 7 | 5 | 7 |
| Rerun 23 Luna | 13 | 2 | 0 | 1 | 1 | 11 | 1 |

The serial run stopped after nine rows during the runtime restart at about 09:36 UTC. The harness checkpoints each item atomically. The last checkpoint has nine rows and lacks the final summaries. The prior session ended during the restart and its series log contains only the scheduling line. The saved GS-084 and GS-094 rows record immediate model errors near the interruption.

The resume ran only GS-108, GS-140, GS-163 and GS-166. The harness's native resume retries saved unscored rows. The combined checkpoint preserves the nine originals and four new rows after verifying matching model settings, dataset and answerability manifest hashes, rubric, trigger setting, KB stats and retrieval digest. It recomputes the summaries with the harness scoring functions. The two segments sum to 830.2 s of harness time, excluding the restart gap. [Checkpoint and retry logic](../../scripts/eval-golden.ts)

All 13 items are docs-answerable. GS-049 was the only delivery and passed the gate on its first attempt. The strict lexical diagnostic credited 0/13. Handoffs in the tables are scored lifecycle outcomes. Error rows with a fallback message are unscored, per the harness. [Semantic scoring](../../scripts/lib/semantic-judge.ts)

| Item | Rerun 22 | Rerun 23 | Rerun 23 evidence |
|---|---|---|---|
| GS-018 | Unscored | Unscored | Draft, review and draft cutoffs in order |
| GS-023 | Unscored | Unscored | Three draft cutoffs |
| GS-030 | Unscored | Unscored | Three draft cutoffs after deduplicated retrieval |
| GS-049 | Wrong / handoff | Partial | Delivered cancellation and backup steps. The judge wanted definite nonretention under the provisional reference |
| GS-053 | Unscored | Unscored | Drafted conditional renewal and deferred restoration. Review returned HTTP 400 |
| GS-056 | Wrong / handoff | Wrong / handoff | Draft deferred recovery and failed the gate for a missing citation |
| GS-062 | Wrong / handoff | Unscored | Review timed out, then failed on attempt two with an API error without a recorded HTTP status |
| GS-084 | Correct | Unscored | Immediate drafting API error without a recorded HTTP status |
| GS-094 | Wrong / handoff | Unscored | Immediate drafting API error without a recorded HTTP status |
| GS-108 | Wrong / handoff | Unscored | Draft included reinstall and a request for a fresh console error. Review returned HTTP 400 |
| GS-140 | Wrong / handoff | Unscored | Both policy articles admitted on all three attempts. All three drafting calls hit the cutoff |
| GS-163 | Wrong / handoff | Unscored | Draft discussed activation and startup. Review returned HTTP 400 |
| GS-166 | Unscored | Unscored | Draft gave SFTP connection and drag-and-drop steps. Review returned HTTP 400 |

| Group | Attempts | Draft timeouts | Review timeouts | Total timeout attempts | Unscored rows with a timeout |
|---|---:|---:|---:|---:|---:|
| R22 clean | 28 | 11 | 9 | 20 | 5 |
| R23 clean | 22 | 11 | 2 | 13 | 5 |
| R23 additional durability samples | 28 | 6 | 2 | 8 | 3 |
| R23 clean and additional durability samples | 50 | 17 | 4 | 21 | 8 |

Four R23 clean rows ended at a timeout. GS-062 and three repeat rows remained unscored after a provider error on a later attempt. The 33 scheduled rows recorded 20 verifier HTTP 400 responses and three API errors without recorded HTTP status. The traces preserve status and phase, leaving the gateway's rejection reason unresolved. The trigger-off and fix-4 controls each recorded zero timeout attempts and one verifier HTTP 400.

## Authorized delivery and retrieval

The runner uses the earlier of capsule expiry and the 60-second answer deadline. The scheduled revision reserves nine seconds for review and three for delivery. A completed draft can use up to 24 seconds for review within the remaining authorized window. Prefetch has a six-second cap and Core requests run at a concurrency of three per attempt. The verifier receives cited passages, and the runner renders each citation from a separate admitted span ID. Fake-clock tests cover slow drafting and review, second-boundary issuance, cancellation, expiry, supersession, a stalled companion read and stalled search and admission embeddings. [Phase timing](../../packages/agent-loop/src/deadline.ts) · [Runner tests](../../scripts/test/vercel-agent.test.ts)

The first live pilot used deduplication and the 4,096-token output request cap before the additional prompt compaction. All nine attempts hit the draft cutoff, so the pilot recorded no output usage. These attempts are outside the scheduled clean and durability groups.

| Pilot item | R22 prompt bytes | R23 pilot bytes | Companion reads per attempt | Completed first calls |
|---|---:|---:|---:|---:|
| GS-018 | 31,173 | 20,930 | 2 | 0/3 |
| GS-023 | 23,035 | 21,032 | 8 | 0/3 |
| GS-030 | 33,260 | 21,002 | 4 | 0/3 |

The scheduled clean run combined deduplication with focused passage selection, shorter excerpts and a 3,072-token output cap. The table counts returned drafts from the first model call of each attempt.

| Item | R22 prompt bytes | R23 prompt bytes | R22 returned drafts | R23 returned drafts |
|---|---:|---:|---:|---:|
| GS-018 | 31,173 | 10,864 | 2/3 | 1/3 |
| GS-023 | 23,035 | 5,149 | 0/3 | 0/3 |
| GS-030 | 33,260 | 5,723 | 0/3 | 0/3 |

Every scheduled GS-030 attempt read each of four distinct article windows once, down from eight reads in R22. The prompt shrank by 82.8% and the admission set fell from 28 to five unique spans. It retained the automatic-switching and faster Google DNS rationale. All three drafting calls still hit the cutoff after 46.3–47.7 s, so there was no draft or usage to check for coverage. The GS-018 draft that returned took 44.7 s and used 2,715 output tokens, including 2,435 reasoning and 280 text tokens. That draft reached the review cutoff. [R22 retrieval evidence](kb-rerun22-diagnosis-evidence.md#draft-and-admission-excerpts)

## Gate replay and paraphrases

The old combined labels failed `wrong_lines` in the saved GS-062, GS-140, GS-023 and GS-094 drafts. Rendering the two admitted spans individually cleared label validation in all four replays. The verifier was unavailable after three tries for GS-062, GS-140 and GS-094. In GS-023 it rejected claims about diagnosing the connection and ticket routing against the cited evidence. The version paraphrase hit verifier unavailability and the transfer paraphrase failed claim support for its statement about which files can use the panel.

| Negative control | Final replay |
|---|---|
| Reversed panel and SFTP guidance | `verification_unavailable` after three tries |
| Purported full-span excerpt omitted the reinstall step | **Passed unexpectedly**. The verifier marked the draft complete and the local check passed |
| Unadmitted upload range | Rejected as `wrong_lines` |
| Unsupported restoration guarantee | `verification_unavailable` after three tries |
| Missing required procedure point | `verification_unavailable` after three tries |

The omitted-step control failed completeness in the initial replay and passed in the final replay. The final replay established one expected rejection and exposed one false acceptance. The three unavailable cases were withheld without a semantic verdict. A live GS-062 repeat passed verification with separate admitted labels and delivered correct, scoped routing and no-speedup advice. The explicit live installer-state mock control still hands off with a passing citation gate. [Citation gate](../../packages/agent-loop/src/citation-gate.ts) · [Installer-state test](../../scripts/test/vercel-agent.test.ts)

## GS-140 trigger

The trigger admitted both policy articles, `store/discord.md` and `store/services/duplicate-tickets.md`, on all nine on attempts. The off attempt admitted neither. The figures below give first model call times in order, including provider wait.

| Sample | Searches / reads per attempt | Spans | Prompt bytes | First calls (s) | Outcome |
|---|---|---:|---:|---|---|
| On, clean | 3 / 5 | 8 | 6,494 | 44.9 / 47.4 / 47.5 | Unscored, three draft cutoffs |
| On, sample 2 | 3 / 5 | 8 | 6,494 | 45.8 / 47.4 / 36.3 | Wrong / handoff, gate passed and local completeness failed |
| On, sample 3 | 3 / 5 | 8 | 6,494 | 19.4 | Unscored, verifier HTTP 400 |
| On, sample 4 | 3 / 5 | 8 | 6,494 | 21.9 | Wrong / handoff, verifier marked procedure incomplete |
| On, sample 5 | 3 / 5 | 8 | 6,494 | 17.8 | Unscored, verifier HTTP 400 |
| Off | 1 / 3 | 12 | 8,063 | 26.7 | Unscored, verifier HTTP 400 |

All four returned on drafts told the customer to wait for technical staff in the existing ticket. Both withheld drafts scored correct in diagnostic judging. In sample 2, the local routing check required the general support exclusion even though the draft correctly directed the customer to after-sales. Adding that exclusion made the saved draft pass local completeness in an offline replay. In sample 4, the verifier expected the installer stages to check and the index entries to verify. The off draft gave installer checks without the wait advice. The five on samples produced 0/5 correct deliveries. The single off arm and cutoff-limited timings leave the trigger's latency effect unresolved.

## Fast route

A pinned Luna max request at 09:00:06 UTC reached `https://sub2api.coffeehost.net/v1/responses` with `service_tier=fast`. It returned HTTP 200, Luna max and `service_tier=default` in 5.03 s. The gateway returned request ID `8b865818-7f9c-46d2-b3b0-69763c450be5`. The effective rule, selected upstream account and egress tier remain unverified. The local gateway source at `01629d7ff` supports mapping `fast` to `priority` on pass and removing it on filter. [Gateway source evidence](kb-rerun22-diagnosis-evidence.md#fast-and-concurrency)

All 33 responses with tier metadata across the clean, durability, trigger-off and fix-4 phases returned `default` with max effort. Another 19 calls had no tier metadata. The pinned request, pilot and matched blocks also produced **zero confirmed Fast responses**.

## Matched throughput

The benchmark used the clean digest, the same model and retry policy, and the 12-second low-effort verifier at `5f05f7c`. Each block ran GS-018, GS-023 and GS-030. All 12 responses carrying tier metadata returned `default`. No block recorded HTTP 429.

| Pair | Serial wall / timeout attempts | Three-way wall / timeout attempts | First-attempt deliveries | Scored verdicts |
|---|---:|---:|---:|---|
| 1 | 381.8 s / 7 | 141.8 s / 3 | 0 / 0 | Serial 1 wrong, 2 unscored. Three-way 2 wrong, 1 unscored |
| 2 | 273.9 s / 3 | 153.1 s / 6 | 0 / 0 | Both 2 wrong, 1 unscored |

Three-way reduced wall time by 62.9% and 44.1%. The second pair recorded three additional timeout attempts at three-way concurrency, so the scheduled evaluation used serial execution. All four blocks had three failed deliveries. The first serial block overlapped diagnostic verifier requests, which limits attribution of its wall-time difference.

## Durability and GS-023 judge control

The judge scored all five fixed R21 drafts partial again, matching the R22 blind replay at the verdict level. Conditional rejoin coverage fell from partial to missing on one draft and stayed partial on four. The check used byte-identical saved drafts and the same `step10-v1` rubric and model.

The clean full run is sample one. Each cell gives the recorded verdict and attempt count.

| Item | Full | Sample 2 | Sample 3 | Sample 4 | Sample 5 | Correct deliveries |
|---|---|---|---|---|---|---:|
| GS-018 | Unscored (3) | Handoff (2) | Unscored (1) | Unscored (3) | Unscored (1) | 0/5 |
| GS-023 | Unscored (3) | Unscored (3) | Unscored (1) | Unscored (1) | Unscored (1) | 0/5 |
| GS-062 | Unscored (2) | Correct (1) | Unscored (1) | Unscored (1) | Unscored (1) | 1/5 |
| GS-094 | Unscored (1) | Unscored (1) | Unscored (1) | Unscored (2) | Unscored (1) | 0/5 |
| GS-140 | Unscored (3) | Handoff (3) | Unscored (1) | Handoff (1) | Unscored (1) | 0/5 |

The 20 additional samples produced 1 correct, 0 partial, 3 wrong and 16 unscored. All three wrong rows were handoffs. The GS-018 sample 2 draft correctly put the transfer check and SFTP fallback first according to the diagnostic judge. The verifier rejected the SFTP instruction. The last GS-023 draft gave explicit conditional rejoin advice and reached an unavailable verifier. GS-094 repeats set the version before reinstalling, with samples 2, 4 and 5 expressly applying the order across loaders. All four final reviews were unavailable. The clean GS-084, GS-108 and GS-163 controls have no scored deliveries. GS-084 stopped during drafting. GS-108 and GS-163 reached review.

## Pending policy

GS-049 delivered documented end-of-cycle cancellation and backup advice and deferred retention and reuse. The judge credited the next-invoice point and scored retention partial under the provisional reference. GS-053 gave conditional renewal guidance and deferred case-specific eligibility in its withheld draft. GS-166 drafted panel-to-WinSCP connection and drag-and-drop steps, deferred the size limit and gave no destination by file type. Retention and restoration rulings, SFTP destinations and the size threshold, and section 5 of the conventions report remain deferred. [Conventions report](kb-conventions-report.md#5-conventions-versus-procedures)

## Fix-4 corpus check

The clean GS-056 row handed off. On the restored fix-4 corpus, the runner admitted `panel/common/settings.md:1-16` and the first draft explained the world reset, reinstall and restart. Drafting took 30.7 s. The verifier returned HTTP 400 after 1.3 s and the attempt finished unscored in 33.6 s, with the draft withheld. The working settings article and index are left at fix 4.

## Attribution

Review cutoffs fell from nine to two in the clean comparison, with 11 draft cutoffs in each round. The increase in unscored rows includes provider errors near the restart and repeated verifier HTTP 400 responses across the resumed runs. R23 recovered a supported partial answer for GS-049 and a correct GS-062 repeat. The shorter prompts, earlier cutoffs, verifier setting, serial scheduling and provider behavior all varied across rounds. The evidence locates failures by phase and leaves the effect of each change on delivery unresolved.

## Saved evidence

The local `eval-results/rerun23/` directory holds `full-clean.json`, its four-item source `full-missing.json`, `durability-manifest.json`, `trigger-off-manifest.json`, both gate replays and `fix4-GS-056.json`. It also holds `pilot-manifest.json`, `fast-route.json`, `benchmark-manifest.json` and `gs023-blind-rescore.json`. The original nine rows remain in `eval-results/golden-2026-11-24T09-26-00-033Z-13.json`.
