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

The final clean answer contains `debug/automatic-route-switching.md:1-7`, connection troubleshooting, Google DNS, WARP, after-sales ticket instructions and the statement that another ticket does not speed handling. The final controls answer likewise tells the customer to add results to the original after-sales ticket and includes the no-speedup meaning. Neither answer contains an explicit sentence distinguishing after-sales from general support before handoff. Both fail completeness and hand off.

The report's replay predicate accepts the rerun-18 response only when a natural route distinction is added. It rejects the unchanged rerun-18 response. This establishes that replay acceptance is sensitive to that sentence. It does not establish that the live generation path will produce it. The live traces show the model reached a handoff draft before producing the sentence.

## Timing evidence for GS-018 and GS-030

GS-018 model-call durations were `[12668,45835]`, `[24328,35241]`, and `[8782,18363,2621,29892]` ms across three attempts. GS-030 durations were `[5690,53344]`, `[7297,52430]`, and `[5716,17972,36011]` ms. Each attempt ended at approximately 60 seconds. GS-030's final trace contained 45 events over six steps. Repeat logs show focused and no-focus GS-030 both reached the deadline, while HTTP 429s appeared in other blocks. This supports provider/generation variance and leaves the contribution of context size or tool work unresolved.

## GS-023 and GS-094

GS-023's delivered draft contains exact citations for automatic route switching, connection checks, Google DNS, cache flush, WARP and conditional rejoin. The answer took 59.4 s. Rerun 18's delivered answer was judged correct. GS-094's first attempt timed out and its retry delivered at 50.7 s. The final draft includes the upgrade steps and citations but received partial. These are single-run movements under deadline and retry pressure, without a controlled code-isolating repeat.

## GS-140

Clean and controls both admitted 19 spans and did not admit either policy article. Clean delivered at 32.5 s and was judged wrong. Controls delivered at 30.6 s and was judged partial. Their draft wording and judge reasoning differ, but neither run can validate the routing change without the policy evidence.

## GS-166

The final clean trace ended with `AI_APICallError` at 48.1 s. It has no citation gate or semantic verdict. The report's separate evidence records the known panel/staff threshold conflict and missing destination-by-file-type rule. The error itself does not adjudicate either owner question.

## GS-049, GS-053 and GS-056

GS-049 and GS-053 completed in the final clean run, while repeat blocks show retries and earlier provider failures. Their verdicts therefore remain conditional on the unresolved retention rules. GS-056 clean handed off in all three clean repeats. The fix-4 checkpoint delivered at 19.9 s and scored correct when it reached a completed gate. Two other fix-4 repeats were rate-limited, so the paired corpus effect is directionally consistent but not estimated.

## Verification record

The rerun-19 report records passing build, typecheck, lint, 474 tests and 76 mock eval checks. This diagnosis changes documentation only.
