# Rerun 19 diagnosis evidence

Primary sources are `eval-results/golden-2026-11-24T03-21-46-627Z-13.json` (final clean), `eval-results/golden-2026-11-24T03-30-32-959Z-2.json` (final controls), and `eval-results/golden-2026-11-24T03-30-32-959Z-1.json` (final fix 4). Repeat-block logs are under `~/workspace/tmp/rerun19/`.

## Final checkpoint traces

| Item | Attempts and timing | Model failures | Evidence/admission | Outcome |
|---|---|---|---|---|
| GS-018 | 60.1, 60.0, 60.0 s | 3 `TimeoutError` | 8 retrieved, 17 admitted each attempt | unscored |
| GS-023 | 59.4 s | none | 24 retrieved, 31 admitted | partial |
| GS-030 | 60.0, 60.0, 60.0 s | 3 `TimeoutError` | 21 retrieved, 28 admitted each attempt | unscored |
| GS-049 | 52.4 s | none | 8 retrieved, 9 admitted | correct |
| GS-053 | 42.2 s | none | 8 retrieved, 26 admitted | partial |
| GS-056 | 49.0 s | none | 11 retrieved, 21 admitted | wrong / handoff |
| GS-062 | 51.7 s | none | 18 retrieved, 30 admitted | wrong / handoff |
| GS-094 | 60.0 s then 50.7 s | 1 `TimeoutError` | 8 retrieved, 18 admitted on both | partial |
| GS-108 | 42.8 s after retry-enabled run | none in final attempt | completed delivery | correct |
| GS-140 | 32.5 s | none | 8 retrieved, 19 admitted | wrong |
| GS-166 | 48.1 s | `AI_APICallError` | 10 retrieved, 24 admitted | unscored / agent error |

The final clean checkpoint remained marked `running` after all 13 rows were saved. The report's 4/3/3/3 counts include GS-166 among unscored. Timing excludes judge time and retry backoff.

## GS-062 evidence

Both attempts admitted `store/discord.md:6-43` and `store/services/duplicate-tickets.md:6-9`, `:10-13` and `:14-17`. The clean and control drafts say the incident should use after-sales, followed by “一般支持是另一条渠道” (general support is a separate channel). Clean says opening another ticket will not speed processing and controls gives equivalent advice. Both citation gates passed (10 matches clean, 8 controls), both completeness checks failed, and both drafts ended with a staff marker after a log read returned 404. Wrong was the lifecycle verdict. The separate handoff-content judges each scored partial, crediting routing and no-speedup but asking for a direct statement that general support does not handle product after-sales issues.

The original replay accepted a manually amended rerun-18 draft, which lacked any general-support distinction before the amendment. The final controls process started at 03:30:32 UTC, before the adjacent-sentence change `1dd9674` at 03:32:17 UTC. The clean process started at 03:21:46 UTC. Replaying both saved drafts against the later completeness function with their checkpoint evidence and a support-flow cue passed. The later prompt change `c787a88` at 03:38:18 UTC asks for the stronger boundary the handoff judges wanted. There is no completed live verification of that prompt change in the final checkpoints.

## Timing evidence for GS-018 and GS-030

GS-018 model-call durations were `[12668,45835]`, `[24328,35241]`, and `[8782,18363,2621,29892]` ms across three attempts. GS-030 durations were `[5690,53344]`, `[7297,52430]`, and `[5716,17972,36011]` ms. Each attempt ended at approximately 60 seconds. GS-030's rerun-18 final attempt contained 45 events over six steps. Rerun 19 final model-call totals were 58.50/59.57/59.66 s for GS-018 and 59.03/59.73/59.70 s for GS-030. Across these six attempts the remaining wall time was 0.28–1.64 s. Repeat block 2 had three timeouts per item, with model-call totals of 57.46/59.59/59.56 s for GS-018 and 58.81/58.13/59.01 s for GS-030. No-focus block 3 still spent 58.19/59.61/59.10 s in model calls and timed out three times. The other repeat blocks had HTTP 429s, so only the rerun-18 and final rerun-19 checkpoints show three timeouts on every attempt for both items. Repeat logs show focused and no-focus GS-030 both reached the deadline, while HTTP 429s appeared in other blocks. This supports provider/generation variance and leaves the contribution of context size or tool work unresolved.

## GS-023 and GS-094

GS-023's delivered draft contains exact citations for automatic route switching, connection checks, Google DNS, cache flush, WARP and conditional rejoin. The answer took 59.4 s. Both drafts advise retrying after DNS checks. Rerun 18 received full credit for that step. Rerun 19 received partial credit because the judge wanted the answer to say rejoin should work once DNS functions normally. GS-094's first attempt timed out and its retry delivered at 50.7 s. The final draft gives version 26.3 in Startup Settings and tells the user to restart. Rerun 18 explicitly also sent the user to Settings → Reinstall Server, the missing point cited by the rerun-19 judge. These are single-run movements under deadline and retry pressure, without a controlled code-isolating repeat.

## GS-140

Clean and controls both admitted 19 spans and did not admit either policy article. Clean delivered at 32.5 s and was judged wrong. Controls delivered at 30.6 s and was judged partial. Both prioritize checking deployment after extraction. Clean asks staff to investigate but omits after-sales routing and duplicate/no-speedup guidance. The judge marked those two points missing and staff waiting partial. Controls adds both policy points and keeps the original ticket. Its judge marks both covered and waiting partial because it does not explicitly tell the customer to wait for technical staff or avoid repeated tickets. Policy admission is still unverified.

## GS-166

The final clean trace ended with `AI_APICallError` at 48.1 s. The first model call took 13.07 s and the failing second call took 32.67 s. The checkpoint has null HTTP status, no provider error message, no completed citation or completeness gate, and an agent-error basis with no verdict. The report's separate evidence records the known panel/staff threshold conflict and missing destination-by-file-type rule. The error itself does not adjudicate either owner question.

## GS-049, GS-053 and GS-056

GS-049 and GS-053 completed in the final clean run, while repeat blocks show retries and earlier provider failures. GS-049 cites end-of-term cancellation retention (expiry +3/+10/+17 days for suspension/node/backup) and the cancellation article. The judge credits download before expiry and the quoted no-new-bill rule. GS-053 cites nonpayment retention (immediate suspension, node removal after the seven-day payment window and backup removal seven days later). The judge credits the timeline but expects the case-specific conclusion that the files are gone. An untimestamped running status and no July invoice cannot establish the original service age or restoration eligibility. The owner must confirm separate nonpayment and voluntary cancellation rules, including the timer origin, exact deletion points, restoration eligibility after each cutoff, and whether files can or must be downloaded before expiry. GS-056 clean handed off in all three clean repeats. Clean settings ends at 1–14. Fix-4 admitted settings 1–16 and delivered both restart and world-reset claims in block 2 (54.5 s on retry) and the final fix-4 sample (19.9 s). Both scored correct. Two other fix-4 repeats were rate-limited. The clean outcome meets the expected withholding behavior, and the available pairs cannot estimate a stable corpus effect.

## Verification record

The rerun-19 report records passing build, typecheck, lint, 474 tests and 76 mock eval checks. This diagnosis changes documentation only.
