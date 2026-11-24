# Golden set docs rerun 20

The full clean run and targeted repeats use the merged prompt and gate at `110d22a`, with `gpt-6.1-sol` through sub2api and OpenAI `text-embedding-3-small` for retrieval. The answer deadline is 60 seconds per attempt. The semantic judge and 13-item docs group match rerun 19. Each index is loaded with its matching settings article.

| Sample | Corpus digest |
|---|---|
| Clean docs group and controls | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| GS-056 with fix 4 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

The timeout comparison uses the standard loop, the standard loop with `MODEL_ID=gpt-6-luna`, and a scratch loop with `gpt-6.1-sol` that disables optional model tool calls from step three onward. The scratch loop still honors required reads and search, uses the existing retrieval fanout, and stays outside the shipped code. Model-call measurements include provider wait. Runs are serial to reduce self-induced rate limiting. The checkpoints retain per-attempt wall time, model calls, failures, tool counts, retrieved and admitted spans, and any drafts. Raw evidence stays in the gitignored `eval-results/` directory.

Build, typecheck, lint, 474 tests and 76 mock eval checks passed before the live runs. The existing-ticket-only completeness negative control passed.

The owner rulings remain open on GS-049/GS-053 retention and restoration, GS-166 SFTP destinations and panel threshold, and section 5 of the conventions report.

## Routing verification

The first routing block saved both rows in `golden-2026-11-24T04-02-03-003Z-2.json`. GS-062 admitted both policy sources on the first repeat. All three attempts timed out before the gate. Each made three searches, eight article reads, one status read and one log read. The two model calls took 6.36 + 51.97 s, 6.05 + 53.56 s and 5.10 + 54.48 s. No completed answer or staff marker was recorded. GS-140 delivered in 46.1 s, scored partial and overrode its staff marker. Neither policy source was admitted, so this does not meet the routing verification criteria.

The second block saved GS-062 in `golden-2026-11-24T04-06-27-536Z-2.json`. It delivered on the first attempt in 36.2 s with both policy articles admitted, citation and completeness gates passed, and all three semantic points covered. The draft explicitly says product incidents go to after-sales, general support does not handle them, and duplicate tickets do not speed up processing. The runner recorded and overrode a staff marker after the synthetic log read returned 404.

GS-140 scored partial on the second routing block as well, delivering in 31.5 s with the marker overridden. Neither policy source was admitted. The judge credited after-sales and no-speedup advice in both blocks but marked the wait-for-staff point partial in both.
