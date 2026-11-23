# Step 12 docs-answerable subset rerun 6

**Index caveat.** The index gained exactly two owner-answered articles since rerun 5: `store/services/end-of-term-cancellation-retention.md` and `debug/automatic-route-switching.md`. Changes on GS-049 and GS-030 may reflect both KB and code changes. The other 11 items are the code-only comparison, with normal variation between live model runs. The five newest articles and the login-recovery rewrite are outside this indexed snapshot.

Rerun 6 completed all 13 selected docs-answerable items at `4012eb2` with `gpt-6.1-sol` via sub2api and the existing 60-second answer deadline. The harness explicitly set `EMBEDDING_PROVIDER=openai`, `EMBEDDING_MODEL=text-embedding-3-small`, and `KB_INDEX_PATH=.kb-index/passages.json`. The completed checkpoint, `eval-results/golden-2026-11-23T14-41-17-027Z-13.json`, records `retrieval.provider=openai` and digest `8cc628a0335f26fec0694ca5de4139d3f9e4d2fa5b68f972a388ea4c727c0d36` (559 passages, 66 articles). Rerun 5 used digest `c37481a6` (557 passages, 64 articles).

The first attempt stopped at initialization because the loader checks the index against the supplied Markdown corpus. The successful attempt used a temporary Markdown snapshot containing only indexed articles. The old login-recovery text was recovered from its stored excerpt and verified against its original article hash. The full snapshot passed the loader's digest check and the embedding index file was used as-is.

| Metric | Clean baseline (rerun 2) | Rerun 5 | Rerun 6 | Change vs rerun 5 | Change vs baseline |
| --- | ---: | ---: | ---: | ---: | ---: |
| Correct | 1 | 0 | 0 | 0 | −1 |
| Partial | 0 | 0 | 1 | +1 | +1 |
| Wrong | 12 | 13 | 12 | −1 | 0 |
| Unscored | 0 | 0 | 0 | 0 | 0 |
| Handoff | 12 | 11 | 10 | −1 | −2 |

Each run column shows the primary semantic verdict and whether the answer handed off. Draft verdicts are diagnostic and have no effect on the primary score. The clean baseline checkpoint did not record draft verdicts. A dash in the draft columns indicates an answer was delivered.

| Item | Clean baseline | Rerun 5 | Rerun 6 | Rerun 5 handoff draft | Rerun 6 handoff draft |
| --- | --- | --- | --- | --- | --- |
| GS-018 | Wrong / yes | Wrong / yes | Wrong / yes | Partial | Partial |
| GS-023 | Wrong / yes | Wrong / no | Wrong / no | — | — |
| GS-030 | Wrong / yes | Wrong / yes | Wrong / yes | Wrong | Partial |
| GS-049 | Wrong / yes | Wrong / yes | Wrong / yes | Partial | Correct |
| GS-053 | Wrong / yes | Wrong / yes | Wrong / yes | Partial | Partial |
| GS-056 | Wrong / yes | Wrong / yes | Wrong / yes | Wrong | Wrong |
| GS-062 | Wrong / yes | Wrong / yes | Wrong / yes | Wrong | Wrong |
| GS-084 | Wrong / yes | Wrong / yes | Wrong / yes | Wrong | Wrong |
| GS-094 | Wrong / yes | Wrong / yes | Wrong / yes | Wrong | Correct |
| GS-108 | Wrong / yes | Wrong / yes | Wrong / yes | Correct | Partial |
| GS-140 | Wrong / yes | Wrong / yes | Wrong / yes | Wrong | Wrong |
| GS-163 | Correct / no | Wrong / no | Wrong / no | — | — |
| GS-166 | Wrong / yes | Wrong / yes | Partial / no | Wrong | — |

The primary score did not regress on any item versus rerun 5. GS-166 was the only primary improvement, moving from a wrong handoff to a partial delivered answer. GS-163 remained wrong and accounts for the loss of the clean baseline's sole correct result.

GS-108 regressed on draft content from correct to partial, while its primary verdict remained wrong. GS-030's citation gate also regressed from pass to fail, while its handoff draft improved from wrong to partial. Across all items, citation gate passes increased from 6 to 11, and all 13 rerun-6 items passed the completeness check. The live comparison cannot isolate which fix caused the changes. Rerun 6 recorded 2 correct, 4 partial, and 4 wrong handoff drafts, compared with 1 correct, 3 partial, and 7 wrong in rerun 5.

The comparison checkpoints are `eval-results/golden-2026-11-23T13-06-46-542Z-13.json` (rerun 5) and `eval-results/golden-2026-11-23T10-53-02-770Z-13.json` (clean baseline). The model comparison remains deferred.
