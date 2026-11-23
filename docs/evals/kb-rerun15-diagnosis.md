# KB rerun 15 diagnosis

Rerun 15 did not improve on rerun 13. The clean checkpoint records **3 correct / 4 partial / 6 wrong, with 3 handoffs**, compared with rerun 13’s **4 / 4 / 5 and 2 handoffs**. Rerun 15 used OpenAI `text-embedding-3-small`, digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, 72 articles and 570 passages. Rerun 13 used digest `898c35b5b203`, 71 articles and 566 passages. Both used the same model, provider, temperature, step cap, and 60-second deadline. The detailed replay is in [kb-rerun15-diagnosis-evidence.md](kb-rerun15-diagnosis-evidence.md).

The fixes changed two separate stages. Fix 1 repaired fenced citation drafts, allowing GS-163’s citation gate to pass. Fixes 2 and 3 then applied task-point checks to the resulting draft. That exposed incompleteness rather than solving it. The admitted passages were available, but generation still omitted required facts.

| Item | Rerun 13 → 15 | Attribution |
|---|---|---|
| GS-023 | partial → wrong, coverage true → false | Draft/evidence selection variance. Gate and completeness stayed passed/true. |
| GS-056 | wrong delivered → wrong handoff, completeness true → false | Genuine missing reinstall, restart, and world-reset points. Fix 2/3 correctly rejected the draft. |
| GS-062 | wrong delivered → wrong delivered | Required support-flow branch did not fire. Completeness passed while answer omitted after-sales routing. |
| GS-108 | correct → partial | Draft/judge variance. Gate, completeness, coverage, and delivery fields were unchanged. |
| GS-163 | wrong handoff, gate failed → wrong handoff, gate passed | Fix 1 removed the citation-format blocker. Fix 3 correctly rejected the draft because it omitted waiting for activation. |
| GS-166 | wrong handoff unchanged | Same substantive truncation and failed citation gate as rerun 13. |

## Answers to the diagnostic questions

GS-163’s new completeness check rejects the R15 draft because it says how to use the panel and start the server but never says that support must first activate the purchased service and the customer must wait. The golden staff resolution is “已開通”, and the expected point explicitly requires waiting for customer support activation. Fix 3’s regex is therefore checking the right missing point. Fix 1 made the citation gate pass, but it did not make the answer complete.

GS-056’s check rejects the R15 draft because the admitted reinstall passage is not reflected in the answer. The fix-3 branch requires all three points for this reinstall symptom: reinstall, restart or reboot, and the consequence that the world is reset. The draft has none of those terms. It discusses deletion consequences and backups, then hands off. The rejection is correct. The clean R15 corpus did not yet include the later fix-4 consequence sentence, so that sentence cannot explain this result.

GS-056 and GS-062 show why admission alone is insufficient. GS-056’s reinstall passage was admitted, but the model did not use it and completeness correctly stopped delivery. GS-062’s support-flow passages were admitted, but `hasSupportFlowSymptom(prompt)` did not activate for the repeated-disconnect prompt. The support-flow requirement therefore never ran, and the answer passed completeness while omitting after-sales routing and the duplicate-ticket instruction. The check is not rewriting drafts. It either rejects after generation or, when its symptom classifier does not match, leaves the draft untouched.

GS-023’s regression is content variance. Rerun 13 gave a direct connection test and a complete troubleshooting sequence. Rerun 15 spent its opening on an unrelated DiscordSRV passage and supplied a shorter, less targeted answer. Both gate and completeness passed. The new completeness code did not cause the regression.

GS-108 is also a draft/judge variance. Rerun 13 gave a direct missing-JAR diagnosis, correction, reinstall path, and startup checks. Rerun 15 retained those articles but opened with “wait and refresh”, expressed uncertainty, and ended with staff inspection. Gate, completeness, content coverage, delivery, and tool-error fields are identical. The semantic judge consequently rated the less decisive answer partial. There is no checkpoint evidence of a fix-1/2/3 code effect.

GS-056’s targeted runs are not clean evidence because they used the contaminated `04003b9b` index containing the later settings consequence sentence. Their correct-plus-delivered outcomes show that a single item is unstable across prompts and retrieval/model trajectories. The full clean run is the better measure of the intended fix effect because it uses the specified pre-fix-4 digest. It demonstrates that fixes 2/3 can detect the missing points, while generation still fails to supply them.

GS-166 has the same genuine-truncation cause as rerun 13. Its admitted SFTP and upload passages do not appear in the final answer, the citation gate fails, and the final answer is the generic handoff. Completeness remains true because the answer is not evaluated as a substantive response after truncation. No new completeness failure explains it.

Retrieval failure, timeout, and provider outage are ruled out. Target evidence was admitted for GS-056, GS-062, GS-163, and GS-166, and broad evidence was admitted for the two regressions. Both checkpoints scored all 13 items, with no model failures. The provider and embedding model are unchanged. Judge-only variance applies to GS-108 after identical pipeline fields, but cannot explain the GS-056 or GS-163 handoffs.

## Ranked fix targets and verification criteria

1. **Make required-task detection cover the actual symptom language.** Extend support-flow detection so GS-062’s repeated disconnects after repeated reinstall trigger the required after-sales and duplicate-ticket points. Verify on a clean targeted replay that admitted support-flow evidence is present, completeness becomes false when those points are absent, and a generated answer containing both points reaches at least partial. This target should move GS-062 wrong → partial or better.

2. **Constrain generation around admitted task points.** The completeness check is diagnostic and delivery-gating only. It cannot cause the model to use an admitted passage. Add a generation or repair verification that produces, for GS-056, the reinstall action, restart action, and explicit world-reset consequence, and for GS-163, the activation-wait point before panel startup. Verify the raw pre-gate draft contains every required point and that both items remain delivered. This should move GS-056 to at least partial and GS-163 to delivered.

3. **Preserve focused evidence selection for connection tickets.** GS-023 proves that a passed gate and true completeness can still accompany an irrelevant lead passage and a worse answer. Verify that a rerun keeps the connection-test and troubleshooting sequence in the draft and does not lead with unrelated DiscordSRV material. GS-023 should return to partial or better, with coverage true.

4. **Prevent substantive truncation before citation gating.** GS-166 remains a failed citation-gate handoff despite admitted target passages. Verify that the final draft retains the SFTP and upload excerpts, the gate passes, and the answer is delivered at least partial. This target should move GS-166 from wrong/handoff.

5. **Measure model variance separately from pipeline effects.** GS-108 changed verdict with identical gate, completeness, coverage, delivery, and tool fields. Verify with repeated clean samples before attributing future movement to code. A valid code fix should change a pipeline field or reproducibly change the draft content, not merely one judge outcome.

No code, knowledge-base, or index changes were made for this diagnosis.
