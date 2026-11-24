# Golden set docs rerun 25 diagnosis evidence

## Checkpoints and scoring

Paths in this ledger are relative to the local, gitignored `eval-results/rerun25/` directory unless prefixed with `rerun24/`. The scheduled revision was `1d237f9` and the R24 comparison revision was `b8d1554`, as recorded in each `revision.txt`. The R25 schedule counts the 13 clean rows in `full-clean.json`, 24 rows in `durability-manifest.json`, two GS-030 max and two GS-140 trigger-off rows in `paired-manifest.json`, and five restored-corpus GS-056 rows in `fix4-manifest.json`. The paired manifest also contains sample 2, counted once in durability. The resumed durability manifest reused all six rows of sample 2 and GS-018, GS-023 and GS-030 from sample 3. Both early pilots, the Fast probe, the gate replays and the judge-only rescoring are outside the 58-attempt denominator. [Run report](kb-rerun25.md#saved-evidence)

The clean checkpoints match on selected IDs, dataset and answerability digests, clean corpus digest `6b7b4b6d68e2…`, and rubric `step10-v1`. `clean-index-verified.json` and `clean-index-resume-verified.json` record 72 articles and 570 passages embedded with OpenAI `text-embedding-3-small` and the absence of the fix-4 reset statement. Both rounds requested Fast and Luna max by default with GS-030 pinned at medium in the clean and durability cohorts. All 13 clean rows are `docs-answerable` and expected `resolved`. The ticket lifecycle is synthetic and `trueResolution7d` is null. [Harness](../../scripts/eval-golden.ts) · [Rerun 24 checkpoint comparison](kb-rerun24-diagnosis-evidence.md#checkpoints-and-scoring)

| Clean checkpoint | Scheduled | Scored | Correct | Partial | Wrong | Unscored | Scored handoffs |
|---|---:|---:|---:|---:|---:|---:|---:|
| R24 | 13 | 13 | 2 | 2 | 9 | 0 | 9 |
| R25 | 13 | 12 | 5 | 0 | 7 | 1 | 7 |

R25 delivered all five correct replies on attempt one with `citationGate.status=passed` and matched citations. The checkpoint's `correctRate` divides by the 12 scored rows and gives 41.7%. The delivery benchmark divides by all 13 scheduled rows and gives 38.5%. `full-manifest.json` records exit code 1. `full-clean.json` has all 13 rows and `status: running` because GS-018 remained unscored with `basis: agent-error`. The seven wrong rows all have `basis: lifecycle`. Their draft diagnostics are reported below. [Scoring order and denominator](../../scripts/lib/semantic-judge.ts#L111) · [Checkpoint status](../../scripts/eval-golden.ts#L393)

## Clean attempt traces

All rows except GS-018 used one attempt. The last column is extracted from `citationGateAttempts`, `attemptTraces`, `semantic` and `handoffContentVerdict` in `full-clean.json`. Draft excerpts describe generated replies. Quoted review issues are translated where indicated. [Citation gate](../../packages/agent-loop/src/citation-gate.ts#L63) · [Delivery decision](../../packages/agent-loop/src/index.ts#L696)

| ID | Result | Delivery evidence |
|---|---|---|
| GS-018 | Unscored | Three cutoffs and a Core handoff on each attempt. Zero judge calls. [Attempt ledger](#gs-018-every-attempt) |
| GS-023 | Correct | Cites `debug/connection.md:33-47`, `debug/googledns.md:1-12` and automatic switching. Explicitly reopens Minecraft and retries the original address, with success conditional on DNS being the sole issue. Judge covered all three points. |
| GS-030 | Wrong / handoff | `unsupported_claim` quotes “open Command Prompt as administrator” (translated). The cited DNS procedure supplies the command. The diagnostic judge gave correct. |
| GS-049 | Wrong / handoff | `claimSupport: true`, `complete: false`. The draft gave cancellation and backup guidance and left retention, recovery and reuse uncertain. Review required an explicit request for staff to verify eligibility. Diagnostic wrong. |
| GS-053 | Wrong / handoff | `unsupported_claim` quotes “service will be suspended after nonpayment” (translated). The cited retention procedure makes suspension case-specific. The draft gave conditional renewal and deferred restoration. Diagnostic wrong under the historical retention reference. |
| GS-056 | Wrong / handoff | The gate passed with `index.md:18-19` for the backup statement. `answerComplete: false` at the runner. The draft deferred the deletion outcome and recovery. Clean Settings span `1-14` lacks the reset statement. Diagnostic wrong. |
| GS-062 | Correct | Cites both ticket policies and `debug/connection.md:9-13`. Gives the issue-specific after-sales route, Discord prerequisite, basic reporting details and same-ticket wait. Judge covered all three points. |
| GS-084 | Correct | Cites `store/account/login-recovery.md:12-19` for panel password reset and navigation. |
| GS-094 | Correct | Cites `panel/config/startup.md:10-13` and `26-33` for Startup version 26.3 and Settings → Reinstall. Both points covered. |
| GS-108 | Wrong / handoff | Cites `debug/nojar.md:51-56` for a lost auto-installed core and `57-67` for the post-reinstall branch. Draft says “check startup parameters.” `incomplete_answer` asks for Startup navigation and checks for entry errors or unparseable special characters. Diagnostic correct. |
| GS-140 | Correct | Cites `store/discord.md:6-43` and `store/services/duplicate-tickets.md:14-17` and `10-13`. Gives after-sales, same-ticket wait for technical staff, no speedup from duplicates and staff checks for the installer and index. |
| GS-163 | Wrong / handoff | `panel/start-server.md:1-14` was cited for the first-purchase notice and account setup. Draft says to set the new password. `incomplete_answer` asks for the subsequent Reset Password click. Diagnostic correct. |
| GS-166 | Wrong / handoff | Cites both upload guides and explicitly says a folder needs no compression. `incomplete_answer` flags the missing third-party sign-in password-change path in `panel/common/sftp.md:40`. Diagnostic partial on file-type destinations. |

## GS-018 every attempt

In `full-clean.json` and `sample-{2,3,4,5}-GS-018.json`, all ten attempts recorded two searches, four reads, the same 8,242-byte draft prompt and the same prompt SHA-256 (`84f03ab75e20…`). Each admitted, in order, `practice/install/mod.md:66-100`, `panel/common/sftp.md:1-47`, `practice/install/mod.md:144-144` and `panel/manage/upload.md:6-30`. The SFTP passage describes uploading files in the client after connecting at line 45, and the mod passage points to SFTP for upload failures at line 144. R25's upload guidance explicitly describes connection setup and dragging a folder. The attempted single-file transfer still needed its own post-login action. [Upload guidance](../../packages/agent-loop/src/index.ts#L22) · [Focused admissions](../../packages/agent-loop/src/index.ts#L483)

Times are client-side seconds. Draft elapsed time comes from `answerCalls[0].elapsedMs`, review from `verificationMs` and turn time from `latencyMs`. Review issues below are translated except the already English sample 3 issue.

| Checkpoint / attempt | Draft / review / turn (s) | Gate and outcome |
|---|---|---|
| Clean A1 | 46.129 / — / 47.463 | Draft cutoff, zero saved drafts, gate `not_evaluated`. Core handoff, retry. |
| Clean A2 | 47.469 / — / 47.996 | Draft cutoff, zero saved drafts, gate `not_evaluated`. Core handoff, retry. |
| Clean A3 | 42.804 / 13.807 / 57.000 | Draft gives SFTP as a transfer check and explains login. Review cutoff, `verification_unavailable`. Core handoff, retries exhausted, unscored. |
| Sample 2 A1 | 44.458 / 10.798 / 56.908 | Draft explains login and dragging a folder. Review cutoff, `verification_unavailable`. Core handoff, retry. |
| Sample 2 A2 | 47.316 / — / 47.994 | Draft cutoff, zero saved drafts, gate `not_evaluated`. Core handoff, retry. |
| Sample 2 A3 | 42.954 / 7.128 / 50.560 | `incomplete_answer`. Explicitly upload the JAR in the SFTP client to the staff-confirmed remote directory to test the transfer. Scored handoff. |
| Sample 3 A1 | 43.218 / 11.057 / 56.179 | Draft explains login and dragging a folder. Review cutoff, `verification_unavailable`. Core handoff, retry. |
| Sample 3 A2 | 45.918 / 4.069 / 50.367 | `incomplete_answer`. “Omits the final step of uploading the JAR through the SFTP client after connecting.” Scored handoff. |
| Sample 4 A1 | 38.874 / 6.078 / 47.084 | `incomplete_answer`. Upload the original JAR in the WinSCP remote pane to check transfer success. Scored handoff. |
| Sample 5 A1 | 39.488 / 4.123 / 45.088 | `incomplete_answer`. Finish the retry by uploading the JAR in the client as in a file manager. Scored handoff. |

All seven returned drafts mentioned the SFTP retry or connection and omitted an explicit action to upload the JAR after login. All four completed reviews had matching cited spans, `claimSupport: true` and `complete: false`. The runner's `answerComplete: false` reflects the review verdict because the false flag short-circuits the local completeness check. Each terminal scored handoff had a separate draft diagnostic marked correct. The clean row had no judge call and all three clean attempts exhausted time before a substantive verdict. [Gate and local coverage order](../../packages/agent-loop/src/index.ts#L696) · [Lifecycle and diagnostic scoring](../../scripts/lib/semantic-judge.ts#L75)

R24 had six GS-018 attempts with 11,002-byte prompts. Searches retrieved the panel upload article every time, and none of the six admissions included it. The clean A1 review cut off at 18.975 s after a 35.336 s draft. The clean retry and samples 4–5 failed claim support for inferring a transfer-connection cause. Samples 2–3 failed claim support for putting compatibility checks after upload. All five final drafts scored correct diagnostically and all five rows handed off. R25's four completed reviews moved from a claim-support problem to the same missing action. The client observed longer drafting despite fewer admitted spans. Seven returned drafts took 38.874–45.918 s in R25 against 16.371–44.408 s across the six returned R24 drafts. The traces leave provider queue and inference time unmeasured. [R24 attempt traces](kb-rerun24-diagnosis-evidence.md#durability-evidence)

## Timeout ledger

Counts come from `attemptTraces[*].timedOutStage` and were reconciled with `metrics.py` and `final-metrics.txt`. Verifier HTTP 400s count `modelFailures` with `stage: review` and `status: 400`. All R25 cutoffs were retryable, with a synthetic Core handoff. [Deadline settings](../../packages/agent-loop/src/deadline.ts) · [Harness retry and handoff scoring](../../scripts/eval-golden.ts#L315)

| Group | Attempts | Draft | Review | Timeout attempts | Verifier HTTP 400s |
|---|---:|---:|---:|---:|---:|
| R24 schedule | 59 | 6 | 6 | 12 | 0 |
| R25 clean | 15 | 2 | 1 | 3 | 0 |
| R25 durability samples 2–5 | 32 | 1 | 7 | 8 | 0 |
| R25 GS-140 trigger-off | 3 | 0 | 1 | 1 | 0 |
| R25 GS-030 max control | 3 | 0 | 1 | 1 | 0 |
| R25 fix-4 GS-056 | 5 | 0 | 0 | 0 | 0 |
| **R25 schedule** | **58** | **3** | **10** | **13** | **0** |

GS-018 accounts for six cutoffs, three at each stage, all listed above. R24's 12 were seven for GS-140 (five draft, two review), three for GS-056 fix 4 (one draft, two review), one GS-018 review and one GS-163 review. The remaining seven R25 cutoffs were all review.

| R25 checkpoint / attempt | Draft / review (s) | What happened next |
|---|---|---|
| `sample-3-GS-030` A1 | 6.435 / 24.004 | Medium A2 delivered correct. |
| `sample-4-GS-030` A1 | 5.744 / 24.005 | Medium A2 added an unsupported escalation and handed off. |
| `sample-3-GS-140` A1 | 17.225 / 24.004 | Trigger on, retried. |
| `sample-3-GS-140` A2 | 12.153 / 24.003 | Trigger on, A3 delivered correct. |
| `sample-4-GS-140` A1 | 9.761 / 24.006 | Trigger on, A2 delivered correct. |
| `trigger-off-2-GS-140` A1 | 32.223 / 22.752 | Trigger off, A2 lacked ticket guidance and handed off. |
| `max-1-GS-030` A1 | 9.253 / 24.005 | Max A2 delivered correct. |

Six review calls reached the 24 s cap. Four used shorter remaining delivery windows, including three GS-018 drafts of 42.804–44.458 s. The turn budgets reserve 9 s for review at the draft cutoff and 3 s for delivery. Client elapsed time includes the provider wait. [Turn deadline](../../packages/agent-loop/src/deadline.ts) · [Review cutoff](../../packages/agent-loop/src/index.ts#L697)

## Durability and paired controls

Clean is the first sample of each five-sample cohort. `C` is a correct cited delivery, `H` a scored handoff and `U` unscored. Parentheses show the number of attempts where there was a retry.

| Item | Clean | Sample 2 | Sample 3 | Sample 4 | Sample 5 | R25 correct / first-attempt correct | R24 correct |
|---|---|---|---|---|---|---:|---:|
| GS-018 | U (3) | H (3) | H (2) | H | H | 0/5 / 0/5 | 0/5 |
| GS-023 | C | H | C | C | C | 4/5 / 4/5 | 2/5 |
| GS-030 | H | C | C (2) | H (2) | C | 3/5 / 2/5 | 3/5 |
| GS-062 | C | C | C | C | H | 4/5 / 4/5 | 0/5 |
| GS-094 | C | C | C | C | C | 5/5 / 5/5 | 4/5 |
| GS-140 | C | C | C (3) | C (2) | C | 5/5 / 3/5 | 1/5 |

The six cohorts delivered 21/30 correct, with 18 on attempt one. The 24 repeat rows alone delivered 17/24 correct. The other repeat handoffs are GS-023 sample 2, which mentions waiting and retrying generally, then begins its recurrence branch directly with DNS setup. Review required wait and retry as an explicit condition before that setup. GS-030 sample 4 A2 failed on the added instruction to contact support. GS-062 sample 5 gave the issue-specific route and invoked the Minecraft reporting branch, but explicitly asked for a complete game screenshot only. The review issue specifies a complete WinMTR screenshot too. All three diagnostic draft scores were correct. [Durability report](kb-rerun25.md#durability)

The GS-030 effort comparison has seven medium draft calls and three max draft calls, all with matching hashes, 4,637 prompt bytes, four read windows, the same three spans, the same 3,072-token cap and client-visible `default`. Median first-draft times were 4.955 s at medium and 13.179 s at max. Medium had 2/5 first-attempt correct and 3/5 overall, max 0/2 and 1/2. All three cutoffs were in review. `max-2-GS-030.json` shows `invalid_verifier_reference` for `[debug/googledns.md:1-12` with the closing bracket missing. Max ran in two early controls before the four medium repeats. [Effort experiment](kb-rerun25.md#gs-030-effort-experiment)

GS-140 trigger on admitted both policy articles on all eight attempts, with three searches, two reads, three spans and 4,313 prompt bytes. Trigger off admitted neither on three attempts, with one search, three reads, 12 spans and 7,826 bytes. Both off rows were scored handoffs. Their final reviews identified missing after-sales routing, same-ticket wait for technical staff and no-speedup guidance. Trigger on passed all five eventually, with three first-attempt completions. The three trigger-on review cutoffs all reached the 24 s cap after drafts of 9.761–17.225 s. The evidence and prompt differ between arms. [Trigger timings](kb-rerun25.md#gs-140-trigger) · [Live-state handoff control](../../scripts/test/vercel-agent.test.ts#L541)

## Fix-4 GS-056 every attempt

`rerun24/fix4-*-GS-056.json`, `fix4-*-GS-056.json` and both `fix4-index-verified.json` files record the same restored corpus digest `04003b9bec88…`. Across all 13 attempts the ordered 11 admitted spans match, including `panel/common/settings.md:1-16` as `P1`. That span places Reinstall Server under Settings and makes the reset conditional on deletion of all server data. Both rounds used Luna max and observed `default` on responses. R24 recorded 4,449 draft prompt bytes throughout. R25 recorded 4,212 bytes and identical within-round draft hashes (`cd51ba8c8824…`). R24 lacks a draft prompt hash. [R24 fix-4 report](kb-rerun24.md#fix-4-corpus-check) · [R25 fix-4 report](kb-rerun25.md#fix-4-corpus-check)

| Round / sample / attempt | Draft / review / turn (s) | Draft evidence and disposition |
|---|---|---|
| R24 S1 A1 | 27.382 / 24.006 / 52.638 | All data → reset, reinstall → restart, Settings implicit. Review cutoff, retry. |
| R24 S1 A2 | 46.884 / — / 47.305 | Draft cutoff, no text, retry. |
| R24 S1 A3 | 29.405 / 2.979 / 32.684 | All data → reset, explicit Settings → reinstall → restart. Gate and local pass, correct. |
| R24 S2 A1 | 26.534 / 4.596 / 32.594 | All data → reset, explicit Settings → reinstall → restart. Gate and local pass, correct. |
| R24 S3 A1 | 27.423 / 17.210 / 46.143 | All data → reset, explicit Settings → reinstall → restart. Gate and local pass, correct. |
| R24 S4 A1 | 29.549 / 2.705 / 33.695 | All data → reset, “click Reinstall Server in the panel,” restart. Gate and local pass, correct with Settings implicit. |
| R24 S5 A1 | 30.728 / 24.004 / 55.962 | All data → reset, reinstall → restart, Settings implicit. Review cutoff, retry. |
| R24 S5 A2 | 27.947 / 13.754 / 42.155 | All data → reset, explicit Settings → reinstall → restart. Gate and local pass, correct. |
| R25 S1 A1 | 16.382 / 2.745 / 20.584 | All data → reset, reinstall → restart, Settings implicit. Gate and local pass, correct. |
| R25 S2 A1 | 13.421 / 3.372 / 17.861 | Same three steps with Settings implicit. Gate and local pass. Judge `covered, partial` for missing Settings. |
| R25 S3 A1 | 15.316 / 2.816 / 19.496 | Same three steps with Settings implicit. Gate and local pass. Judge `covered, covered`, mentions Settings in its rationale. |
| R25 S4 A1 | 11.414 / 8.847 / 21.445 | “If what you deleted was server data … the world has reset” (translated). `claimSupport: false`, `complete: true`. Local completeness passed, gate withheld delivery. Scored handoff. |
| R25 S5 A1 | 9.236 / 3.116 / 13.561 | All data → reset, reinstall → restart, Settings implicit. Gate and local pass, correct. |

Every delivered fix-4 reply cited `panel/common/settings.md:1-16`. Four of five R24 deliveries explicitly named Settings. All four R25 deliveries left the navigation implicit and stated the all-data condition. R25 S4 dropped that condition despite citing `P1`. The shared local reset check looks for reset, reinstall and restart, and the repair adds Settings navigation only when the reinstall-then-restart pattern is absent. Neither reset-specific check changed between these revisions. The general draft and verifier guidance did change. [Reset completeness](../../packages/agent-loop/src/index.ts#L198) · [Reset repair](../../packages/agent-loop/src/index.ts#L243)

## Gate replays and fixed-text judge scores

`gate-replay.json` contains eight controls. Seven reached the verifier because the gate rejected the unadmitted range before review. `gate-replay-transfer.json` contains one further review. All eight review calls returned `gpt-6.2-sol` with zero timeouts and zero HTTP 400s. [Gate replay report](kb-rerun25.md#gate-replay-and-paraphrases)

| Saved control | Gate result |
|---|---|
| `version-paraphrase` | Passed with Settings → Reinstall. |
| `transfer-paraphrase` | `claimSupport: true`, `complete: false`. “Did not directly answer whether compression is needed” (translated). |
| `transfer-paraphrase-compression` | Passed after adding “the folder can be uploaded directly, without first compressing it” (translated). The replay source changes only that answer. The question and the two matched spans, `panel/manage/upload.md:6-30` and `panel/common/sftp.md:1-47`, match. |
| `first-purchase-notice` | Passed with activation notice and Reset Password click. |
| `reversed-meaning` | `unsupported_claim` for reversed panel and SFTP guidance. |
| `omitted-full-span-step` | `incomplete_answer` for omitting Settings → Reinstall despite citing its span. |
| `unadmitted-range` | `wrong_lines` for `panel/manage/upload.md:6-31`. Zero review calls. |
| `unsupported-claim` | `unsupported_claim` for guaranteed restoration. |
| `missing-key-point` | `incomplete_answer` for omitting Settings → Reinstall. |

The five negative controls failed for their intended reasons. The compression addition changed the coverage of that positive replay only. The clean, durability and fix-4 scores come from separate checkpoints. The live GS-166 draft already answered compression and failed on third-party sign-in. The transfer fixture asks about folder upload, whereas GS-018 asks how to retry a single JAR. [Clean traces](#clean-attempt-traces)

`gs023-blind-rescore.json` and its R24 counterpart record the same five saved R21 answers. Under `step10-v1`, both rounds covered cache flush and Google DNS on all five. R24 covered the conditional rejoin on answers 1, 4 and 5, leaving 2 and 3 partial. R25 marked the point partial on all five and returned `gpt-6.2-sol` on each first call. R24 lacks historical per-call judge model and request IDs. [R25 blind rescore](kb-rerun25.md#gs-023-blind-rescore)

## Model route and Fast

All 12 completed clean reviews and all 12 clean judge calls show requested `gpt-6.1-sol` and returned `gpt-6.2-sol`. The judge calls are five delivery scores and seven draft diagnostics. The 58 scheduled attempts made 55 review calls, with 45 completed at the same returned model and ten cutoffs before metadata. All 45 scheduled judge calls returned `gpt-6.2-sol`, including diagnostics. R24 recorded the same mismatch for 46 completed reviews. Its two synthetic route probes also reproduced the mismatch, including through the judge function. [R24 route evidence](kb-rerun24-diagnosis-evidence.md#model-route-and-fast) · [R25 route report](kb-rerun25.md#reviewer-and-judge-routes)

`full-clean.json` gives a paired review and delivered-answer score for GS-023 A1. The Fast row is from `fast-route.json`. Times are UTC on 2026-11-24. Header IDs are distinct from the caller-sent values.

| Call and start | Request → response | Sent `x-client-request-id` | Returned `x-client-request-id` | Response `x-request-id` |
|---|---|---|---|---|
| GS-023 review, 13:20:05.214 | 6.1-sol low → 6.2-sol low, `default` tier | `16d4a1ab-a8cc-4553-b9d2-2b417ddcf50c` | `1bdd335d-b894-4c3b-8367-33400a497428` | `84900a3c-c82f-4b24-a9f7-e2ee75d539df` |
| GS-023 judge, 13:20:19.690 | 6.1-sol effort unset → 6.2-sol medium, `default` tier | `cc2c3a15-17c9-4954-bfca-13b4dd51ad4d` | `af7e6600-bf80-49cb-a0d3-135a85f89323` | `107c4db6-cc57-447f-a7e0-ca4bd0e39bf0` |
| Fast probe, 13:54:01.164 | Luna max `fast` → Luna max `default`, HTTP 200 in 2.075 s | `450b95bb-7dbd-49bb-9d9e-b85c26ffb5c6` | `a8bb0aa4-5e71-4011-8577-325ef05e84b6` | `8a412ad2-929a-4c3e-b318-8fcbed65d1ae` |

`routes.md`, `routing-source.md` and the local sub2api checkout `01629d7ff` identify channel mapping, account scheduling, forwarding and response rewrite as possible transformation points. `backend/internal/service/openai_gateway_usage.go` records `account_id`, `request_id`, `upstream_request_id`, `requested_model`, `upstream_model` and `upstream_response_model`. `openai_gateway_forward.go` and `openai_gateway_request_body.go` show `fast` normalization to `priority` and account-scoped policy, and separate request and observed upstream tiers. The local service and middleware tests passed per `gateway-source-tests.log`. The deployed revision, mapping and selected account are absent from the client evidence. Gateway-owner records can correlate the IDs with those fields, egress request and raw upstream response, and the upstream provider's serving or usage record can establish the effective backend and tier. [Verifier model](../../packages/agent-loop/src/model.ts#L55) · [Judge request and trace](../../scripts/lib/semantic-judge.ts#L20)

All 55 scheduled draft responses carrying tier metadata returned `default`. Three draft cutoffs have no response tier. The Fast probe saved `clientFast: false`, `confirmedFast: false` and null account, effective policy and upstream tier fields. `run-controls.sh` and `schedule.mjs` require the account, effective rule and fast or priority observations on client and upstream legs before the benchmark. There is no R25 benchmark manifest or checkpoint. [R25 Fast route](kb-rerun25.md#fast-route)
