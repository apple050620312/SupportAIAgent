# Rerun 22 diagnosis evidence

## Checkpoints and scoring

The artifacts below are in the ignored `eval-results/` directory. The rerun 22 answer code is from `ea0d6e3`, merged at `d2ce9db`. The full run and usable repeats record the clean digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, 72 articles and 570 passages. The targeted GS-056 control records the fix-4 digest `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. [Run report](kb-rerun22.md)

| Sample | Checkpoint or manifest |
|---|---|
| Rerun 20 clean 6.1-sol | `golden-2026-11-24T04-40-33-409Z-13.json` |
| Rerun 21 clean 6.1-sol, resumed | `golden-2026-11-24T05-23-38-224Z-13.json` |
| Rerun 21 clean Luna | `golden-2026-11-24T05-49-19-911Z-13.json` |
| Rerun 22 full, summary and manifest | `rerun22-clean-combined.json`, `rerun22-full-manifest.json` |
| Batch A, five items | `golden-2026-11-24T07-23-30-554Z-5.json` |
| Batch B, four items | `golden-2026-11-24T07-23-30-538Z-4.json` |
| Batch C, four items | `golden-2026-11-24T07-23-30-454Z-4.json` |
| Repeats and fix 4 | `rerun22-repeat-manifest.json`, `rerun22-fix4-manifest.json`. Each resumed arm has an `output` path under `rerun22-checkpoints/`. |
| Gate and blind judge replays | `rerun22-gate-replay.json`, `rerun22-gs023-blind-rescore.json` |

Sorting the three batches' `results` by ID gives the combined checkpoint's 13 rows. Each item has `outcome: "resolved"` and is classified docs-answerable. The score counts use `semantic.verdict`, with null counted as unscored. Handoff counts use `handedOff && !error`. The scoring code records timed-out rows as `agent-error` and unexpected handoffs as `wrong/lifecycle` before calling the judge. The separate `handoffContentVerdict` grades the saved draft and has no effect on the lifecycle score. [Semantic scoring](../../scripts/lib/semantic-judge.ts#L50) · [Harness](../../scripts/eval-golden.ts#L291)

| Clean run | Correct | Partial | Wrong | Unscored | Handoffs | Delivered answers | Answer attempts |
|---|---:|---:|---:|---:|---:|---:|---:|
| Rerun 20 6.1-sol | 6 | 3 | 3 | 1 | 3 | 9 | 15 |
| Rerun 21 6.1-sol | 5 | 2 | 4 | 2 | 3 | 8 | 17 |
| Rerun 21 Luna | 3 | 3 | 4 | 3 | 3 | 7 | 20 |
| Rerun 22 Luna | 1 | 0 | 7 | 5 | 7 | 1 | 28 |

## Full-run attempt traces

Times are `modelCallsMs[0]` and `verificationMs`, in seconds. Each row lists attempts in order. A dash means the verifier never started. Each attempt had one Luna call. All timeout attempts recorded `TimeoutError` with no HTTP status. Drafting timeouts had no returned draft. Verification timeouts followed a recorded `stop` draft. For the timed-out attempts `delivery` is `error`, `answer` is empty and `citationVerdict` is null. [Trace collection](../../scripts/eval-golden.ts#L172)

| Item | Luna / verifier seconds by attempt | Attempt outcomes | Handoff draft judge |
|---|---|---|---|
| GS-018 | 58.116 / —, 46.311 / 12.407, 54.795 / 4.308 | Drafting timeout, verification timeout ×2 | — |
| GS-023 | 58.795 / —, 58.886 / —, 59.095 / — | Drafting timeout ×3 | — |
| GS-030 | 57.340 / —, 59.017 / —, 59.123 / — | Drafting timeout ×3 | — |
| GS-049 | 58.724 / —, 33.884 / 4.299 | Drafting timeout, `unsupported_claim` | Wrong, partial / covered |
| GS-053 | 50.711 / 8.280, 57.245 / 2.282, 45.330 / 14.376 | Verification timeout ×3 | — |
| GS-056 | 33.241 / 3.750 | Citation gate passed, runner completeness false, handoff | Wrong, missing / missing |
| GS-062 | 36.088 / — | `wrong_lines` for `[store/services/duplicate-tickets.md:6-13]` | Wrong, all three points covered |
| GS-084 | 27.675 / 3.424 | Delivered, pass, correct | — |
| GS-094 | 43.064 / 15.786, 31.260 / 18.228 | Verification timeout, `unsupported_claim` | Correct, both points covered |
| GS-108 | 31.682 / 27.269, 27.783 / 9.002 | Verification timeout, `unsupported_claim` | Correct, both points covered |
| GS-140 | 44.792 / 4.596 | `unsupported_claim` | Correct, all three points covered |
| GS-163 | 54.665 / 4.501, 59.700 / —, 41.867 / 3.599 | Verification timeout, drafting timeout, `unsupported_claim` | Correct, activation covered |
| GS-166 | 58.897 / —, 59.688 / —, 54.529 / 5.179 | Drafting timeout ×2, verification timeout | — |

- Eleven drafting timeouts and nine verification timeouts consumed 1,201.6 s of cumulative attempt time. The five unscored rows account for 15 of those attempts, split nine drafting and six verification. The other five timeouts came before eventual handoffs. Successful Luna calls took 27.675–57.245 s in the full run, with a median of 43.064 s. Calls cut off during drafting had already waited 57.340–59.700 s. The timer includes provider wait and the traces lack a queue/inference split.
- Five final gates returned `unsupported_claim` and one returned `wrong_lines`. `unsupported_claim` is also returned for an empty verifier reference list or a verifier reference absent from the draft. It has `citation: null` and no claim-level reason. GS-049 and GS-163 had verifier `complete: true` alongside that failure. GS-056 had verifier `complete: true` and a passing gate, followed by runner `answerComplete: false`. GS-084 was the sole final answer evaluated for delivery, and the judge scored it correct. All eight judge calls in the clean batches returned judgments, including the seven diagnostic draft calls. [Citation gate](../../packages/agent-loop/src/citation-gate.ts#L39) · [Runner delivery checks](../../packages/agent-loop/src/index.ts#L519)

## Draft and admission excerpts

- **GS-018.** Attempts 2 and 3 recorded SFTP fallback tied to `practice/install/mod.md:101-183`. Attempt 3 distinguishes the panel upload error from the game log and leaves the cause unverified. The two drafts reached the verifier, without a saved verifier verdict. Repeats 4 and 5 failed claim support. Their draft judge marked troubleshooting order partial because the draft starts with mod compatibility before checking the upload connection.
- **GS-023.** Repeat 5 cites `[debug/googledns.md:21-32]`, which was absent from the admitted set. It gives cache flush, Google DNS, and says that if DNS was the only blocker the original address should normally work after DNS updates. The draft judge marked all three points covered. The five saved R21 drafts all scored partial on blind replay with `covered, covered, partial`, including the two previously scored correct. The blind file records the same `step10-v1` rubric and `gpt-6.1-sol` judge.
- **GS-030.** Each attempt recorded 4 searches, 8 successful article reads, 21 unique search-result spans, 28 unique admitted spans and a 33,260-byte first prompt. The 28 break down as 15 connection, 6 WARP, 6 Google DNS and 1 automatic route switching. The last attempt's uncollapsed search results contain 27 hits for those 21 unique spans. The four queries are the main question and focused connection, DNS and route searches. The eight companion calls all request lines 1–120 and cover four unique sources, so four repeat a read. The 28-span count collapses identical labels for telemetry. Prefetch serializes `found.matches` directly, so it can include duplicate spans that the verifier's separate evidence map deduplicates. In an offline control, two seed sections from one article issued two identical requests serially and appended the same third section twice. [Search fanout and companion expansion](../../packages/agent-loop/src/index.ts#L337) · [Trace deduplication](../../scripts/eval-golden.ts#L163)
- **GS-049 and GS-053.** GS-049 documents end-of-cycle cancellation and no next invoice, suggests downloading and verifying a backup, and defers reuse. It includes a 24-hour timing claim about the separate immediate-cancellation option. The verifier recorded `unsupported_claim` without locating a clause. The draft judge wanted a categorical nonretention statement under the provisional reference. GS-053's three drafts give conditional renewal steps and defer eligibility and file status. Its last draft advises downloading and verifying a backup while files are accessible. The disputed post-expiry timelines were withheld in both items.
- **GS-056.** On clean, `panel/common/settings.md:1-14` lists reinstall but lacks the world-reset procedure. The draft asks staff to verify the impact and fails the runner's required task coverage. Offline, `repairRequiredTaskDraft` leaves the clean draft intact and `answerCompletenessCheck` returns false. The fix-4 trace uses `panel/common/settings.md:1-16`, passes both checks and delivers both the reset and restart points. Its file is `rerun22-checkpoints/fix-4-GUjn4F/eval-results/golden-2026-11-24T07-57-30-947Z-1.json`. [Local completeness and repair](../../packages/agent-loop/src/index.ts#L155)
- **GS-062.** The cited `duplicate-tickets.md:6-13` combines the admitted `6-9` and `10-13` ranges. The gate short-circuits before verification even though the draft also cites admitted spans and scopes the general support exclusion. The draft judge marks all three points covered but gives a wrong verdict with a handoff rationale. The recorded expected lifecycle is resolved. Blocks 4 and 5 repeat `wrong_lines`. Block 2 fails semantic claim support after a draft timeout.
- **GS-084, GS-094, GS-108 and GS-163.** GS-084's cited password reset path passes and scores both points. GS-094's withheld draft applies the version then reinstalls, with additional backup, Java and availability guidance. Block 5 uses the unadmitted `startup.md:26-39` range. GS-108's draft gives reinstall and requests the latest console error if it still fails. The synthetic logs read returned HTTP 404. The runner treated that read as non-essential for the documented procedure, and the recorded failure was `unsupported_claim`. GS-163's draft puts activation before startup and adds account setup and panel steps. It has no staff marker and the runner's completeness check passed. The verifier's `unsupported_claim` still prevents delivery.
- **GS-166.** Block 4 delivers after two timeouts and passes with `upload.md:6-30` and `sftp.md:1-47`. The draft says to use SFTP for folders and gives the connection steps. It omits drag-and-drop and destination by file type. The delivered-answer judge scored it partial with `covered, partial, missing`. The exact cutoff and destination rules are still pending.

## Deadline and cancellation probes

`createVercelTicketRunner().run` authenticates and checks session state, then creates a 60 s timer. Inside that timer it opens history, performs prefetch, awaits `agent.generate`, calls the verifier and revalidates authorization before returning a reply. The deadline branch can return the previously saved progress reply only after `assertCurrent()`. The harness issues one new context before each attempt. Tokens have a 60 s lifetime from issuance in whole seconds. A token issued 900 ms into a second expires 59.1 s later. The deadline fallback therefore revalidates an expired token in this harness. The harness's outer catch leaves `answer` and `citationGate` unset and retries on the earlier model timeout. Traces retain the provider timeout and omit the outer exception details. [Runner deadline and fallback](../../packages/agent-loop/src/index.ts#L270) · [Reply and handoff](../../packages/agent-loop/src/index.ts#L537) · [Token expiry](../../packages/trusted-context/src/index.ts#L18) · [Harness catch and retry](../../scripts/eval-golden.ts#L239)

A local probe used the runner with a synthetic ticket and draft, and mocked the clock and verifier. An injected verifier abort while the token was current returned the saved progress reply with `verification_unavailable`. Injecting the abort at 60 s threw `InvalidTicketContextError` before returning progress. Returning a passing review 59.2 s after a token issued 900 ms into a second also threw `InvalidTicketContextError`, with the runner timer still live. This reproduces the expiry interaction independently of provider wait. The live traces lack the outer exception name. [Mock host](../../scripts/lib/vercel-agent-demo.ts#L26)

`SupportCoreClient.call` composes a 10 s request signal with the turn signal for fetch. The synthetic fetch in `eval-golden.ts` awaits `app.inject` without wiring that signal to the work. The Core KB adapter uses its own 30 s embedding fetch signal. The post-search `semanticRelevance.similarity` call also receives no turn signal. An embedding that stalls on these paths can run past the intended phase cutoff. In the recorded full-run timeouts the model-stage timer expired after prefetch had produced admissions. [Core client](../../packages/agent-loop/src/core.ts#L22) · [Eval fetch](../../scripts/eval-golden.ts#L224) · [Embedding adapter](../../apps/support-core/src/adapters/semantic-knowledge-provider.ts#L29)

## GS-140 trigger pairs

Both articles means `store/discord.md` and `store/services/duplicate-tickets.md`. Times are seconds. The repeat manifest resolves the resumed checkpoint paths.

| Arm | Searches / reads | Unique admissions | Luna prompt bytes | Luna / verifier times | Result |
|---|---|---|---:|---|---|
| Pair 1 on, full | 3 / 8 | 23, both articles | 24,229 | 44.792 / 4.596 | `unsupported_claim`, handoff |
| Pair 1 off, manifest only | — | — | — | 100.851 process wall | Unscored |
| Pair 2 off | 1 / 8 each | 19 each, neither article | 27,230 | 58.046 / —, 58.762 / —, 55.601 / 3.594 | Two drafting timeouts, one verifier timeout |
| Pair 2 on | 3 / 8 | 23, both articles | 24,229 | 52.156 / — | `wrong_lines`, handoff |
| Pair 3 on | 3 / 8 | 23, both articles | 24,229 | 40.540 / — | `wrong_lines`, handoff |
| Pair 3 off | 1 / 8 | 19, neither article | 27,230 | 20.478 / 8.711 | `incomplete_answer`, handoff |

All three on drafts give the equivalent of “請在原單等技術人員”, route product issues to after-sales and say duplicates do not speed up handling. All have a staff marker and all three draft judgments are correct. The full draft cites separate ranges for the policy. The gate recorded `claimSupport: false` and `unsupported_claim`, a code that also covers unusable verifier references. In addition to policy, the draft discusses log interpretation, loader compatibility and manual installation. The failed material claim or reference is unidentifiable from the checkpoint. The two resumed on drafts cite `duplicate-tickets.md:6-13` and the gate stops at label validation before calling the verifier. The admitted policy ranges were `6-9` for duplicates, `10-13` for waiting and `14-17` for routing. [Verifier checks](../../packages/agent-loop/src/citation-gate.ts#L44)

An offline replay used the original input, confirmed against `datasetSha256`, and the saved admitted labels. Both `asksForInstallerState` and the account-blocker cue were false for GS-140. Giving the full draft a mocked passing review still failed local completeness. Giving both repeats the separate admitted labels and a mocked passing review cleared the citation check. Pair 2 still failed local completeness and pair 3 passed it. In the full draft and pair 2 the routing regex missed the after-sales wording because it requires a nearby `客服單`, `工單` or `ticket` and misses phrases such as `售後單` or `售後服務類別`. All three on drafts passed the no-speedup regex. That second blocker is from replay. The live code short-circuited on the gate result. The explicit live installer-state control passed the citation gate and still handed off. [Policy completeness and installer check](../../packages/agent-loop/src/index.ts#L155) · [Delivery predicate](../../packages/agent-loop/src/index.ts#L531) · [Installer-state control](../../scripts/test/vercel-agent.test.ts#L405)

## Durability and gate replay

The five scheduled samples per item include the full run. Parentheses give attempts where a trace is usable. The manifest retained pair 1 off and block 2 for GS-018 and GS-023. The two legacy `07-33-11-65*.json` files have empty results and pair 1 off shares a path with block 2 GS-023. The summaries establish those three outcomes and tier counts. Their per-attempt paths and GS-018's delivery flag are unavailable. The 22 resumed files have 42 traceable attempts, split 22 drafting timeouts, 5 verification timeouts, 14 handoffs and 1 delivery. Across all 25 repeats there were 0 correct, 1 partial, 15 wrong and 9 unscored.

| Item | Full | Block 2 | Block 3 | Block 4 | Block 5 | Correct |
|---|---|---|---|---|---|---:|
| GS-018 | Unscored (3) | Wrong | Unscored (3) | Handoff (1) | Handoff (2) | 0/5 |
| GS-023 | Unscored (3) | Unscored | Unscored (3) | Unscored (3) | Handoff (1) | 0/5 |
| GS-062 | Handoff (1) | Handoff (2) | Unscored (3) | Handoff (1) | Handoff (1) | 0/5 |
| GS-094 | Handoff (2) | Unscored (3) | Handoff (3) | Handoff (1) | Handoff (1) | 0/5 |
| GS-166 | Unscored (3) | Unscored (3) | Handoff (1) | Partial (3) | Handoff (1) | 0/5 |

In `rerun22-gate-replay.json`, the version paraphrase passed with three admitted labels. The transfer paraphrase verified claim support but missed the expected pass on completeness. All five negative controls failed as expected. The reversed meaning and unsupported restoration promise failed claim support. The omitted procedural step and missing key point failed completeness. The unadmitted upload range failed label validation. The four R21 saved drafts failed their replays. The 6.1-sol GS-094 draft used an unadmitted range, and the other three failed claim support. The positive version control and live GS-166 partial establish that paraphrase can pass. The GS-166 omissions establish the difference between a gate pass and a correct delivery. [Run report](kb-rerun22.md#paraphrase-tolerant-gate)

## Fast and concurrency

| Scope | Calls with settings | Request tier | Response tier | Response effort | Unknown settings |
|---|---:|---|---|---|---:|
| Full batches | 17 | 17 Fast | 17 default | 17 max | 11 |
| Repeats, including manifest summaries | 22 | 22 Fast | 22 default | 22 max | 26 |
| Fix 4 | 1 | 1 Fast | 1 default | 1 max | 0 |
| Total | 40 | 40 Fast | 40 default | 40 max | 37 |

Every completed response with settings also records request effort `max`. The harness reads request settings from the SDK's serialized request body following a result. The timeout rows can lack even request metadata. The answer model configuration applies `serviceTier: "fast"` and `reasoningEffort: "max"` through the Responses middleware. With the installed `@ai-sdk/openai` 4.0.110, an offline intercepted request to `/v1/responses` carried `service_tier: "fast"` and `reasoning.effort: "max"`. It omitted `max_output_tokens`. The SDK maps an explicitly set `maxOutputTokens` to that field. [Model configuration](../../packages/agent-loop/src/model.ts#L20) · [Harness metadata](../../scripts/eval-golden.ts#L178)

The local sub2api checkout at `01629d7ff` shows normal `Forward` in `backend/internal/service/openai_gateway_forward.go` and passthrough's `applyOpenAIFastPolicyToBody` in `openai_gateway_request_body.go`. On pass they normalize `fast` to `priority`. A matching filter removes the field, and a block rejects the request. The checkout establishes that forwarding is supported in code. The deployed revision, selected upstream account and effective policy are unverified. A correlated ingress request, routing/account and policy decision, egress tier and upstream response tier would identify the failing hop. The R22 client saw `default` on all 40 responses, so it has zero confirmed Fast deliveries.

| Batch | Process wall (s) | Item time summed (s) | Attempt time summed (s) | Timeouts | Time in timed-out attempts (s) |
|---|---:|---:|---:|---:|---:|
| A | 580.461 | 576.663 | 542.384 | 7 | 420.484 |
| B | 546.933 | 543.305 | 495.511 | 7 | 420.619 |
| C | 552.910 | 549.585 | 494.356 | 6 | 360.538 |
| Sum | 1,680.304 | 1,669.553 | 1,532.251 | 20 | 1,201.641 |

The batches started within 1 ms of each other. The enclosing manifest measured 580.629 s. Each batch's serial item loop includes answer retries, backoff and judging. The 137.302 s between summed item and attempt time includes retry backoff and post-attempt scoring. The recorded retries account for 21 s of that gap. The 48 s/item figure in the round brief is an approximate benchmark, giving 624 s, so the observed gap is 43.371 s (7%). The saved R20 and R21 Luna serial checkpoints report 824.397 s and 1,168.774 s respectively under their own configurations. R21 6.1-sol has resume history. None provides a matching serial control. The three-way overlap is visible in the timestamps. Provider contention and the size of any causal speedup remain unmeasured. The manifests record zero 429 responses. [Harness serial loop](../../scripts/eval-golden.ts#L139) · [Backoff and judging](../../scripts/eval-golden.ts#L286)
