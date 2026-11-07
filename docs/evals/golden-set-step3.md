# Golden set: Vercel loop, step 4

## Run status — 2026-11-07

Measured with loop + draft KB v1 (unreviewed). Full live run: 175/175 executed; resolved-correct **0/154 (0.0%)**, handoff-correct **21/21 (100.0%)**, partial **0/154**, wrong **154/175 (88.0%)**. Offline resolution proxy: 0/175. Average generation attempts: **1.17**; wall time **1,740.654 seconds**; average item latency **9.95 seconds**. Cost: **null** (endpoint instrumentation provides no price).

Smoke (10): resolved-correct 0/9, handoff-correct 1/1, partial 0/9, wrong 9/10; average 1.30 attempts and 9.75 seconds/item.

The retrieval gate changed from requiring 0.5 lexical query coverage to accepting any passage at 0.2, or the best returned passage at 0.1. This was calibrated against step-3's 0/175 retrieval admissions. It still requires a returned passage, exact excerpt and `[source:start-end]` citation; empty or unrelated retrieval hands off. The live model still failed the final citation/evidence gate on this run, so measured resolution did not improve despite the safer admission rule.

## Per-category coverage

All 19 categories preserved the same result pattern: resolved-correct 0; partial 0; handoff-correct 100% for handoff rows; every expected-resolved row was wrong. Category sizes: account_access 8, billing_other 6, billing_payment 11, billing_question 3, cannot_connect 19, custom_quote 6, files_panel 6, general_other 9, lag_performance 11, plan_cancel 6, plan_upgrade 8, plugin_mod 13, pre_sales 6, purchase_help 5, refund 6, server_other 13, server_start_crash 22, version_core 9, world_backup 8.

## Failure patterns

The dominant failure remains the model producing an uncited or non-verbatim answer, which the final safety gate correctly converts to handoff. Two billing items (GS-089 and GS-102) again encountered synthetic invoice HTTP 403 and were handed off; this is a harness limitation, not a loop error. Representative de-identified drafts requested status/log or plan evidence but did not include the exact returned excerpt. Lexical scoring does not assess semantic correctness, negation, or factual truth.

The ignored draft KB grew from 9 to **19 articles / 86 sections**. Added topics: files/panel, pre-sales/pricing, refunds, cancellations, custom quotes, account recovery, common error codes, network errors, backup restore checks, and plan upgrades. Articles use general Minecraft hosting knowledge and retain the draft-v1 staff-review marker; no golden answers were copied.

Model selection is environment-driven: `MODEL_PROVIDER=sub2api` (default) uses `SUB2API_API_KEY` and `https://sub2api.coffeehost.net/v1`; `MODEL_PROVIDER=openai` uses `OPENAI_API_KEY` and `https://api.openai.com/v1`. Both default to `gpt-6.1-sol`. Sub2api was live-tested here; official OpenAI construction was verified with a mock key but not live-tested.

## Caveat and deferred work

Scores measure “loop + draft KB v1 (unreviewed)”. A static set cannot establish seven-day true resolution or no reopen. Staff KB review, shadow mode, tracing, semantic claim review, and a durable staff approval queue remain deferred.

Raw smoke/full results are in ignored `eval-results/`; `knowledge/` is ignored and was not committed.
