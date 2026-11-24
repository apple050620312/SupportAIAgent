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
