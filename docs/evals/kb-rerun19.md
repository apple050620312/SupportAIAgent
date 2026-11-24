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
