# Golden set docs rerun 19 diagnosis

Rerun 19 does not meet the pass standard. The final clean checkpoint scored **4 correct, 3 partial, 3 wrong and 3 unscored** across 13 items. Rerun 18 scored 4 correct, 2 partial, 2 wrong, 5 unscored and 1 handoff. The run used `gpt-6.1-sol` through sub2api, a 60-second answer deadline, and clean corpus digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`. The provider reports that it ignores the requested temperature.

## Per-item diagnosis

| Item | Rerun 18 clean → rerun 19 clean | Diagnosis |
|---|---|---|
| GS-018 | Unscored → unscored | Three final timeouts. Retrieval and admission completed, but no answer was delivered. |
| GS-023 | Correct → partial | The delivered draft was 59.4 s and included the route-switching, Google DNS, flush, WARP and conditional rejoin material with exact citations. The judge credited flush and Google DNS but gave partial credit for rejoin because the draft did not say rejoining should work once DNS functions normally. |
| GS-030 | Unscored → unscored | Three final timeouts. Focused searches admitted automatic failover and Google DNS passages before generation failed. |
| GS-049 | Unscored → correct | A completed 52.4 s answer states the documented end-of-cycle cancellation timeline and advises downloading a usable backup before voluntary cancellation. The retention ruling remains open, so this is a verdict relative to current references. |
| GS-053 | Unscored → partial | A completed 42.2 s answer gives the seven-day node and subsequent backup deletion references, but the restoration answer remains incomplete under the unresolved retention policy. |
| GS-056 | Wrong / handoff → wrong / handoff | All three clean repeats withheld unsupported restart/reset claims. The fix-4 sample that reached a completed gate delivered both claims and scored correct. The clean side has no remaining code change indicated. |
| GS-062 | Partial / delivered → wrong / handoff | Both final live samples failed the completeness gate and handed off, at 51.7 s clean and 57.3 s controls. The drafts contain route troubleshooting, after-sales ticket routing and no-speedup guidance, and an adjacent-sentence distinction that the gate in those runs did not accept. |
| GS-084 | Correct → correct | Stable. |
| GS-094 | Correct → partial | The first attempt timed out and the retry delivered at 50.7 s. The retry gives Startup Settings → 26.3 and a restart, but omits Settings → Reinstall Server, which rerun 18 included. |
| GS-108 | Unscored → correct | The retry-enabled final produced a completed 42.8 s answer. Earlier repeats timed out, so durability remains uncertain. |
| GS-140 | Partial → wrong | Clean delivered at 32.5 s without either policy article admitted. Controls delivered at 30.6 s and scored partial, with the same lack of policy admission. The difference is draft/judge behavior, not evidence that the routing change worked. |
| GS-163 | Correct → correct | Stable. |
| GS-166 | Wrong / delivered → unscored | The 48.1 s final attempt ended in `AI_APICallError` before evaluation. The recorded error has no HTTP status or message and occurred before the threshold claim could be evaluated. Destination by file type and the threshold remain owner decisions. |

## GS-062 live versus replay

Offline replay accepts the rerun-18 response only after a natural sentence distinguishing the after-sales route from general support is added. It rejects the saved rerun-17 existing-ticket-only draft and the unchanged rerun-18 delivered response.

Both live drafts give after-sales routing and no-speedup advice. Both follow the routing sentence with “一般支持是另一条渠道” (general support is a separate channel). The final runs started before commit `1dd9674`, which added support for this adjacent-sentence form. Replaying the two saved drafts through the later completeness predicate with checkpoint evidence and a support-flow cue passes. The original live citation gates passed, while completeness failed in both. The post-handoff judges gave partial coverage for the distinction because neither draft explicitly says general support does not handle product after-sales incidents.

The runtime format check and the semantic requirement therefore need separate verification. Commit `c787a88` asks the model to state the explicit boundary. Its live effect is untested by these final samples. A live repeat should generate that boundary in the customer-facing text, pass both gates and demonstrate the intended lifecycle decision. Both saved drafts emitted a staff marker and saw a log 404. Record marker retention or override separately, and preserve handoff when the actual diagnosis requires account state.

## GS-023 and GS-094 movement

GS-023 delivered essentially the same flush, Google DNS and retry procedure in both runs. Rerun 18's judge accepted a retry after verifying DNS. Rerun 19's judge wanted a clearer statement that rejoining should work once DNS functions normally. GS-094 shows a concrete omission in the retry draft. Rerun 18 also needed retries and its delivered draft included both required steps. The GS-062 gate change supplies no causal explanation for either delivered result. Paired repeats and rescoring the same drafts would separate generation variance from judging variance.

## Timeout diagnosis

GS-018 and GS-030 each timed out on all three final attempts. The final traces show model-call time consuming almost the whole deadline. GS-018 calls were 12.7+45.8 s, 24.3+35.2 s and 8.8+18.4+2.6+29.9 s. GS-030 calls were 5.7+53.3 s, 7.3+52.4 s and 5.7+18.0+36.0 s. Tool work completed before the failed generation. GS-030's rerun-18 final attempt had 45 events and six steps, including focused searches and reads. The repeat blocks show the same timeout pattern in focused and no-focus arms, with rate limits interleaved.

Final attempts spent 97.3–99.6% of elapsed time inside client-observed model calls, including calls that select tools and calls interrupted after tools returned. These timings include provider wait, so they cannot separate queueing, inference or context processing. HTTP 429s independently show rate limiting in the earlier batch. GS-030's longer event trace may add context and tool work, but the no-focus arm also reached the deadline, so the evidence does not isolate item-specific retrieval overhead. A repeat with a different model would test model/provider sensitivity. A hypothetical longer-limit experiment could show whether generation completes just past the deadline. The planned comparison uses the approved 60-second limit. A narrower tool loop would test whether reduced context and tool work improve completion. The owner decision to keep the 60-second limit stands.

## GS-140 and GS-166

GS-140 clean was wrong at 32.5 s. Controls was partial at 30.6 s. Clean admitted 19 spans and controls admitted 19 spans, with neither policy article admitted. Both prioritized post-extraction deployment and asked staff to inspect installer state. Clean missed after-sales category and duplicate/no-speedup advice. Controls included both, but its judge still wanted explicit advice to wait for technical staff and avoid repeated tickets. Neither run validates the routing change because policy evidence was absent in both.

GS-166's final clean error is `AI_APICallError`, after 48.1 s, with no semantic evaluation. The failure was on the second model call. The checkpoint retains the SDK error class and no HTTP status, so the underlying provider cause is unknown. The destination-by-file-type gap and threshold decision await the owner. No destination or threshold should be invented.

## Retention and unresolved owner decisions

GS-049 and GS-053 are now delivered, but their verdicts are relative to the existing retention references. The owner must rule on nonpayment versus voluntary-cancellation behavior, timer origin, node and backup deletion cutoffs, restoration after each cutoff, and whether customers can download backups before expiry. The ruling must be reflected in the current references before these items can be treated as settled.

Section 5 of the conventions report also remains pending owner review.

## Ranked fix targets and verification criteria

1. **Make GS-062's distinction survive live generation.** Repeat on the merged revision with the later gate and prompt. Verify repeated live drafts explicitly route product incidents to after-sales and exclude them from general support, state no-speedup advice, admit both policy sources and pass completeness and semantic coverage. Track delivery and marker handling separately. Keep GS-140 as a control and require policy admission plus wait-for-staff advice before treating it as routing validation. Preserve the existing-ticket-only handoff negative control.
2. **Measure and reduce timeout exposure without changing the 60-second limit.** Repeat GS-018 and GS-030 with per-attempt model-call timings, tool counts, admitted evidence and drafts. Add separate different-model and narrower-tool-loop arms at the same 60-second limit. Attribute a cause only if the arms separate generation time from retrieval/tool work.
3. **Stabilize answer completeness for GS-023 and GS-094.** Run paired repeats and compare required claims, citations, model-call timing and retry status. Require GS-023's flush, Google DNS and explicit conditional rejoin, and GS-094's Startup Settings → 26.3 followed by Settings → Reinstall Server.
4. **Resolve policy inputs before judging retention and GS-166.** Obtain the owner's retention ruling, SFTP destinations and panel threshold. Rejudge identical drafts against the approved references. Do not add unsupported destination claims.
5. **Keep GS-056 corpus verification paired.** Repeat clean and fix-4 with identical model, judge and timing settings. Require clean handoff when restart/reset evidence is absent and fix-4 delivery when it is present.

Keep GS-084 and GS-163 as stable controls. Include GS-108 to check whether its final correct delivery repeats.
