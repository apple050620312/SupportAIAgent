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

## Timeout arms

The standard loop with `gpt-6.1-sol` timed out on all three attempts for each item in `golden-2026-11-24T04-08-26-494Z-2.json`. GS-018 admitted 17 spans on each attempt with one search, eight article reads, one status read and one log read. GS-030 admitted 28 spans with four searches and the same reads. Model calls took 58.25–59.72 s per attempt. No completed answer reached the gate.

The `gpt-6-luna` arm (`golden-2026-11-24T04-15-04-193Z-2.json`) delivered partial answers for both items. GS-018 timed out twice, then delivered at 58.4 s with the same admission count and only search and article reads. GS-030 timed out once, then delivered at 49.0 s with the same admission and tool counts as the baseline. The three model calls on that attempt took 3.80 + 15.99 + 28.88 s. This is a completion improvement for these samples. Provider waiting and inference remain indistinguishable.

The narrower loop (`golden-2026-11-24T04-21-08-477Z-2.json`) timed out all three attempts for both items. GS-018 admitted 17 spans and used fewer tool calls on two attempts. GS-030 admitted 28 spans and retained the baseline tool counts on every attempt because its second model call timed out. Model calls consumed 58.27–59.60 s per attempt. The arm did not reproduce the Luna deliveries. GS-030's Luna success with matching tool counts places the observed latency difference inside model calls, but the serial samples cannot distinguish model choice from variation in provider service.

## Stability repeats

The first clean block is `golden-2026-11-24T04-27-48-339Z-6.json`. GS-023 passed with 10 exact citation matches and covered flush and Google DNS. The judge gave partial credit for reconnecting because the draft did not explicitly say rejoining should work once DNS functions normally. GS-094 passed with seven exact citation matches and gave both Startup Settings → 26.3 and Settings → Reinstall Server in order. Both delivered on the first attempt. GS-023 took 48.4 s with model calls of 5.18 + 2.79 + 38.76 s. GS-094 took 42.5 s with model calls of 10.03 + 5.02 + 25.80 s.

GS-056 handed off in 22.9 s on clean when restart and reset evidence was absent. On fix 4 it admitted the expanded settings span and delivered both claims in 56.0 s, scoring correct in `golden-2026-11-24T04-32-58-037Z-1.json`. Both arms used the same answering model, judge and deadline. GS-084, GS-108 and GS-163 scored correct on first attempts in 28.8, 36.6 and 53.8 s respectively.

The second clean block is `golden-2026-11-24T04-34-27-709Z-6.json`. GS-023 scored correct with flush, Google DNS and conditional rejoin, and had nine exact citation matches. It delivered on the first attempt in 51.2 s with model calls of 5.96 + 43.62 s. GS-094 again gave both steps in order with seven matches and delivered on the first attempt in 33.0 s with model calls of 9.11 + 21.93 s. GS-084, GS-108 and GS-163 again scored correct on their first attempts. GS-056 handed off on clean in 25.2 s and delivered both claims on fix 4 in 21.9 s, scoring correct in `golden-2026-11-24T04-39-31-338Z-1.json`.
