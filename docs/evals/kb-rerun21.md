# Golden set docs rerun 21

The clean comparison uses the 13 docs items, the same semantic judge as rerun 20, and a 60-second answer deadline per attempt. Both answering models use sub2api, with OpenAI `text-embedding-3-small` for retrieval. Raw checkpoints stay in the ignored `eval-results/` directory.

| Corpus | Digest |
|---|---|
| Clean, 72 articles and 570 passages | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| Fix 4, expected | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

The prior finish attempt rebuilt the clean index. On restart, the working settings article matched `clean-settings.md`, the backup `fix4-settings.md` still contained the reset sentence, and the harness validated the rebuilt index against the current corpus. The harness accepted `--resume eval-results/golden-2026-11-24T05-23-38-224Z-13.json` with nine existing rows. The missing rows run at `d89aeac`. Resume skips saved rows with a verdict and retries saved unscored rows. It preserved eight scored rows and retried GS-030, which remained unscored after three timeouts.

## Findings from the retained checkpoint

GS-062 delivered correctly on the first attempt. Both policy articles were admitted, completeness and citations passed, all three points were covered, and the staff marker was overridden. The previous rerun's full draft handed off after failing the route distinction check despite covering all three points. The replay controls accept both saved positive drafts and reject existing-ticket-only guidance, reversed exclusions, interchangeable routes, unrelated negation, and missing policy evidence or no-speedup advice.

GS-049 moved from correct in reruns 19 and 20 to wrong. The draft still advised keeping a backup and explained that end-of-cycle cancellation prevents another invoice. It added retention claims that conflict with the staff resolution. The retention ruling is still open, so the verdict describes agreement with the evaluation reference.

GS-094 moved from correct in all three rerun 20 clean samples to wrong with handoff. Completeness passed, but citations failed with three excerpt mismatches and one line-range mismatch. The handoff draft judge also found that the reinstall instruction was conditional on Forge instead of following the version change directly.

The new deployment trigger matches the exact GS-140 input and does not match GS-049 or GS-094. The predicate change acts inside route completeness, but GS-049 delivered and GS-094 already passed completeness. Neither change explains the observed failure paths. The drafts differ from rerun 20, and the evidence does not isolate generation and judge variance.

Build, typecheck, lint, 419 script tests, 56 Support Core tests, and 76 mock eval checks passed. The live comparison, durability samples, and fix-4 retest are in progress.
