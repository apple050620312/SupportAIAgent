# Golden set docs rerun 21 diagnosis

Rerun 21 missed the pass standard. The clean 6.1-sol arm scored **5 correct, 2 partial, 4 wrong and 2 unscored**, down from **6 correct, 3 partial, 3 wrong and 1 unscored** in rerun 20. GS-018 and GS-062 gained correct deliveries. GS-049 and GS-094 moved to wrong, GS-108 moved to partial, and GS-030 and GS-140 lost delivery. Luna scored **3 correct, 3 partial, 4 wrong and 3 unscored**. Both rerun 21 arms had three handoffs. The standard checkpoint was resumed, so the scored rows it preserved and the rows generated after the deployment trigger landed are distinct. [Run report](kb-rerun21.md) · [Checkpoint evidence](kb-rerun21-diagnosis-evidence.md)

## Per-item diagnosis

| Item | Rerun 20 → 21, 6.1-sol | Diagnosis |
|---|---|---|
| GS-018 | Unscored → correct | First correct delivery, near the 60 s deadline. Covered SFTP fallback and avoided assigning an unverified cause. |
| GS-023 | Correct → correct | The full draft scored all three points. Three partial repeats bring it to 2/5. |
| GS-030 | Partial → unscored | Three timeouts with 28 admissions each. Luna delivered partial, missing automatic switching and why Google DNS updates faster. |
| GS-049 | Correct → wrong | Backup and invoice advice survived. The delivered retention timeline conflicts with the staff reference and was penalized this round. |
| GS-053 | Partial → partial | The judge credits the retention explanation and wants a case-specific restoration conclusion. Current policy and the customer's eligibility still require verification. |
| GS-056 | Wrong / handoff → wrong / handoff | Clean withheld unsupported restart/reset guidance. Fix 4 delivered both points with citations. |
| GS-062 | Wrong / handoff → correct | The scoped exclusion passed with both policy sources, all three points and an appropriate staff marker override. Replay isolates the old predicate failure. |
| GS-084 | Correct → correct | Met the five-delivery bar. One repeat needed retries. |
| GS-094 | Correct → wrong / handoff | The draft combined citation spans and changed quote text. It also made reinstall Forge-only. All four repeats delivered correctly. |
| GS-108 | Correct → partial | The full draft dropped the request for a fresh console error or log if startup still fails after reinstall. All four repeats scored correct. |
| GS-140 | Partial → unscored | Both policy articles admitted on all three tries. None reached the gates. |
| GS-163 | Correct → correct | Four correct results and one unscored agent error before the gates. |
| GS-166 | Wrong / handoff → wrong / handoff | Both answering models cited full spans with omitted source text. Both also missed guidance on destinations by file type. |

## GS-049 retention and reference conflict

GS-049 is primarily the unresolved policy/reference conflict showing up in scoring. The timeline comes from the admitted end-of-term cancellation article and appeared in the correct rerun 20 draft too. Rerun 21 presents the timeline as applicable and raises possible reuse subject to staff confirmation. That application exceeds what can be settled for the customer while the policy conflict is open. The different framing and verdict leave room for judge variance. The trigger and routing predicate do not account for this delivered draft.

The agent needs an explicit way to distinguish admitted evidence from policy cleared for customer use. Until the owner adjudicates, answer with documented cancellation and next-invoice steps, advise downloading and verifying a backup before expiry, and defer disputed timers, availability and restoration eligibility to staff. The citation gate checks quote fidelity and cannot settle policy authority. Review current references after the ruling and judge the saved drafts again under the same rubric. [Checkpoint evidence](kb-rerun21-diagnosis-evidence.md#retention-and-citation-evidence)

## GS-094 and GS-166 quote fidelity

GS-094's full-run handoff records a real failure mode, while 4/4 correct repeats show that the single verdict poorly describes typical delivery in these samples. The draft used a combined line range where two separate spans were admitted and reformatted the other excerpts. It tied reinstall to Forge. Luna corrected the range and passed the gate but still scored wrong on the Forge-only instruction. Treat citation construction and procedure coverage as separate checks. The repeats establish recovery under the same evaluation setup, with limited evidence about failure frequency.

GS-166's drafts look like selective quotation and compression. They leave text out of both cited spans. Replaying the exact admitted text passes, removing blockquote prefixes alone cannot replace omitted lines, and changing one non-whitespace character fails. The gate behaved as designed. Option A asks the model to reproduce whole spans exactly while also producing a concise answer, so long spans and generated Markdown give it more chances to fail even after admission succeeds. Consider rendering verified excerpts from selected admitted span IDs in code, or admitting shorter intact spans with their own labels. Keep semantic claim support separate. Neither citation approach resolves the destination or threshold disagreement. [Checkpoint evidence](kb-rerun21-diagnosis-evidence.md#retention-and-citation-evidence)

## GS-140 admission and delivery

Live admission is validated for the sampled input. The trigger admitted both policy sources on all three standard attempts, and Luna admitted both and delivered. Standard delivery remains unproven. Rerun 21 increased searches from one to three and admitted 23 spans instead of 19, with the same eight reads. Extra context or tool work may contribute latency. The first model call itself ranged from 15.71 to 30.41 s versus 4.81 s in rerun 20, and model-call time includes provider wait. Those serial samples cannot distinguish a trigger-related cost from deadline variance. Luna's correct verdict reflects implied wait guidance from queue order and no duplicates. An end-to-end pass still requires an explicit instruction to wait for technical staff and correct handling when installer state needs staff inspection. [Timing evidence](kb-rerun21-diagnosis-evidence.md#gs-140-timing)

## Luna comparison

Keep 6.1-sol as the default and leave timeout routing unchanged. Luna delivered 7/13, with 6/13 on the first attempt, compared with 8/13 on both measures for 6.1-sol. Scheduled correct outcomes were 3/13 versus 5/13. For timeout-prone items, Luna recovered a partial GS-030 and a judge-correct GS-140 with implicit wait advice, while losing the correct GS-018 to a citation handoff. One serial pair settles the immediate deployment decision. The comparative question remains open.

Reopen only with repeated paired samples. Start with five pairs per item across alternating serial time blocks, using the same pinned revision, clean corpus, prompts, gates, judge, retry policy and 60 s deadline. Report the full group and the prespecified GS-018/030/140 subset separately. If testing a Luna fallback after a timeout, compare whole routing policies under the same total budget and count the preceding attempt. A repeatable gain in correct deliveries per scheduled item, with no increase in unsupported answers or inappropriate handoff overrides, would justify reconsideration. Track first-attempt delivery, retries, admissions and timing to interpret any gain. [Run report](kb-rerun21.md#luna-comparison)

## Durability and causal attribution

GS-023's three partials all passed both gates and covered DNS flush and Google DNS. Each offers some form of retry and leaves the expected result of simple rejoin with working DNS implicit. A repeat judged correct used similar retry language, so the shared symptom is missing explicit outcome wording, with possible variance in how the judge credits implication. Blindly rescore the five saved answers using the same point rubric before attributing the split solely to generation. GS-084 met the bar at 5/5. GS-108, GS-094 and GS-163 missed it at 4/5 for distinct reasons: missing content, citation handoff and an unscored agent error respectively.

GS-062 has a controlled replay showing what the predicate change fixes and one live delivery on the changed path. GS-018 has one correct live sample at 56.8 s after earlier timeouts, with no controlled change to explain the gain. Neither has demonstrated durable delivery. Use the same five-sample bar as rerun 20, with four additional scheduled clean samples per item to complement these successes. Spread them across at least two time blocks including a full run, and require 5/5 correct deliveries with valid citations and required claims. Record first-attempt success and retry use. A revision change affecting the item calls for a fresh five-sample baseline. [Durability evidence](kb-rerun21-diagnosis-evidence.md#durability-and-corpus-control)

## Ranked fix targets and verification criteria

1. **Citation construction for GS-166 and GS-094.** Replay saved failures and exact quoted controls. Keep rejection controls for changed text, omitted text under full-span labels, and unadmitted ranges with no valid pair. Compare any rendering or shorter-span approach in five scheduled clean samples per item. Require valid citations for delivered claims and no unsupported releases. Check GS-094's version-then-reinstall sequence independently of Forge. For GS-166, assess policy completeness only against approved destinations and threshold.
2. **GS-140 delivery and timeout isolation.** Pair trigger on/off using the same standard model, clean corpus and deadline across alternating blocks. Capture first-call time, tool counts, prompt size, admissions and later model-call time. Require both policy articles in the enabled arm and five supported, correct deliveries with explicit wait-for-staff advice. Keep an installer-state handoff control. Track GS-030's delivery and missing points alongside this work.
3. **GS-049 and GS-053 policy authority.** Verify on pending-policy examples that the agent gives documented backup and cancellation steps where applicable and withholds disputed timelines and case-specific promises. Keep the staff reference provisional. After owner adjudication, align KB and rubric, rescore saved drafts and sample fresh answers.
4. **GS-023 rejoin coverage.** Rescore the saved drafts blind. Then require five clean samples with cache flush, Google DNS and explicit conditional rejoin advice, including its expected result without a guarantee. Keep GS-084, GS-108 and GS-163 as controls and check both the gate and judge result.
5. **Confirm GS-062 and GS-018.** Add four scheduled samples each under the durability criteria above. GS-062 must preserve scoped exclusion, no-speedup advice and correct staff handling. GS-018 must give SFTP fallback and distinguish the upload error from an unverified file or mod cause. Preserve GS-056 as a paired corpus control when the index changes.

## Owner decisions

GS-049 and GS-053 need separate rules for voluntary cancellation and nonpayment, including timer start, host and backup removal, download availability and restoration eligibility. GS-166 needs approved SFTP destinations by file type and the panel upload threshold. Section 5 of the conventions report remains pending. [Conventions report](kb-conventions-report.md#5-conventions-versus-procedures)
