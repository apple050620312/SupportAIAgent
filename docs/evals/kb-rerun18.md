# Golden set docs rerun 18

Rerun 18 uses code commit `7c03658` on `feat/rerun18-fixes`, with `gpt-6.1-sol` via sub2api and OpenAI `text-embedding-3-small` retrieval. It selects the same 13 docs items as rerun 17, whose baseline was 4 correct, 2 partial, 7 wrong and 4 handoffs. The provider reported that it ignores the requested temperature. The answer limit remained 60 seconds per attempt.

| Sample | Corpus digest | Checkpoint under `eval-results/` |
|---|---|---|
| Full docs group, clean | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` | `golden-2026-11-24T02-36-17-394Z-13.json` |
| GS-056, fix 4 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` | `golden-2026-11-24T02-36-17-395Z-1.json` |

Both indexes contain 72 articles and 570 passages. The clean index was paired with the supplied clean settings file. The fix-4 index was paired with the settings file that adds the restart and world-reset sentence. The loader rejected an initial mismatched corpus before scoring. A preliminary checkpoint started before the code changes were complete and is excluded.

Option A tells the model to copy each cited passage and its label verbatim, with the explanation separate. The existing citation gate still applies. GS-030 gets focused searches for automatic failover and the Google DNS update rationale. Previously only the connection article had a focused admission path. GS-062 uses separate routing and duplicate-policy searches, recognizes both Chinese scripts in the symptom cues, and requires after-sales routing and explicit no-speedup guidance when policy evidence is admitted. An instruction to add details to the existing ticket alone does not express that policy.

The fix-4 GS-056 sample scored 1 correct, 0 partial, 0 wrong and 0 handoffs. It admitted settings 1–16, passed completeness and delivered both the restart procedure and world-reset consequence.

Build, typecheck, lint, 472 tests and 76 mock eval checks passed on the evaluated code.

The owner still needs to reconcile GS-049 and GS-053 retention and restoration policy, and specify the GS-166 upload destination by file type. The conventions report section 5 remains pending owner review.

The clean run recorded **4 correct, 2 partial, 2 wrong, 5 unscored and 1 handoff**. The harness wrote all 13 rows and exited with status 1 because some items were unscored. The pass standard was **not met**. GS-023 and GS-062 reached at least partial and GS-163 stayed correct and delivered. Clean GS-056 remained a supported handoff, and GS-166 regressed.

| Item | Rerun 17 → rerun 18 clean | Evidence |
|---|---|---|
| GS-018 | Partial, delivered → unscored | Three answer timeouts. Durability remains unverified. |
| GS-023 | Wrong, handoff → correct, delivered | The gate matched ten verbatim citations, including connection and Google DNS steps. Both prompt and retrieval changed, so this run cannot isolate the prompt effect. |
| GS-030 | Wrong, handoff → unscored | Three answer timeouts. The last attempt's search evidence includes failover 1–7 and Google DNS 1–12. The focused search directly returned both spans, and GS-023 admitted both through the same path. GS-030 has no completed admission trace or scored answer. |
| GS-049 | Wrong, delivered → unscored | Agent error after two attempts, including one answer timeout. |
| GS-053 | Wrong, delivered → unscored | No scored answer. The retention ruling remains open. |
| GS-056 | Wrong, handoff → wrong, handoff | Clean settings 1–14 lacks the restart and reset claims. Only backup evidence matched, and completeness withheld the answer. Fix 4 supplied both missing points in the separate sample. |
| GS-062 | Wrong, handoff → partial, delivered | Discord routing 6–43 and duplicate policy 6–17 were admitted. The answer covered after-sales routing and no speedup. The judge found the distinction from general support missing. |
| GS-084 | Correct, delivered → correct, delivered | Password guidance stayed correct. |
| GS-094 | Correct, delivered → correct, delivered | Startup version and reinstall guidance stayed correct after retries. |
| GS-108 | Correct, delivered → unscored | Three answer timeouts. Durability remains unverified. |
| GS-140 | Wrong, delivered → partial, delivered | Neither policy article was admitted. The judge credited routing and duplicate advice, but the answer lacked explicit advice to wait for staff. The policy claims lack matching admitted policy evidence, so the score gain does not validate the support-flow change. |
| GS-163 | Correct, delivered → correct, delivered | Activation guidance stayed correct. |
| GS-166 | Partial, delivered → wrong, delivered | SFTP and folder drag/drop were covered. File destination was missing, and the judge found that the 100 MB panel advice conflicted with the staff reference's 10 MB threshold. |

The GS-056 pair reproduces the expected corpus-dependent behavior with the same code and model configuration. Each side is one sample. The GS-018 and GS-108 timeouts provide no new evidence about whether the rerun 17 delivery gains persist or were caused by fix 4.
