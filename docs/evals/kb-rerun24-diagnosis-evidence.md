# Rerun 24 diagnosis evidence

## Checkpoints and scoring

All R24 checkpoint names below are relative to `eval-results/rerun24/`. The 13 rows in `full-clean.json` and the 24 one-row files in `durability-manifest.json` give the clean and repeat cohorts. Sample 1 is the clean row. The final manifest includes the resumed sample 4 and all of sample 5. `metrics-latest.txt` is an interim snapshot with 11 repeat rows. The counts here use the final checkpoint files named in the manifests. `trigger-off-manifest.json`, `max-control-manifest.json` and `fix4-manifest.json` add 1, 5 and 5 rows. The initial pilot, gate replay, blind rescore and later diagnostic calls are outside the schedule.

The clean revision was `b8d1554`. All clean and control checkpoints except fix 4 have passage digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`. Fix 4 has `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. Both index verification files record 72 articles and 570 passages with official OpenAI `text-embedding-3-small` embeddings. R23 clean has the same dataset, answerability manifest and clean passage digests. R24 requested Luna max, with GS-030 medium pinned in the clean and durability schedules, and Fast on every draft. [Run report](kb-rerun24.md#corpus) · [R23 evidence](kb-rerun23-diagnosis-evidence.md#checkpoints-and-scoring)

| Cohort | Rows | Correct | Partial | Wrong | Unscored | Scored handoffs |
|---|---:|---:|---:|---:|---:|---:|
| R23 clean | 13 | 0 | 1 | 1 | 11 | 1 |
| R24 clean | 13 | 2 | 2 | 9 | 0 | 9 |
| R24 additional durability | 24 | 9 | 1 | 13 | 1 | 13 |
| GS-140 trigger off | 1 | 0 | 0 | 1 | 0 | 1 |
| GS-030 max control | 5 | 3 | 0 | 2 | 0 | 2 |
| Fix-4 GS-056 | 5 | 5 | 0 | 0 | 0 | 0 |

All 13 clean items were classified docs-answerable and marked `outcome: resolved`. The four delivered answers have `semantic.basis: judge`. The nine wrong rows have `semantic.basis: lifecycle` and a Core handoff. Five last drafts were judged correct in `handoffContentVerdict`, two partial and two wrong. That diagnostic judge evaluates the last raw draft against historical reference points. Pre-delivery review checks every material claim and the applicable procedure on the candidate after citation rendering and local repair. A diagnostic correct draft can still contain a delivery blocker. The clean checkpoint records 572.639 s including judging, 0/13 on the lexical diagnostic and null for `trueResolution7d`. [Scoring order](../../scripts/lib/semantic-judge.ts#L87) · [Draft and handoff bookkeeping](../../scripts/eval-golden.ts#L349) · [Candidate construction](../../packages/agent-loop/src/index.ts#L608)

## Clean attempt traces

Times are draft / review / turn in seconds from `answerCalls[0].elapsedMs`, `verificationMs` and `latencyMs`. A dash denotes an absent review. Turn time excludes semantic judging. Gate verdicts come from `citationGateAttempts`, local flags from `answerCompletenessAttempts` and draft judgments from `handoffContentVerdict`.

| Item | Attempt timings | Final evidence | Scored outcome / handoff draft |
|---|---|---|---|
| GS-018 | 35.336 / 18.975 / 56.467 review cutoff → 44.408 / 5.593 / 50.575 | `unsupported_claim` for “可能與傳輸連線有關”. Review accepts an SFTP retry as a transfer check and flags the implied cause. | Wrong / correct |
| GS-023 | 15.723 / 21.361 / 38.918 | `incomplete_answer`. The draft says to reconnect at the original address and omits reopening Minecraft after resolver verification in `debug/connection.md:33-47`. | Wrong / correct |
| GS-030 | 4.198 / 5.928 / 11.506 | Medium. Gate and local check pass. Three cited spans support switching, DNS recovery and quicker updates. | Correct / — |
| GS-049 | 16.482 / 3.071 / 20.422 | Gate and local check pass. Judge gives partial credit on retention and full credit on the next invoice. | Partial / — |
| GS-053 | 27.527 / 5.228 / 34.247 | `incomplete_answer` on service selection and checkout, amount and payment method in the conditional renewal procedure. The separate diagnostic reference asks for a retention deadline and definite loss of recovery eligibility. | Wrong / wrong |
| GS-056 | 16.472 / — / 18.057 | `missing_citation`. Draft defers impact and recovery. Clean Settings `1-14` lacks the reset procedure. | Wrong / wrong |
| GS-062 | 21.342 / 6.682 / 28.849 | `unsupported_claim` for requesting WinMTR and full screenshots for Minecraft without the persistent failure or dual high-latency condition in `debug/connection.md:55-66`. | Wrong / partial |
| GS-084 | 7.415 / 3.546 / 12.469 | Gate and local check pass. Judge credits changing the panel password and the full navigation path. | Correct / — |
| GS-094 | 19.736 / 6.671 / 27.643 | `unsupported_claim` for “先在面板手動建立並下載備份”. Cited `store/description/minecraft.md:8-18` makes local panel backup an optional add-on. Gate completeness and local completeness both true. | Wrong / correct |
| GS-108 | 31.139 / 9.423 / 41.614 | `unsupported_claim` for reinstalling whenever the JAR is missing. The draft cites the post-reinstall and manual-upload branches. The lost auto-installed core procedure in `debug/nojar.md:51-54` was outside the admissions. The diagnostic judge also flags missing Settings navigation. | Wrong / partial |
| GS-140 | 33.495 / 4.519 / 39.579 | `incomplete_answer`. “請留在原單等待回覆” omits who will reply. The staff checks elsewhere in the draft do name technical staff. | Wrong / correct |
| GS-163 | 8.027 / 24.033 / 33.293 review cutoff → 8.868 / 9.128 / 18.304 | `unsupported_claim`. The issue quotes “購買伺服器後，請先等待客服開通或啟用服務，再依照面板步驟啟動”, the runner's repair sentence. `panel/start-server.md:1-14` documents receiving the panel notice after activation for a first purchase. | Wrong / correct |
| GS-166 | 31.476 / 3.202 / 35.702 | Gate and local check pass. Settings, Launch SFTP and dragging into the WinSCP remote pane are present. The judge marks the file-type destination point missing. The reply defers the threshold. | Partial / — |

## Timeout attempts and fix 4

| Cohort | Attempts | Draft cutoff | Review cutoff | Verifier HTTP 400 | Unscored rows |
|---|---:|---:|---:|---:|---:|
| R23 clean | 22 | 11 | 2 | 4 | 11 |
| R23 additional durability | 28 | 6 | 2 | 16 | 16 |
| R24 clean | 15 | 0 | 2 | 0 | 0 |
| R24 additional durability | 30 | 5 | 2 | 0 | 1 |
| Trigger off | 1 | 0 | 0 | 0 | 0 |
| GS-030 max | 5 | 0 | 0 | 0 | 0 |
| Fix-4 GS-056 | 8 | 1 | 2 | 0 | 0 |
| R24 scheduled total | 59 | 6 | 6 | 0 | 1 |

| R24 checkpoint and item | Timeout attempts in order, with affected call time | Final result |
|---|---|---|
| `full-clean.json` GS-018 | A1 review 18.975 s after 35.336 s draft | A2 claim support fails |
| `full-clean.json` GS-163 | A1 review 24.033 s after 8.027 s draft | A2 claim support fails |
| `sample-3-GS-140.json` | A1–A3 draft 45.373 / 47.367 / 47.567 s | Unscored |
| `sample-4-GS-140.json` | A1 review 19.673 s after 34.843 s draft, A2 draft 47.584 s | A3 review finds wait instruction incomplete |
| `sample-5-GS-140.json` | A1 draft 45.808 s, A2 review 13.482 s after 43.122 s draft | A3 correct |
| `fix4-1-GS-056.json` | A1 review 24.006 s after 27.382 s draft, A2 draft 46.884 s | A3 correct |
| `fix4-5-GS-056.json` | A1 review 24.004 s after 30.728 s draft | A2 correct |

All 12 typed timeout attempts logged a successful synthetic Core handoff, then the harness recorded `delivery: error`. All six draft timeouts have empty drafts and no response model, tier or usage. The six review timeouts have a draft and no completed review metadata. Three reviews hit the 24 s cap and three used shorter remaining windows. The turn takes the earlier of the 60 s limit and the capsule expiry. Drafting reserves 9 s for review and 3 s for delivery. The cutoffs measure time waiting at the client. Provider queue and inference time remain unresolved. [Stage limits](../../packages/agent-loop/src/deadline.ts) · [Runner deadlines](../../packages/agent-loop/src/index.ts#L606) · [Retry and error handling](../../scripts/eval-golden.ts#L314)

Fix-4 GS-056 cites `panel/common/settings.md:1-16` in all five deliveries and explains the reset, Settings → Reinstall and restart. Samples 2, 3 and 4 deliver on A1. The delivered draft/review pairs for samples 1–5 are **29.405/2.979**, **26.534/4.596**, **27.423/17.210**, **29.549/2.705** and **27.947/13.754** s. The R23 fix-4 draft with the same corpus had returned before the verifier failed at HTTP 400. [Fix-4 R23 reproduction](kb-rerun23-diagnosis-evidence.md#review-errors-and-gate-replay)

## Durability evidence

Samples 2–5 of each item are `sample-<n>-<item>.json`. The cells give the final blocker or score. All wrong cells were scored handoffs. The timeout table above lists earlier attempts.

| Item | Clean | Sample 2 | Sample 3 | Sample 4 | Sample 5 | Correct |
|---|---|---|---|---|---|---:|
| GS-018 | Claim support, speculative transfer cause | Claim support, “上傳後” compatibility check | Claim support, compatibility after upload | Claim support, speculative transfer cause | Claim support, speculative transfer cause | 0/5 |
| GS-023 | Review, missing reopen step | Judge partial on result of conditional rejoin | Correct | Claim support, uncertainty about cause and staff confirmation | Correct | 2/5 |
| GS-030 medium | Correct | Review, missing reopen step | Review, missing reopen step | Correct | Correct | 3/5 |
| GS-062 | Claim support, unqualified Minecraft reporting branch | Claim support, “目前无法仅凭描述判断原因” | Review, missing evidence to attach if connection still fails | Gate passed, local completeness false | Gate passed, local completeness false | 0/5 |
| GS-094 | Claim support, unqualified panel backup | Correct | Correct | Correct | Correct | 4/5 |
| GS-140 on | Review, wait instruction omits technical staff | Same omission | Three draft cutoffs | Final review, same omission | Correct on A3 | 1/5 |

- **GS-018.** All six attempts retrieved `panel/manage/upload.md:6-30` and omitted it from admissions. The eight admitted spans were seven mod-install windows and `panel/common/sftp.md:1-47`. The mod guide supports SFTP for a large file or failed panel upload and places loader/version checks before installing a matching mod. The specific transfer cause remains unverified. All five final drafts scored correct diagnostically. Four reviews additionally flagged the small-file/folder distinction or setup and deferment details. [R24 upload scope](../../packages/agent-loop/src/index.ts#L501) · [Verifier instructions](../../packages/agent-loop/src/draft-verifier.ts#L7)
- **GS-023.** Sample 2 passed both gates with “DNS 正常後，若確認只有 DNS 問題，再用原本位址連線” and no explicit reopen step. The judge wanted the expected result of rejoining once DNS works. Sample 4's review issue identifies a statement of what staff would need to confirm. The raw draft also says to retry and omits reopening Minecraft. Its diagnostic score was correct. The fixed R21 blind replay in `gs023-blind-rescore.json` moved from five partials in R23 to three correct and two partial in R24. The first two points stayed covered and only rejoin changed. The file gives the requested judge and rubric. [R23 blind replay](kb-rerun23.md#durability-and-gs-023-judge-control)
- **GS-062.** R23 sample 2 delivered in 33.500 s with “请通过 Discord 的「售后服务」类别联系技术人员，不要提交一般客服单” and no-speedup advice. R23 and R24 used the same eight ordered admissions for this item, including both policy articles and `debug/connection.md:9-13` and `55-66`. The R24 prefetch guidance changed the general-support distinction from explicit to conditional on being asked. The non-installer local requirement still expects a distinction. All five R24 drafts omit it. An offline replay rendered the original IDs using the same clean spans and ran the current local check on R23 sample 2 and all five R24 drafts. It returned true for R23 sample 2 and false for the five R24 drafts. Adding “这项产品问题请使用售后服务工单，勿使用一般客服单” with `duplicate-tickets.md:14-17` flipped all five local flags to true. This checks local completeness. The saved live replay rejected a broader general-support claim. R24 sample 5's diagnostic reason also says the item should hand off, although the checkpoint labels it `resolved`. Its live handoff had already happened at local completeness. [Local route check](../../packages/agent-loop/src/index.ts#L182) · [Prefetch guidance](../../packages/agent-loop/src/index.ts#L578) · [R23 sample comparison](kb-rerun23-diagnosis-evidence.md#attempt-traces)
- **GS-094.** All four repeats matched the cited Startup version and Settings reinstall procedure and passed on the first attempt. The only R24 miss was the extra backup claim in the clean draft. The offline reinstall omission and the version paraphrase test opposite sides of the new gate. [Gate replays](#gate-replays)

## GS-030 effort and GS-140 trigger controls

The five medium and five max GS-030 calls record the same 4,647 prompt bytes, four distinct read windows, three ordered admissions and 3,072-token cap. The spans are `debug/connection.md:33-47`, `debug/googledns.md:1-12` and `debug/automatic-route-switching.md:1-7`. The controls record the same corpus, requested Fast tier and returned default. The max block followed the medium block and the replays. Prompt lengths and admissions are recorded. Full serialized prompt hashes and upstream account selections are unavailable.

| Effort | Draft seconds by sample | Median review / turn (s) | Reasoning / text tokens | Outcome |
|---|---|---|---|---|
| Medium | 4.198 / 4.960 / 5.556 / 4.926 / 4.018 | 5.928 / 12.795 | 0 / 182–212 | 3/5 correct on A1. Samples 2 and 3 omitted reopening Minecraft. |
| Max | 10.571 / 13.922 / 12.273 / 20.143 / 17.784 | 16.954 / 35.488 | 391–1,103 / 186–277 | 3/5 correct on A1. Samples 3 and 5 added a support escalation the cited scope did not support. |

All ten calls finished both stages with no retries. The four handoff drafts each scored correct diagnostically. The longest turns were 23.409 s at medium and 36.551 s at max. The draft medians were 4.926 and 13.922 s. [Control report](kb-rerun24.md#gs-030-effort-experiment)

GS-140 admitted both policy articles on 11/11 trigger-on attempts with three searches, five reads, eight spans and a 6,748-byte prompt. The one trigger-off attempt admitted neither, with one search, three reads, 12 spans and 8,063 bytes. It drafted in 24.189 s and failed completeness for routing, waiting and duplicate-ticket advice. The on attempts that returned drafts took 33.495–47.261 s. A1 of sample 4 and A2 of sample 5 included explicit wait-for-technical-staff advice and stopped at the review cutoff. Their local checks pass in an offline replay. Adding the cited wait phrase to the final clean, sample 2 and sample 4 drafts changes all three offline local flags from false to true. The completed live reviews independently identified the same omissions. [Staff-state control](../../scripts/test/vercel-agent.test.ts#L449) · [Trigger results](kb-rerun24.md#gs-140-trigger)

## Gate replays

The five negative controls in `gate-replay.json` each returned the intended rejection.

| Control | Verdict |
|---|---|
| `reversed-meaning` | `unsupported_claim` for reversing panel and SFTP transfer guidance |
| `omitted-full-span-step` | `incomplete_answer` for Settings → Reinstall |
| `unadmitted-range` | `wrong_lines` before calling review |
| `unsupported-claim` | `unsupported_claim` for guaranteeing recovery |
| `missing-key-point` | `incomplete_answer` for Settings → Reinstall |

The offline omission control also fails with the R23 verifier's passing flags. All four old combined labels failed `wrong_lines`. Splitting into the exact admitted spans cleared label validation. GS-140 then passed both checks. GS-062 failed review on the blanket general-support exclusion, GS-023 on the host-block branch and GS-094 on backup and Java wording. The version paraphrase passed. The transfer paraphrase failed claim support on panel-password and third-party-login setup wording. The replay had 12 review calls with 0 HTTP 400s and 2 timeouts on the separate 30 s replay cap. Ten returned `gpt-6.2-sol` metadata. [Gate checks](../../packages/agent-loop/src/citation-gate.ts#L63) · [R23 false accept](kb-rerun23-diagnosis-evidence.md#review-errors-and-gate-replay)

## Model route and Fast

The clean GS-030 A1 review in `full-clean.json` started at 11:20:48.095 UTC. The client request ID is `5b20146e-ca6d-47db-b041-f11b1eef9c1a` and the response `x-request-id` is `579597f7-8dd7-43c4-8298-815402398c7d`. The repo creates a Responses model for `gpt-6.1-sol` and sends low effort with a 900-token cap. The SDK takes `response.modelId` from the JSON response's `model`. The trace records `gpt-6.2-sol`, returned `low`, `default`, and `stop` after 5.927 s. The other 11 completed clean reviews show the same requested and returned models. Across the schedule, all 52 reviews requested 6.1-sol at low. Forty-six returned 6.2-sol and six timed out without model metadata. Seven attempts had no review. [Model construction](../../packages/agent-loop/src/model.ts#L55) · [Verifier options](../../packages/agent-loop/src/draft-verifier.ts#L31) · [SDK trace fields](../../scripts/eval-golden.ts#L178)

The judge sends `gpt-6.1-sol` directly to the same Responses endpoint with the same sub2api key in the scheduled configuration. It sends temperature 0.1 and no effort override. R24 saved the configured model and verdicts. The judge event records omit the HTTP response model and request IDs. A diagnosis probe intercepted the outgoing JSON and the raw gateway response on two synthetic calls through the existing verifier and judge functions. Each returned HTTP 200. The verifier passed both flags and the judge returned correct on the synthetic fixture. [Judge request and parser](../../scripts/lib/semantic-judge.ts#L5) · [Harness judge events](../../scripts/eval-golden.ts#L340)

| Synthetic probe UTC | Request → response model | Request → response effort | Response `x-request-id` |
|---|---|---|---|
| 12:19:03.264 verifier | `gpt-6.1-sol` → `gpt-6.2-sol` | `low` → `low` | `7be2b162-fe1b-4f02-bd3a-1e302660d3ee` |
| 12:19:12.531 judge | `gpt-6.1-sol` → `gpt-6.2-sol` | Unset → `medium` | `97ebe274-f0e5-4e7d-baf3-4ba606d7f945` |

The raw probe response confirms the mismatch exists before SDK parsing. The R23 error body naming 6.2-sol and rejecting `none` supplies further evidence of provider-side behavior. The local sub2api checkout `01629d7ff` has account and channel mappings, records `requested_model`, `upstream_model` and `upstream_response_model`, and can restore the public model name on mapped responses. See `backend/internal/service/openai_gateway_forward.go`, `openai_gateway_usage.go` and `openai_gateway_response_handling.go` in that checkout. The deployed revision, selected account and upstream request and response for the cited IDs are unavailable from the inference API and local artifacts. The response label establishes the client-visible identity. A gateway or upstream substitution is likely. Its location and the underlying inference model require correlated server-side records.

`fast-route.json` records the pinned Luna max probe at 11:05:15.015 UTC. Client request ID `00f978cf-2168-4414-a585-1f3e299f23a0` sent `fast` and received HTTP 200 and `default` after 2.516 s. The response `x-request-id` is `eece3360-f532-45b4-bc01-8a66592d771b`. Account, effective policy and both upstream tier fields are null. Fifty-three scheduled draft responses report `default`, with six missing tier metadata. The R21 Luna checkpoint predates the Fast instrumentation added in `e62e0a9`. R22, R23 and R24 have explicit Fast request evidence and zero confirmed Fast responses. The shell guard in `run-final.sh` requires the observed tier plus account, policy and both upstream tiers before scheduling the benchmark. The R24 artifacts contain no benchmark checkpoints. [R21 Luna baseline](kb-rerun21.md) · [R22 policy code](kb-rerun22-diagnosis-evidence.md#fast-and-concurrency) · [R23 Fast probe](kb-rerun23-diagnosis-evidence.md#fast-and-throughput)
