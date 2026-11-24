# Golden set docs rerun 21

Rerun 21 applied the GS-062 route predicate fix on branch `feat/rerun21-fixes` at commit `9acb12a`. The fix accepts the scoped policy wording `一般支持工单不处理产品售后问题` and its Traditional Chinese equivalent while retaining the existing route, no-speedup, dual-source, and direction checks.

The required live rerun could not start. The supplied clean index has digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, but the current checkout's 73-file knowledge corpus hashes differently from the corpus used to build that index. The evaluator correctly rejected it as stale before making model calls. The requested fix-4 index digest is `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. No rerun-21 outcome counts are claimed.

## Verification

The GS-062 predicate replay controls pass. Both positive forms pass. Existing-ticket-only guidance, reversed exclusions, unrelated negation, missing no-speedup advice, and missing policy-source admission fail as required. The full repository checks pass with build, typecheck, lint, 418 tests, and 76 mock evaluation checks.

## Rerun and comparison status

The 13-item `gpt-6.1-sol` clean run, the Luna comparison arm, GS-140 live admission check, GS-166 live fidelity check, durability samples, and targeted GS-056 fix-4 run remain pending because the compatible clean index is unavailable. Rerun 20 remains the comparison baseline at 6 correct, 3 partial, 3 wrong, and 1 unscored. Its Luna timeout arm delivered partial GS-018 and GS-030 samples, while the standard model delivered a partial GS-030 sample with an additional required point. Those observations do not justify changing the default model.

GS-140 still requires a live run admitting both policy articles and explicitly advising the customer to wait for technical staff. GS-166 still requires citation-fidelity replay and owner decisions for destinations and thresholds. No owner rulings were inferred.

## Durability and attribution

No fresh clean samples were collected. The GS-062 improvement is attributable to the predicate change in replay only. It has not been validated as a live delivery change until a clean-index run completes.
