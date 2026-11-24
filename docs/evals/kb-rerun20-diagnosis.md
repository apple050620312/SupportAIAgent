# Golden set docs rerun 20 diagnosis

Rerun 20 missed the pass standard. The final clean checkpoint scored **6 correct, 3 partial, 3 wrong and 1 unscored** across 13 items, up from **4 correct, 3 partial, 3 wrong and 3 unscored** in rerun 19. Six is the best correct count so far. GS-023 and GS-094 moved from partial to correct, GS-140 from wrong to partial, and two previously unscored rows finished with GS-030 partial and GS-166 wrong. The final handoffs were GS-056, GS-062 and GS-166. The run used the merged prompt and gate at `110d22a`, `gpt-6.1-sol` through sub2api, and a 60-second answer deadline per attempt. See the [run report](kb-rerun20.md) and [checkpoint evidence](kb-rerun20-diagnosis-evidence.md).

## Per-item diagnosis

| Item | Rerun 19 clean → rerun 20 clean | Diagnosis |
|---|---|---|
| GS-018 | Unscored → unscored | The only unscored final row. Three timeouts despite 17 admitted spans on each attempt. Luna delivered a partial on its third attempt. |
| GS-023 | Partial → correct | The final draft earned credit for explicit conditional rejoin alongside cache flush and Google DNS. One of two targeted repeats still received partial credit for rejoin. |
| GS-030 | Unscored → partial | Standard loop delivered in 58.8 s. It explained automatic route switching and gave cache flush and retry guidance. The Google DNS recommendation lacked the faster update explanation. |
| GS-049 | Correct → correct | Cancellation timeline and backup advice scored against current references. Retention still awaits the owner. |
| GS-053 | Partial → partial | Retention timeline coverage remains ahead of the restoration conclusion. The applicable policy and case-specific eligibility remain unresolved. |
| GS-056 | Wrong / handoff → wrong / handoff | Clean withheld unsupported restart and reset claims in three of three samples. Fix 4 supplied evidence for both and scored correct in three of three. No clean-side code change is indicated. |
| GS-062 | Wrong / handoff → wrong / handoff | Final draft admitted both policy sources, passed citations and covered all three points according to the handoff-content judge. The completeness predicate rejected its exclusion wording and the staff marker was retained. |
| GS-084 | Correct → correct | Correct on all three clean samples. |
| GS-094 | Partial → correct | The reinstall step missing in rerun 19 returned after the startup version step. Correct on all three clean samples. |
| GS-108 | Correct → correct | Correct on all three clean samples. This improves on earlier timeout-prone repeats. |
| GS-140 | Wrong → partial | After-sales and no-speedup advice improved. Neither policy article was admitted, and explicit advice to wait for technical staff was absent. |
| GS-163 | Correct → correct | Correct on all three clean samples. |
| GS-166 | Unscored → wrong / handoff | The completed draft passed completeness and failed citations on two excerpt mismatches. Destination by file type remained missing. |

## GS-062 live versus replay

The targeted completion delivered correctly in 36.2 s and overrode a staff marker after a synthetic log 404. The full draft reached the gate in 31.7 s and handed off. The other targeted sample timed out before the gate on all three attempts. Replay held the saved text and admitted sources fixed for each draft and isolated the route-distinction predicate. Both completed drafts passed the routing and no-speedup checks. The full draft says 「一般支持工单不处理产品售后问题」, which explicitly excludes product after-sales issues from general support. The same-sentence predicate does not recognize 「不处理」 as contrast. The targeted draft satisfied that predicate. The handoff-content judge found the full draft covered all three points, while the scored lifecycle remained wrong.

Recognize 「不处理」 and 「不處理」 in a clause scoped to general support excluding product after-sales issues. Keep the actor, negation and object linked. The minimal reliable fix accepts the policy statement the prompt already requests. Prompting for a specific cue would depend on the model reproducing that wording on every draft. A loose keyword check could accept a denial of after-sales itself or an unrelated negative clause. Replay both saved positives and keep the existing-ticket-only negative. Add negatives for both routes offered interchangeably, reversed exclusion, unrelated negation, missing distinction or no-speedup advice, and either policy source missing. Hold the other conditions constant in each negative. Verify the gate and lifecycle independently, including a case where real account state is required and handoff must survive.

## Timeout arms and model comparison

The targeted standard and narrower 6.1-sol loops each timed out six times across GS-018 and GS-030. The narrower arm reduced some GS-018 tool work but did not reach its step-three restriction on GS-030. The same deadline let Luna deliver one partial per item after retries. GS-030 then also delivered a partial with the standard 6.1-sol loop at 58.8 s, with the same tool counts as its targeted baseline. GS-030's Luna sample missed automatic route switching, which the standard completion covered. GS-018 has no final standard draft for a content comparison. The elapsed model-call times include provider wait. The serial samples cannot attribute the timing difference to inference speed or establish a general quality ranking.

Run the owner-approved fuller Luna comparison. Use the standard loop for both models with matched corpus, retrieval, prompt, gates, judge, retry policy and the same 60-second deadline. Alternate arm order serially across time blocks. Start with five paired runs per item across the 13-item clean group, with the two timeout targets reported separately. The primary metric is correct outcomes per scheduled run, counting exhausted timeouts in the denominator. Track delivery and first-attempt delivery, partial and wrong outcomes, handoffs, retries, per-point coverage and citation failures. Compare blinded judgments of matched items and inspect disagreements. Record latency, provider errors, tool counts and admissions for interpretation. Use additional pairs if the results are mixed. Require a repeatable gain in correct outcomes without more unsupported deliveries or inappropriate handoff overrides before recommending a switch.

## Stability and causal attribution

GS-094 and GS-108 now have the same three-of-three clean record as GS-084 and GS-163. That is enough to lower their priority this round. GS-094's 58.3 s full completion and GS-108's earlier timeouts warrant retaining both as controls. GS-023's two-of-three record still shows answer or judge variance around conditional rejoin. Rescore the same saved drafts under the same rubric to check judge consistency before interpreting new generations.

For the next round, use an operational bar of five fresh scheduled clean runs per item across at least two blocks, including a full run. Require five correct deliveries with all required claims and valid citations. Record retry use and first-attempt success alongside the final result. This is a practical bar for closing the immediate repeat question. Five runs give limited information about rare failures. The GS-062 prompt and gate changes provide no controlled explanation for the gains in GS-023 or GS-094.

## GS-140 and GS-166

GS-140's move to partial does not validate the routing change. Across all three rerun 20 samples, neither policy article was admitted and the wait-for-staff advice remained implicit. The staff marker was overridden in all three. Trace where the policy reads are missed, and require admission of both articles, supported after-sales and no-speedup guidance, and explicit advice to wait for technical staff before calling routing verified. Review the lifecycle separately when technical staff must inspect installer state.

GS-166's immediate handoff trigger in this sample was citation validation. The saved gate reported two excerpt mismatches and no matches. The checkpoint identifies the mismatches, without establishing whether citation construction or source alignment caused them. Replay exact admitted spans as positive controls and preserve mismatch rejection. A passing citation replay would leave the draft's missing destination-by-file-type guidance and disputed direct-folder claim unresolved. The handoff evidence establishes no panel threshold or destination rule.

## Retention and unresolved owner decisions

GS-049 and GS-053 remain provisional against the current references. The owner still needs to settle nonpayment versus voluntary cancellation, when each timer starts, when nodes and backups are removed, restoration eligibility at each cutoff, and backup download availability. GS-166 needs approved SFTP destinations by file type and a panel upload threshold. Section 5 of the conventions report remains pending owner review.

## Ranked fix targets and verification criteria

1. **GS-062 route distinction.** Accept the scoped exclusion wording and replay both saved positives against the negative controls above. Require three scheduled live clean repeats to admit both policy sources, pass citation and completeness checks, cover all three points and deliver when appropriate. Record staff marker handling and preserve the account-state handoff control.
2. **Timeout and model comparison.** Compare Luna with the standard 6.1-sol loop at 60 seconds using paired repeated samples. Rank by correct outcomes per scheduled run and verify no grounding or handoff regression. GS-018 is the primary recovery target. Keep GS-030 to measure both delivery and missing claims.
3. **GS-140 policy admission.** Require both policy articles, citations that support the routing advice, explicit waiting for technical staff, and appropriate staff handling in three scheduled repeats. Three partial drafts with no policy admission provide no validation.
4. **GS-166 citation fidelity and owner policy.** Isolate both mismatches with matched-span and mismatch replay controls. After owner signoff, require grounded destination-by-file-type and threshold guidance and verify the lifecycle on live repeats. Update retention references and rejudge GS-049 and GS-053 after their separate ruling.
5. **Durability and corpus controls.** Prioritize GS-023's conditional rejoin in five fresh clean samples, with GS-094, GS-108, GS-084 and GS-163 as controls under the same repeat bar. Preserve GS-056 as a paired corpus check when the index changes. Clean should hand off without restart/reset evidence, and fix 4 should deliver both supported claims.
