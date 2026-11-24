# Golden set docs rerun 22

Rerun 22 scored **1 correct, 0 partial, 7 wrong and 5 unscored**, with **7 handoffs**. GS-084 was the only correct delivery. The round missed the delivery and durability targets.

The live runs used `ea0d6e3` with `gpt-6-luna` answering through sub2api at max effort. Fast was requested and the provider returned the default tier on every response with tier metadata. The pre-delivery verifier and semantic judge used `gpt-6.1-sol`. Semantic scoring used `step10-v1`. The 60-second deadline includes drafting and verification per attempt. Retrieval used official OpenAI `text-embedding-3-small` embeddings over synthetic support sessions.

| Corpus | Articles / passages | Verified digest |
|---|---:|---|
| Clean full run and repeats | 72 / 570 | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| Fix 4, targeted GS-056 | 72 / 570 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

## Clean results

| Run | Scheduled | Scored | Correct | Partial | Wrong | Unscored | Handoffs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Rerun 21 6.1-sol | 13 | 11 | 5 | 2 | 4 | 2 | 3 |
| Rerun 21 Luna | 13 | 10 | 3 | 3 | 4 | 3 | 3 |
| Rerun 22 Luna | 13 | 8 | 1 | 0 | 7 | 5 | 7 |

All 13 items fall in the docs-answerable group in the dataset manifest. Rerun 22 delivered 1/13, on the first attempt. The seven wrong rows were lifecycle handoffs on items labeled resolved. The five unscored rows each exhausted three attempts. The strict lexical diagnostic credited 0/13. The three batch files contain every scheduled row and carry the harness's `running` status and exit code 1 because they contain unscored rows. The combined file recomputes the scoring summaries and model settings from those checkpoints. [Rerun 21](kb-rerun21.md)

| Item | Rerun 21 6.1-sol | Rerun 21 Luna | Rerun 22 Luna | Rerun 22 final attempt |
|---|---|---|---|---|
| GS-018 | Correct | Wrong / handoff | Unscored | Timed out during verification after drafting SFTP fallback |
| GS-023 | Correct | Unscored | Unscored | Drafting timed out on all three attempts |
| GS-030 | Unscored | Partial | Unscored | Drafting timed out with 28 admitted spans per attempt. No draft to check for automatic switching or faster DNS updates |
| GS-049 | Wrong | Unscored | Wrong / handoff | Verifier reported an unsupported claim |
| GS-053 | Partial | Partial | Unscored | Drafted three times and timed out during verification each time |
| GS-056 | Wrong / handoff | Wrong / handoff | Wrong / handoff | Clean draft passed verification and deferred the unsupported reset procedure to staff |
| GS-062 | Correct | Unscored | Wrong / handoff | Both policy articles admitted. Combined `duplicate-tickets.md:6-13` label was unadmitted |
| GS-084 | Correct | Correct | Correct | Correct panel password reset path with passing verification |
| GS-094 | Wrong / handoff | Wrong | Wrong / handoff | Draft judge credited version change followed by reinstall. Verifier reported an unsupported claim |
| GS-108 | Partial | Partial | Wrong / handoff | Draft judge credited reinstall and collecting a fresh error. Verifier reported an unsupported claim |
| GS-140 | Unscored | Correct | Wrong / handoff | Explicit wait advice in the withheld draft. Verifier reported an unsupported claim |
| GS-163 | Correct | Correct | Wrong / handoff | Draft judge credited the activation requirement. Verifier reported an unsupported claim after two earlier timeouts |
| GS-166 | Wrong / handoff | Wrong / handoff | Unscored | Timed out during verification after drafting on attempt three |

The full run recorded 20 timeouts across 28 attempts. Eleven drafting calls lacked responses, and nine attempts timed out during verification after drafting. Six of the seven handoffs had failed gates. GS-056 was the exception on the clean corpus. Changes to effort, evidence prefetch, verification and concurrency occurred together, so the movement against either rerun 21 arm cannot isolate their individual effects. The earlier 6.1-sol checkpoint also includes resumed rows. [Rerun 21 checkpoint evidence](kb-rerun21-diagnosis-evidence.md)

## Paraphrase-tolerant gate

The saved positive version control passed with three admitted labels and supported the version-then-reinstall sequence in its own words. The transfer paraphrase was grounded with both upload and SFTP labels, but the verifier marked it incomplete, so that positive control missed its expected pass.

All four saved GS-094 and GS-166 drafts from the two rerun 21 arms still failed replay. The 6.1-sol GS-094 draft used the unadmitted combined range `startup.md:22-33`. Both GS-094 drafts also limited reinstall to Forge. The Luna GS-094 draft and both GS-166 drafts failed claim support. The GS-166 drafts had incomplete destination guidance and the threshold remains disputed. [Rerun 21 diagnosis](kb-rerun21-diagnosis.md#gs-094-and-gs-166-quote-fidelity)

| Negative control | Recorded rejection |
|---|---|
| Reversed panel and SFTP advice | `unsupported_claim` |
| Purported full-span excerpt omitted the required reinstall step | `incomplete_answer` |
| Unadmitted upload line range | `wrong_lines` |
| Unsupported restoration guarantee | `unsupported_claim` |
| Missing required procedure point | `incomplete_answer` |

The three live deliveries with usable traces passed claim support. One was GS-166 in block 4, which used paraphrased SFTP guidance and passed completeness at the gate. The semantic judge scored it partial because it omitted drag-and-drop and the destination-by-file-type point. This is a gap in the gate's completeness check. The live GS-094 drafts in the full run and blocks 3–5 covered the version-then-reinstall sequence according to the draft judge, but three failed claim support and one used an unadmitted range. The verifier records a verdict without identifying the individual claim behind an `unsupported_claim` failure.

## GS-140 trigger pairs

The full-run row supplies pair 1 on. The five scheduled GS-140 repeats complete three pairs. Both policy articles are `store/discord.md` and `store/services/duplicate-tickets.md`. Each recorded attempt had one Luna call. The times below give the duration of each attempt and its first model call in order, in seconds. Model-call time includes provider wait.

| Pair and arm | Searches / reads per attempt | Spans and policy articles | Prompt bytes | First calls (s) | Attempt times (s) | Outcome |
|---|---|---|---:|---|---|---|
| 1 on, full run | 3 / 8 | 23, both | 24,229 | 44.8 | 51.0 | Wrong / handoff |
| 1 off | Unavailable | Unavailable | Unavailable | Unavailable | 100.9 process wall | Unscored |
| 2 off | 1 / 8 | 19 each, neither | 27,230 | 58.0 / 58.8 / 55.6 | 60.3 / 60.0 / 60.0 | Unscored |
| 2 on | 3 / 8 | 23, both | 24,229 | 52.2 | 54.5 | Wrong / handoff |
| 3 on | 3 / 8 | 23, both | 24,229 | 40.5 | 42.0 | Wrong / handoff |
| 3 off | 1 / 8 | 19, neither | 27,230 | 20.5 | 30.8 | Wrong / handoff |

The full on draft took 4.6 s to verify and failed claim support. Both resumed on drafts were rejected before semantic verification for the combined `duplicate-tickets.md:6-13` label. All three on drafts gave explicit wait-for-technical-staff advice, after-sales routing and the no-speedup instruction. The draft judge credited all three points, and all three drafts were withheld. Pair 2 off timed out in verification on its third attempt after two drafting timeouts. Pair 3 off took 8.7 s to verify and failed completeness. The installer-state mock control still hands off even when the policy draft passes the gate. [Installer-state test](../../scripts/test/vercel-agent.test.ts)

The trigger admitted both policy articles on all three on attempts. Neither appeared in the four traceable off attempts. The on prompts were 3,001 bytes smaller in these traces. The first call was 5.9 s faster with the trigger in pair 2 and 20.1 s slower in pair 3. With concurrent work, timeout censoring and only a process-wall measurement for pair 1 off, the samples establish the admission difference and leave the latency effect unresolved.

## Pending retention policy

GS-049's withheld draft gave the documented end-of-cycle cancellation steps, explained the next invoice, and advised downloading and verifying a backup. It deferred reuse to staff and omitted the disputed retention timeline. Its immediate-cancellation timing was tied to the separate cancellation option. The gate rejected the draft for an unsupported claim. The draft judge credited the next-invoice point and penalized the deferral because the provisional reference expects definite nonretention.

All three GS-053 drafts withheld disputed retention timers and case-specific restoration eligibility. They described conditional renewal steps and asked staff to verify the service and data state. The last draft advised a verified local backup if the files were still accessible. All three verification attempts timed out. The two items demonstrate withholding in the observed drafts. Supported delivery under the pending-policy wording remains unverified. [Retention diagnosis](kb-rerun21-diagnosis.md#gs-049-retention-and-reference-conflict)

## GS-023 blind rescore and durability

The blind 6.1-sol rescore used the same point rubric on the five saved rerun 21 drafts. All five scored partial with `covered, covered, partial` for cache flush, Google DNS and conditional rejoin. The original two correct scores became partial and the original three partials stayed partial. The fixed drafts establish that judge interpretation contributed to the original split. In R22, the block 5 draft explicitly said that rejoining at the original address should work if DNS was the only blocker. The draft judge credited all three points, and the gate withheld the draft for the unadmitted `googledns.md:21-32` range. The other four samples were unscored.

The clean full run is sample one. Four additional blocks gave each target five scheduled samples. Parentheses show attempts where a usable item trace is available. The resume retained three manifest summaries and ran the 22 remaining samples in separate checkpoint directories. Pair 1 off and block 2 GS-023 shared a legacy checkpoint path. The three retained samples use their manifest summaries, including the block 2 GS-018 outcome.

| Item | Full | Block 2 | Block 3 | Block 4 | Block 5 | Correct deliveries |
|---|---|---|---|---|---|---:|
| GS-018 | Unscored (3) | Wrong | Unscored (3) | Wrong / handoff (1) | Wrong / handoff (2) | 0/5 |
| GS-023 | Unscored (3) | Unscored | Unscored (3) | Unscored (3) | Wrong / handoff (1) | 0/5 |
| GS-062 | Wrong / handoff (1) | Wrong / handoff (2) | Unscored (3) | Wrong / handoff (1) | Wrong / handoff (1) | 0/5 |
| GS-094 | Wrong / handoff (2) | Unscored (3) | Wrong / handoff (3) | Wrong / handoff (1) | Wrong / handoff (1) | 0/5 |
| GS-166 | Unscored (3) | Unscored (3) | Wrong / handoff (1) | Partial (3) | Wrong / handoff (1) | 0/5 |

All 25 repeats, including the five GS-140 arms, produced 0 correct, 1 partial, 15 wrong and 9 unscored. None of the durability targets met the five-delivery bar. GS-018's final two drafts distinguished the upload error from the game logs and included SFTP fallback. The judge wanted the upload connection checked before mod compatibility. GS-062's three scored repeat drafts covered the after-sales exclusion and no-speedup advice. Two used the same unadmitted combined range as the full run and one failed claim support. Of the three full-run controls, GS-084 delivered correctly while GS-108 and GS-163 handed off after drafting the judged points.

## Fix-4 corpus check

The clean GS-056 sample handed off with the reset procedure absent from the corpus. After the repeats, the settings article was restored from the backup containing the world-reset sentence. The index was rebuilt with official embeddings, verified against the restored corpus, and installed at digest `04003b9b`. GS-056 delivered correctly on its first attempt in 42.5 s, with a passing settings citation and judge credit for restart and world reset. The working corpus and index are left at fix 4.

## Fast tier and concurrency

| Phase | Calls with Fast requested in trace | Responses at default | Responses at Fast / priority | Responses at max effort | Calls with missing settings metadata |
|---|---:|---:|---:|---:|---:|
| Clean full | 17 | 17 | 0 | 17 | 11 |
| Clean repeats, including retained summaries | 22 | 22 | 0 | 22 | 26 |
| Fix 4 | 1 | 1 | 0 | 1 | 0 |
| Total | 40 | 40 | 0 | 40 | 37 |

The answering configuration requested Fast and max effort for every Luna call. The provider downgraded all 40 responses with recorded metadata to `default` and returned `max` effort on all 40. Calls without captured metadata have unknown response settings. The run records zero confirmed Fast responses.

The three full batches of 5, 4 and 4 items took **580.5 s, 546.9 s and 552.9 s**. The parallel phase took **580.6 s wall-clock**, or **44.7 s per scheduled item**. The approximate serial baseline of 48 s per item gives 624 s for 13 items, so this run finished about **43 s sooner (7%)** against that benchmark. The batch durations sum to 1,680.3 s, including time spent running concurrently. A same-configuration serial run would be needed to isolate the speedup. The manifests record zero HTTP 429s and no rate-limit-driven serial fallback.

## Owner decisions

Voluntary cancellation and nonpayment still need separate rulings on retention, deletion timers, backup availability and restoration eligibility. GS-166 still needs approved destinations by file type and the panel upload threshold. Section 5 of the conventions report remains pending. [Conventions report](kb-conventions-report.md#5-conventions-versus-procedures)

## Saved evidence

The ignored `eval-results/` directory holds the full, repeat and fix-4 manifests, the recomputed `rerun22-clean-combined.json`, `rerun22-gate-replay.json` and `rerun22-gs023-blind-rescore.json`. The full manifest identifies the three `golden-2026-11-24T07-23-*.json` batch checkpoints. The repeat and fix-4 manifests identify the isolated checkpoints for the resumed samples and GS-056.
