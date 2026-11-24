# Golden set docs rerun 19 diagnosis

Rerun 19 does not meet the pass standard. The final clean checkpoint scored **4 correct, 3 partial, 3 wrong and 3 unscored** across 13 items. Rerun 18 scored 4 correct, 2 partial, 2 wrong, 5 unscored and 1 handoff. The run used `gpt-6.1-sol` through sub2api, a 60-second answer deadline, and clean corpus digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`. The provider reports that it ignores the requested temperature.

## Per-item diagnosis

| Item | Rerun 18 clean → rerun 19 clean | Diagnosis |
|---|---|---|
| GS-018 | Unscored → unscored | Three final timeouts. Retrieval and admission completed, but no answer was delivered. |
| GS-023 | Correct → partial | The delivered draft was 59.4 s and included the route-switching, Google DNS, flush, WARP and conditional rejoin material with exact citations. It led with a live-status/account limitation and did not provide the same complete, direct resolution as rerun 18. This is a sampled answer-quality variance near the deadline. |
| GS-030 | Unscored → unscored | Three final timeouts. Focused searches admitted automatic failover and Google DNS passages before generation failed. |
| GS-049 | Unscored → correct | A completed 52.4 s answer states the current documented nonpayment timeline and advises downloading a usable backup before voluntary cancellation. The retention ruling remains open, so this is a verdict relative to current references. |
| GS-053 | Unscored → partial | A completed 42.2 s answer gives the seven-day node and subsequent backup deletion references, but the restoration answer remains incomplete under the unresolved retention policy. |
| GS-056 | Wrong / handoff → wrong / handoff | All three clean repeats withheld unsupported restart/reset claims. The fix-4 sample that reached a completed gate delivered both claims and scored correct. The clean side has no remaining code change indicated. |
| GS-062 | Partial / delivered → wrong / handoff | Both final live samples failed the completeness gate and handed off, at 51.7 s clean and 57.3 s controls. The drafts contain route troubleshooting, after-sales ticket routing and no-speedup guidance, but stop at an account-state handoff before explicitly distinguishing after-sales from general support. |
| GS-084 | Correct → correct | Stable. |
| GS-094 | Correct → partial | The first attempt timed out and the retry delivered at 50.7 s. The delivered draft still contains the requested upgrade procedure and citations, but the judge found incomplete or less direct coverage. The timing and retry make ordinary sampled variance more plausible than a code regression. |
| GS-108 | Unscored → correct | The retry-enabled final produced a completed 42.8 s answer. Earlier repeats timed out, so durability remains uncertain. |
| GS-140 | Partial → wrong | Clean delivered at 32.5 s without either policy article admitted. Controls delivered at 30.6 s and scored partial, with the same lack of policy admission. The difference is draft/judge behavior, not evidence that the routing change worked. |
| GS-163 | Correct → correct | Stable. |
| GS-166 | Wrong / delivered → unscored | The 48.1 s final attempt ended in `AI_APICallError` before evaluation. This is unrelated to the 100 MB versus 10 MB threshold conflict. Destination by file type and the threshold remain owner decisions. |

## GS-062 live versus replay

Offline replay accepts the rerun-18 response only after a natural sentence distinguishing the after-sales route from general support is added. It rejects the saved rerun-17 existing-ticket-only draft and the unchanged rerun-18 delivered response.

The live clean draft already includes the substantive route distinction's ingredients. It says the route problem belongs in an after-sales ticket, gives the requested evidence, and says opening another general-support ticket does not speed handling. The missing text is the explicit contrast itself, such as stating that this server/service incident belongs to after-sales and that general support is a separate channel. The live answer then hands off on account state before that sentence is generated. The controls draft has the same shape and also hands off.

Therefore the live failure is a generation/delivery failure after retrieval and admission. A replay-only edit proves the completeness predicate, but does not make the sentence appear in a live answer. A live-verifiable change must cause the distinction to be generated before the account blocker handoff, or make the completed handoff draft preserve it. Verification requires both final live samples to contain an explicit after-sales-versus-general-support sentence, the no-speedup guidance, the route evidence, and a completed citation/completeness gate. The existing-ticket-only negative control must continue to hand off.

## GS-023 and GS-094 movement

GS-023's rerun-19 answer took 59.4 s and included the needed sources, while rerun 18 delivered a more complete answer. The near-limit single sample supports answer variance under provider latency and generation pressure. It does not identify a regression in the new code.

GS-094 timed out once and delivered on retry at 50.7 s. Its partial verdict follows a completed answer, unlike the timeout attempt. The evidence supports retry/provider variance and answer-quality variance. There is no controlled repeat showing a code regression.

## Timeout diagnosis

GS-018 and GS-030 each timed out on all three final attempts. The final traces show model-call time consuming almost the whole deadline. GS-018 calls were 12.7+45.8 s, 24.3+35.2 s and 8.8+18.4+2.6+29.9 s. GS-030 calls were 5.7+53.3 s, 7.3+52.4 s and 5.7+18.0+36.0 s. Tool work completed before the failed generation. GS-030's final trace had 45 events and six steps, including focused searches and reads. The repeat blocks show the same timeout pattern in focused and no-focus arms, with rate limits interleaved.

This points to provider/model generation time and rate-limit variance. GS-030's longer event trace may add context and tool work, but the no-focus arm also reached the deadline, so the evidence does not isolate item-specific retrieval overhead. A repeat with a different model would test model/provider sensitivity. A repeat with a longer answer limit would test whether generation eventually completes. A narrower tool loop would test whether reduced context and tool work improve completion. The owner decision to keep the 60-second limit stands.

## GS-140 and GS-166

GS-140 clean was wrong at 32.5 s. Controls was partial at 30.6 s. Clean admitted 19 spans and controls admitted 19 spans, with neither policy article admitted. The clean draft was more assertive about the deployment stage and less complete on the requested staff-routing advice. The judge credited more of the control draft. Neither run validates the routing change because policy evidence was absent in both.

GS-166's final clean error is `AI_APICallError`, after 48.1 s, with no semantic evaluation. It is a provider/agent failure, not evidence about the 100 MB panel reference versus 10 MB staff reference conflict. The destination-by-file-type gap and threshold decision await the owner. No destination or threshold should be invented.

## Retention and unresolved owner decisions

GS-049 and GS-053 are now delivered, but their verdicts are relative to the existing retention references. The owner must rule on nonpayment versus voluntary-cancellation behavior, timer origin, node and backup deletion cutoffs, restoration after each cutoff, and whether customers can download backups before expiry. The ruling must be reflected in the current references before these items can be treated as settled.

Section 5 of the conventions report also remains pending owner review.

## Ranked fix targets and verification criteria

1. **Make GS-062's distinction survive live generation.** Place the explicit after-sales-versus-general-support distinction in the generated answer before account-state handoff. Verify two live clean/control completions with route evidence, no-speedup guidance, the distinction, and a passed completeness gate. Preserve the existing-ticket-only handoff negative control.
2. **Measure and reduce timeout exposure without changing the 60-second limit.** Repeat GS-018 and GS-030 with per-attempt model-call timings, tool counts, admitted evidence and drafts. Add one different-model arm, one longer-limit diagnostic arm, and one narrower-tool-loop arm. Attribute a cause only if the arms separate generation time from retrieval/tool work.
3. **Stabilize answer completeness for GS-023 and GS-094.** Run paired repeats and compare required claims, citations, model-call timing and retry status. Require GS-023's flush, Google DNS and conditional rejoin, and GS-094's full upgrade procedure.
4. **Resolve policy inputs before judging retention and GS-166.** Obtain the owner's retention ruling, SFTP destinations and panel threshold. Rejudge identical drafts against the approved references. Do not add unsupported destination claims.
5. **Keep GS-056 corpus verification paired.** Repeat clean and fix-4 with identical model, judge and timing settings. Require clean handoff when restart/reset evidence is absent and fix-4 delivery when it is present.

GS-084, GS-163 and the other stable controls should remain in the next comparison.
