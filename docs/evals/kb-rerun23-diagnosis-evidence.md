# Rerun 23 diagnosis evidence

## Checkpoints and scoring

The nine rows in `eval-results/golden-2026-11-24T09-26-00-033Z-13.json` followed by the four rows in `eval-results/rerun23/full-missing.json` equal the row array in `eval-results/rerun23/full-clean.json`. The resumed IDs are GS-108, GS-140, GS-163 and GS-166. The segments account for 618.039 s and 212.144 s of harness time. The combined checkpoint matches the clean corpus digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, dataset digest `5d774be134d5287bb93200f8f0c74d0abd6cf234481f560147ed4536487bdc3c` and the resumed model, trigger and rubric settings. The checkpoint contains only docs-answerable rows. The run recorded the clean GS-084 and GS-094 drafting failures at 09:36:18.366 and 09:36:18.529 UTC, shortly before checkpointing stopped. Their `AI_APICallError` traces preserve no HTTP status or upstream error. [R23 report](kb-rerun23.md#clean-results)

| Group | Rows | Correct | Partial | Wrong | Unscored | Scored handoffs |
|---|---:|---:|---:|---:|---:|---:|
| R21 6.1-sol clean | 13 | 5 | 2 | 4 | 2 | 3 |
| R22 Luna clean | 13 | 1 | 0 | 7 | 5 | 7 |
| R23 Luna clean | 13 | 0 | 1 | 1 | 11 | 1 |
| R23 additional durability | 20 | 1 | 0 | 3 | 16 | 3 |

The earlier clean checkpoints are `eval-results/golden-2026-11-24T05-23-38-224Z-13.json` and `eval-results/rerun22-clean-combined.json`. In R23 clean, GS-049 is the only `delivery: answer` row and the only customer-facing answer the judge scored. GS-056 is a wrong lifecycle handoff on a should-resolve row. The 11 unscored rows have `basis: agent-error`. The counts of scored handoffs exclude fallback sends on error rows. [Scoring order](../../scripts/lib/semantic-judge.ts#L87) · [Attempt bookkeeping](../../scripts/eval-golden.ts#L286)

## Attempt traces

The table gives draft, review and full attempt time in seconds from `modelCallsMs[0]`, `verificationMs` and `latencyMs`. A dash marks an absent verifier call. The full attempt includes synthetic Core, history and response handling. The independent semantic judge runs afterward. Each scheduled attempt had one answer-model call. Count R23 timeouts by the typed `timedOutStage`. The R22 traces predate that field, so the comparison uses logged timeout errors and whether a verification call started. [R22 timings](kb-rerun22-diagnosis-evidence.md#full-run-attempt-traces) · [R23 harness](../../scripts/eval-golden.ts#L264)

| Clean item | Attempt sequence (draft / review / turn) | Final scoring |
|---|---|---|
| GS-018 | 45.043 / — / 47.444 draft timeout → 44.675 / 11.904 / 56.986 review timeout → 47.652 / — / 47.994 draft timeout | Unscored |
| GS-023 | 46.512 / — / 47.984 → 47.668 / — / 48.001 → 47.602 / — / 47.999, all draft timeouts | Unscored |
| GS-030 | 46.331 / — / 47.995 → 47.713 / — / 48.011 → 47.736 / — / 48.039, all draft timeouts | Unscored |
| GS-049 | 31.926 / 23.626 / 56.783, gate and local check pass | Partial |
| GS-053 | 26.823 / 1.565 / 29.448, review HTTP 400 | Unscored |
| GS-056 | 9.742 / — / 10.816, missing citation | Wrong / handoff |
| GS-062 | 12.688 / 24.007 / 37.749 review timeout → 21.621 / 3.348 / 25.331 review API error, status absent | Unscored |
| GS-084 | 0.002 / — / 0.148, draft API error, status absent | Unscored |
| GS-094 | 0.004 / — / 0.088, draft API error, status absent | Unscored |
| GS-108 | 32.721 / 1.495 / 35.854, review HTTP 400 | Unscored |
| GS-140 | 44.858 / — / 47.447 → 47.416 / — / 47.995 → 47.482 / — / 47.998, all draft timeouts | Unscored |
| GS-163 | 8.734 / 0.969 / 11.499, review HTTP 400 | Unscored |
| GS-166 | 15.657 / 1.500 / 18.295, review HTTP 400 | Unscored |

Each cell below lists the additional attempts in order. The checkpoint filenames are `eval-results/rerun23/sample-<n>-<item>.json` in `durability-manifest.json`.

| Item | Sample 2 | Sample 3 | Sample 4 | Sample 5 |
|---|---|---|---|---|
| GS-018 | Draft timeout 44.881 s → review rejects SFTP instruction, wrong handoff | Review HTTP 400 | Draft timeouts 45.989 and 47.478 s → review HTTP 400 | Review HTTP 400 |
| GS-023 | Review timeout 19.211 s after 35.519 s draft, turn 56.616 s → draft timeout 47.277 s → review HTTP 400 | Review HTTP 400 | Review HTTP 400 | Review HTTP 400 after 21.943 s |
| GS-062 | Gate and local check pass, correct delivery (19.612 s draft, 12.065 s review, 33.500 s turn) | Review HTTP 400 | Review HTTP 400 | Review HTTP 400 |
| GS-094 | Review HTTP 400 | Review HTTP 400 | Review timeout 24.004 s after 13.119 s draft, turn 39.634 s → review HTTP 400 | Review HTTP 400 |
| GS-140 | Draft timeouts 45.835 and 47.384 s → 36.259 s draft, 8.885 s passing review, local check fails | Review HTTP 400 at 0.902 s | Review marks procedure incomplete at 15.946 s | Review HTTP 400 at 1.047 s |

| Group | Attempts | Draft timeouts | Review timeouts | Total timeout attempts | Terminal timeout rows | Unscored rows with any timeout | Review HTTP 400 attempts |
|---|---:|---:|---:|---:|---:|---:|---:|
| R22 clean | 28 | 11 | 9 | 20 | 5 | 5 | 0 |
| R23 clean | 22 | 11 | 2 | 13 | 4 | 5 | 4 |
| R23 additional durability | 28 | 6 | 2 | 8 | 0 | 3 | 16 |
| R23 clean and additional durability | 50 | 17 | 4 | 21 | 4 | 8 | 20 |

All 21 R23 timeout attempts logged an `ok` synthetic Core handoff event and a runner return event after the cutoff. Their trace delivery is `error` because the harness marks a returned timeout as an agent error. No R23 scheduled attempt logged an authorization, prefetch or delivery timeout. The other three status-less API errors in the scheduled checkpoints are GS-062 review and GS-084/GS-094 drafting. Four clean rows ended at the draft cutoff. GS-062 clean and three repeats had a timeout before ending on an API error. The harness retries typed timeouts, 429 and selected transient failures. HTTP 400 and generic API errors with absent status do not qualify, so the number of attempts changes with the failure mix. [Retry conditions](../../scripts/eval-golden.ts#L286)

The clean draft timeout durations in R22 were 57.340–59.700 s (median 58.897 s). In R23 they were 44.858–47.736 s (median 47.482 s). These are abort times. R23 full attempts that hit the draft cutoff ended in 47.444–48.039 s including fallback. GS-018 clean and GS-023 sample 2 used their remaining review windows and completed their fallback near 57 s. GS-062 clean and GS-094 sample 4 hit the separate 24 s review cap and finished their fallbacks in 37.749 and 39.634 s. The timestamps establish early cutoff and returned handoff. The checkpoints lack a per-attempt capsule expiry or phase start field, so the exact reserved slack and backend latency split are unavailable. [Stage budget](../../packages/agent-loop/src/deadline.ts) · [Delivery path](../../packages/agent-loop/src/index.ts#L592)

## Draft and admission excerpts

| Clean item | R22 bytes / returned drafts | R23 bytes / returned drafts | R23 evidence |
|---|---|---|---|
| GS-018 | 31,173 / 2 of 3 | 10,864 / 1 of 3 | Clean attempt 2 returned 2,715 output tokens, of which 2,435 were reasoning and 280 text. It suggested the SFTP upload check before checking whether the mod would load. Review timed out. |
| GS-023 | 23,035 / 0 of 3 | 5,149 / 0 of 3 | Four distinct admitted spans. Sample 5 explicitly recommends rejoining the original address once DNS works, conditional on DNS being the sole issue. Its review ended HTTP 400. |
| GS-030 | 33,260 / 0 of 3 | 5,723 / 0 of 3 | Four searches, four distinct companion windows read once each, and five admissions. The route-switching passage is `debug/automatic-route-switching.md:1-7` and the Google DNS rationale is `debug/googledns.md:1-12`. Three connection spans include cache flush and rejoin guidance. |

For clean GS-030 all three `answerCalls` entries have `outputLimit: 3072`, with `inputTokens`, `outputTokens`, `reasoningTokens`, `textTokens`, `finishReason` and upstream response ID all null. Each draft array is empty. The 82.8% prompt reduction and four fewer reads are measured. What happened inside those aborted calls is unobserved. The early pilot at a 4,096-token cap used 20,930, 21,032 and 21,002 bytes for GS-018, GS-023 and GS-030 and produced no draft across nine attempts, in `pilot-manifest.json` and `pilot-GS-*.json`. [R23 pilot](kb-rerun23.md#authorized-delivery-and-retrieval)

R22 comparison rows and paths are in `rerun22-clean-combined.json` and `rerun22-repeat-manifest.json`. Block 5 GS-023's draft scored correct diagnostically and failed the combined DNS-range check. In R23, four GS-023 durability drafts were withheld after HTTP 400, with the first draft in sample 2 also withheld at review timeout. GS-018 sample 2 scored correct diagnostically and was withheld for the specific instruction “請到伺服器「設定」點「啟動 SFTP」…再用 SFTP 測試上傳同一個檔案”. R22's later judged drafts put compatibility too early. R23 GS-094 samples 2, 4 and 5 apply version before reinstall across applicable loaders. Every repeat's final review was unavailable and the clean drafting call failed in 4 ms. R23 ran no extra GS-166 samples. Its clean draft includes dragging a local folder into the WinSCP remote pane, which R22's block 4 delivery omitted. The exact threshold was deferred and no file-type destination was given. [R22 durability](kb-rerun22.md#gs-023-blind-rescore-and-durability) · [R23 durability](kb-rerun23.md#durability-and-gs-023-judge-control)

The `eval-results/rerun23/gs023-blind-rescore.json` replay scored the five fixed R21 drafts partial under `gpt-6.1-sol` and `step10-v1` again. Cache flush and Google DNS scored covered on all five. Conditional rejoin stayed partial on four and changed from partial to missing on one. All five R23 GS-023 rows were unscored before the delivered-answer judge. [Earlier blind replay](kb-rerun22.md#gs-023-blind-rescore-and-durability)

## Matched effort probes

The diagnosis replayed GS-018, GS-023 and GS-030 through the Responses endpoint. It verified the original dataset and clean passage digest, reconstructed the question through `inputFor` and used the saved ordered admissions, indexed excerpts and exact companion line slices. It rebuilt the compact passage IDs, instructions and empty account reads, then captured the serialized SDK request. The three reconstructed prompt lengths equal the original trace lengths. The archive stores lengths and admissions, so the body hashes below compare the new arms. Both arms used the same model, prompt body, 3,072-token output cap, low verbosity, `store: false`, and Fast request. Effort was the only request-body difference. Each item had two serial pairs, reversing arm order in the second pair. Gateway account selection was unobserved. [Draft construction](../../packages/agent-loop/src/index.ts#L543) · [Answer model wrapper](../../packages/agent-loop/src/model.ts#L20)

| Item | SDK prompt bytes | Responses input SHA-256 |
|---|---:|---|
| GS-018 | 10,864 | `e5798a4c736627146599839153dcea25911dc53a90d821d35473c673c2bd6049` |
| GS-023 | 5,149 | `12a8c5595afad6f077a31eae28dca9d5328e4b13c9afe6edab10ed255608167f` |
| GS-030 | 5,723 | `e2acfdbca596ae555f351b0a7608adc6afc8a867470a038d4475bc6bc92351eb` |

The diagnostic draft request could run for 57 s in isolation to observe completions beyond the scheduled draft cutoff. The 60 s runner and its cutoffs were outside this test. The table reports draft call seconds and input / total output / reasoning / text tokens. Text is total output less reasoning. Every completed response returned its requested effort and tier `default`. There was no `Server-Timing` header. [R23 timing constants](../../packages/agent-loop/src/deadline.ts)

| Item | Pair | Max call | Max tokens | Medium call | Medium tokens |
|---|---:|---:|---|---:|---|
| GS-018 | 1 | 36.424 s | 7,551 / 2,579 / 2,287 / 292 | 5.304 s | 7,551 / 276 / 0 / 276 |
| GS-018 | 2 | 35.223 s | 7,551 / 2,250 / 1,947 / 303 | 6.012 s | 7,551 / 298 / 0 / 298 |
| GS-023 | 1 | 16.234 s | 5,675 / 1,205 / 951 / 254 | 4.295 s | 5,675 / 233 / 0 / 233 |
| GS-023 | 2 | 21.303 s | 5,675 / 1,397 / 1,179 / 218 | 3.951 s | 5,675 / 205 / 0 / 205 |
| GS-030 | 1 | cutoff at 57.004 s | — | 20.928 s | 5,875 / 387 / 108 / 279 |
| GS-030 | 2 | 55.768 s | 5,875 / 818 / 516 / 302 | 38.260 s | 5,875 / 377 / 95 / 282 |

The two GS-030 medium responses reached headers after 20.926 and 38.254 s. The max response reached headers after 55.755 s, with 13 ms from headers to parsed body. That bounds client-side body transfer and parsing. The preceding interval includes transport, gateway and upstream wait, input processing, hidden reasoning and text generation. The 17.332 s spread between medium calls with nearly identical usage shows how little token count alone explains wall time. The first max attempt ended without headers or usage. The live archive is `eval-results/rerun23-diagnosis/effort-probes.jsonl` with `prompt-fingerprints.json`.

Two supplementary GS-030 calls used streaming with the same request content. The times below are client-observed arrivals. The intervals between server-sent events can include upstream pauses and gateway buffering.

| Effort | Headers | Response created | Reasoning item added → done | First → last visible text delta | End |
|---|---:|---:|---|---|---|
| Max | 29.434 s | 29.438 s | 29.439 → 46.777 s | No visible text | Cutoff at 57.007 s, usage absent |
| Medium | 12.058 s | 21.691 s | 21.694 → 27.244 s | 27.249 → 34.689 s | Completed at 34.803 s, with 138 reasoning and 287 text tokens |

The max probe spent 29.4 s before the first event and 17.338 s between reasoning item events. It produced no visible text during the next 10.230 s before cutoff. The medium probe finished visible text streaming in 7.440 s after the first text delta. These are stage observations on the supplementary transport. Separating gateway queue, upstream time to first output, reasoning compute and delivery requires correlated upstream metrics. The historical non-streaming calls cannot provide that split. The probes and request IDs are in `gs030-stream-probes.jsonl`.

The first completed draft for each arm also went through an isolated 24 s review using `low` effort, the existing cited-span gate and local checks. All six returned HTTP 200 and reported `gpt-6.2-sol`, from requests for `gpt-6.1-sol`. The timing estimate includes the draft and review durations, the 3 s delivery reserve and an allowance for historical startup plus early expiry. The latter is 48 s minus the first clean draft call's cutoff time, grouped by item. This is a budget estimate from separate calls. The independent 6.1-sol judge scored draft coverage after review, using `step10-v1`. Both measurements are recorded in `low-review-probes.jsonl` and `draft-judge-probes.jsonl`.

| Item | Effort | Draft / review | Estimated budget used | Gate outcome |
|---|---|---|---:|---|
| GS-018 | Max | 36.424 / 5.923 s | 48.304 s | Incomplete upload procedure |
| GS-018 | Medium | 5.304 / 4.137 s | 15.398 s | Unsupported exact JAR upload instruction |
| GS-023 | Max | 16.234 / 20.779 s | 41.501 s | Missing DNS verification detail |
| GS-023 | Medium | 4.295 / 5.211 s | 13.994 s | Incomplete DNS steps |
| GS-030 | Max | 55.768 / 4.450 s | 64.887 s | Unsupported alternate-host instruction |
| GS-030 | Medium | 20.928 / 18.377 s | 43.974 s | Unsupported alternate-host instruction |

All six reviewed drafts scored correct on the independent reference points. The two GS-030 rejections identified a qualifier mismatch. `debug/connection.md:23-32` calls for the alternate host after confirming a block. Both saved replies made inability to open a page sufficient for switching. The reference credits automatic switching and faster DNS, while the gate also checks the extra alternate-host claim.

An offline GS-030 content control added the block confirmation, conditional rejoin and qualified Google DNS comparison to the medium draft. The 9.226 s review accepted claim support and still marked the answer incomplete because the final ticket advice depended on trying both hosts. A separately authored control kept the documented route-switching and DNS procedure, with flush, verification, conditional rejoin and the qualified faster-update rationale. Its review and local check passed in the replay, with 5.579 s spent on the verifier. The independent judge marked all three points covered. Using the observed 20.928 s medium draft time gives 31.176 s including the historical startup/expiry allowance and delivery reserve. This estimate pairs the latency of a generated draft with review of manually written control text. Fresh model generation and delivery still need a scheduled run. [Grounding and completeness](../../packages/agent-loop/src/draft-verifier.ts#L7)

The two content controls and diagnostic judgment are in `gs030-qualifier-probes.jsonl` and `gs030-qualifier-judge.jsonl`. The main run, retries, pilot, throughput benchmark, blind rescore and these diagnostic probes keep separate denominators.

## Review errors and gate replay

In `eval-results/rerun23/fix4-GS-056.json`, the digest is `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`, the first answer call finished with `stop` at 30.723 s, and its draft includes 「世界已被重置」, 「重新安裝伺服器」 and 「重新啟動伺服器」 with `[P1]` mapped to `panel/common/settings.md:1-16`. Review took 1.307 s and recorded `AI_APICallError`, status `400`, `verification_unavailable` and no timeout. The whole attempt took 33.636 s. The R22 fix-4 manifest points to `rerun22-checkpoints/fix-4-GUjn4F/eval-results/golden-2026-11-24T07-57-30-947Z-1.json`, a correct first attempt on the same digest. [R23 fix-4 check](kb-rerun23.md#fix-4-corpus-check)

The diagnostic replay reconstructed the saved fix-4 verifier request through the same SDK and verifier instructions, including the single cited passage, question, rendered draft, strict JSON schema, empty account reads and 900-token cap. It replayed `none`, `low`, then `none` on sub2api, with only `reasoning.effort` changed in the JSON. The local completeness check passed. The errors from the two `none` calls carry the same message, `unsupported_value` and parameter `reasoning.effort`. The response body says “'none' is not supported with the 'gpt-6.2-sol' model” and lists `low`, `medium`, `high`, `xhigh` and `max`. The requested verifier model was `gpt-6.1-sol` for all three calls. The deployed account mapping is unobserved. [Verifier request](../../packages/agent-loop/src/draft-verifier.ts#L25)

| Effort | HTTP | Elapsed | Gateway request ID | Result |
|---|---:|---:|---|---|
| none | 400 | 2.245 s | `51d24107-61fd-434b-b7ff-f4c56430669c` | `unsupported_value` |
| low | 200 | 3.708 s | `9efe28ac-3a18-4b8f-829b-d2ff37eb775f` | `claimsSupported: true`, `complete: true`, cited settings span, 44 output tokens |
| none | 400 | 0.899 s | `6c187cb4-1824-49a7-964c-56659d628dbf` | `unsupported_value` |

These probes are in `eval-results/rerun23-diagnosis/verify-probes.jsonl`. The archived small verifier probe had HTTP 200 at both efforts on a different prompt. The successful `none` reviews in R23 and the 400 reproduction localize the failure to effort compatibility on the effective route. Other archived 400s have no response body or verification request ID, which prevents assigning that exact upstream error to each one. The harness stores a sanitized name and HTTP status. [Failure recorder](../../scripts/eval-golden.ts#L170) · [Gate error mapping](../../packages/agent-loop/src/citation-gate.ts#L77)

The initial `omitted-full-span-step` replay returned `claimsSupported: true` and `complete: false`, naming the missing Settings → Reinstall step. The final replay returned both true, with the same cited labels `[panel/config/startup.md:10-13]` and `[panel/config/startup.md:26-33]`. The draft selects the version and quotes the Forge build-choice line. The cited span goes on to instruct the customer to open Settings and reinstall after applying the change. The draft omits that instruction. The local check reports true in both saved replays. Replaying the recorded final flags with the same draft deterministically yields `passed` and local true in `offline-gates.json`. The source uses exact labels and the verifier's single `complete` flag. Its local reinstall check is limited to reset/reinstall symptoms with `panel/common/settings.md` admitted. It does not check version-then-reinstall in a startup-only version procedure. [Replay script and artifacts](kb-rerun23.md#gate-replay-and-paraphrases) · [Gate flags](../../packages/agent-loop/src/citation-gate.ts#L60) · [Local checks](../../packages/agent-loop/src/index.ts#L173)

The final replay gave one expected `wrong_lines` rejection for the unadmitted upload range and one false accept. The reversed meaning, restoration guarantee and missing-key-point controls all exhausted three calls without a semantic verdict. The positive version paraphrase also exhausted three calls. The transfer paraphrase failed claim support for its panel file-size wording. Splitting the combined citations repaired the format on GS-062, GS-140, GS-023 and GS-094. The final GS-023 replay still failed claim support on extra connection and ticket-routing instructions. The other three never got a usable review. The replay has outcome and attempt counts, with no provider error bodies per case. [R23 gate results](kb-rerun23.md#gate-replay-and-paraphrases)

## GS-140 trigger evidence

All nine trigger-on attempts admitted both policy articles, with three searches, five companion windows, eight admissions and a 6,494-byte prompt. The four returned on drafts include waiting for technical staff in the existing ticket. The full row timed out in drafting three times. Sample 2 timed out twice, then its labels and review passed but local `answerComplete` was false. It says “產品問題應走售後類別” and omits the explicit general-support exclusion. Feeding the same draft to the local checker after adding a cited exclusion changes false to true. Sample 3 already includes “而非一般支援” and passes the offline local check. Its live review ended HTTP 400. [R23 trigger table](kb-rerun23.md#gs-140-trigger)

Sample 4's verifier marked claims supported but demanded explicit installer download, extraction/deployment, completion/cleanup and index checks for the named variants. The draft asked a technician to check the process and index. Its diagnostic judge credited the routing and wait guidance and scored it correct. The saved local path short-circuited on `complete: false`. In the offline check that draft also lacks the general-support exclusion, as does sample 5. Both pass local completeness after the same cited addition. Sample 5's live blocker was HTTP 400. This yields zero correct deliveries on five trigger-on samples and two correct diagnostic draft judgments on the scored handoffs. The explicit installer-state mock remains a handoff control. [Offline checks](../../packages/agent-loop/src/index.ts#L182) · [Installer-state override](../../packages/agent-loop/src/index.ts#L618)

The one off checkpoint, `eval-results/rerun23/trigger-off-GS-140.json`, has one search, three reads, 12 admissions and an 8,063-byte prompt. Neither policy article was admitted. The 26.675 s draft discusses installer checks and omits the wait advice. Its 1.668 s review ended HTTP 400. The small and uneven samples and censored calls prevent identifying a trigger latency effect. [R22 trigger comparisons](kb-rerun22-diagnosis-evidence.md#gs-140-trigger-pairs)

## Fast and throughput

The pinned ingress probe `eval-results/rerun23/fast-route.json` records the Responses endpoint, `service_tier=fast`, `max`, HTTP 200 after 5.030 s and returned `default`. Its gateway request ID is `8b865818-7f9c-46d2-b3b0-69763c450be5`. The account, effective rule and upstream tier fields are null. The clean and repeat checkpoints contain 31 response tiers, all default. The off and fix-4 controls each add one default, for 33 observations and 19 calls with no returned tier metadata. The pilot returns none and the matched-width benchmark returns 12 default responses. The gateway checkout at `01629d7ff` can normalize `fast` to `priority` on pass, strip it on filter, or set a tier from group policy. The observed client response alone cannot locate where the tier changed. [Earlier gateway source excerpt](kb-rerun22-diagnosis-evidence.md#fast-and-concurrency) · [R23 tier summary](kb-rerun23.md#fast-route)

| Block from `benchmark-manifest.json` | Wall | Draft / review timeouts | Attempts | Correct deliveries | HTTP 429 |
|---|---:|---:|---:|---:|---:|
| serial-1 | 381.760 s | 4 / 3 | 8 | 0/3 | 0 |
| three-1 | 141.792 s | 3 / 0 | 5 | 0/3 | 0 |
| serial-2 | 273.906 s | 3 / 0 | 5 | 0/3 | 0 |
| three-2 | 153.120 s | 4 / 2 | 8 | 0/3 | 0 |

The benchmark uses the earlier 12 s review cap and `low` verifier effort from `5f05f7c`. Serial-1 overlapped diagnostic review requests. Three-way reduced wall time in both pairs and increased timeouts in pair 2. `scheduled-concurrency.txt` records the subsequent serial width of one. [Benchmark](kb-rerun23.md#matched-throughput)
