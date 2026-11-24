# Golden set docs rerun 20

The full clean run and targeted repeats use the merged prompt and gate at `110d22a`, with `gpt-6.1-sol` through sub2api and OpenAI `text-embedding-3-small` for retrieval. The answer deadline is 60 seconds per attempt. The semantic judge and 13-item docs group match rerun 19. Each index is loaded with its matching settings article.

| Sample | Corpus digest |
|---|---|
| Clean docs group and controls | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| GS-056 with fix 4 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

The timeout comparison uses the standard loop, the standard loop with `MODEL_ID=gpt-6-luna`, and a scratch loop with `gpt-6.1-sol` that disables optional model tool calls from step three onward. The scratch loop still honors required reads and search, uses the existing retrieval fanout, and stays outside the shipped code. Model-call measurements include provider wait. Runs are serial to reduce self-induced rate limiting. The checkpoints retain per-attempt wall time, model calls, failures, tool counts, retrieved and admitted spans, and any drafts. Raw evidence stays in the gitignored `eval-results/` directory.

Build, typecheck, lint, 474 tests and 76 mock eval checks passed before the live runs. The existing-ticket-only completeness negative control passed.

The owner rulings remain open on GS-049/GS-053 retention and restoration, GS-166 SFTP destinations and panel threshold, and section 5 of the conventions report.
