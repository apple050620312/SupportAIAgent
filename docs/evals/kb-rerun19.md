# Golden set docs rerun 19

The run uses `gpt-6.1-sol` through sub2api, OpenAI `text-embedding-3-small` for retrieval, and the same semantic judge and 13 docs items as rerun 18. The provider reports that it ignores the requested temperature. The answer deadline is 60 seconds per attempt.

| Sample | Corpus digest |
|---|---|
| Clean docs group and retrieval controls | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| GS-056 with fix 4 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

Each index was loaded with its matching settings article. The clean and fix-4 corpora have 72 articles and 570 passages each. Fix 4 changes the settings article's restart and world-reset coverage. Raw checkpoints stay local with the de-identified dataset outside the repository.

The smoke test on the clean index ran GS-062 before the coverage change. Checkpoint `golden-2026-11-24T03-09-16-808Z-1.json` recorded a 37.3-second attempt, with model calls of 5.9 and 27.9 seconds, three searches, eight article reads, one status read, one log read, 18 retrieved spans and 30 admitted spans. The citation gate passed and the judge scored it partial. The trace records admission during the tool loop, so a subsequent timeout can retain admission evidence even without a final answer. The model call timings are client-observed and include provider waiting.

The coverage gate now requires both policy sources, after-sales routing, explicit no-speedup guidance and a distinction from general support. Offline replay rejects both the saved rerun 17 existing-ticket-only draft and the unchanged rerun 18 delivered response. It accepts the rerun 18 response with a natural route distinction added. The account blocker handoff regression tests also pass.

The first batch overlapped the isolation matrix, repeat blocks and full run. It encountered HTTP 429 responses in addition to answer timeouts. Some terminal provider errors reached the harness as lifecycle handoffs. The harness now retries HTTP 429 with backoff and scores provider failures without a completed gate as unscored. The revised run uses lower concurrency. Earlier samples are reported separately, with terminal provider failures identified from their traces.

The owner still needs to reconcile retention and restoration for GS-049 and GS-053, settle the GS-166 SFTP destination and panel upload threshold, and review section 5 of the conventions report.

## Prompt and retrieval isolation

The scratch matrix held the clean corpus, model and judge fixed. The old-prompt arm restored the pre-`eb98779` citation instruction only. The old-retrieval arm disabled the two new focused queries and retained the preexisting connection focus. All other code was shared. The separate no-focus control for GS-030 disabled every focused query while keeping the primary search.

| Citation prompt / retrieval | GS-023 | GS-030 |
|---|---|---|
| Old / old | Gate failed with zero exact matches after 28.0 s | Three timeouts, approximately 60 s each |
| Old / new | Gate failed with zero exact matches after 48.7 s | Timeout at 60.0 s, then HTTP 429 at 38.4 s |
| New / old | Timeouts at 60.5 and 60.1 s, then HTTP 429 at 31.3 s | Timeout at 60.0 s, then HTTP 429 at 36.6 s |
| New / new | Timeout at 60.6 s, then HTTP 429 at 30.9 s | Three timeouts, approximately 60 s each |

With four search calls per completed search step, the new retrieval admitted `debug/automatic-route-switching.md:1-7` and `debug/googledns.md:1-12` on both items. With two search calls, the old retrieval did not admit those spans. The spans reached the model before the generation failures. No scratch cell delivered GS-023's flush, Google DNS and conditional rejoin together with exact citations. No cell delivered GS-030's automatic failover and qualified DNS rationale. The admission effect is isolated in this matrix. Option A's contribution to rerun 18's GS-023 delivery remains unresolved because neither new-prompt cell reached the gate.
