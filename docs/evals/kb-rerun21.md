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

Build, typecheck, lint, 419 script tests, 56 Support Core tests, and 76 mock eval checks passed. 

## Clean results

All 13 standard-model rows were saved. The harness keeps its status as `running` and exits 1 when any row is unscored. The pass standard was unmet.

| Run | Correct | Partial | Wrong | Unscored | Handoffs |
|---|---:|---:|---:|---:|---:|
| Rerun 20 6.1-sol | 6 | 3 | 3 | 1 | 3 |
| Rerun 21 6.1-sol | 5 | 2 | 4 | 2 | 3 |

| Item | Rerun 20 6.1-sol | Rerun 21 6.1-sol | Rerun 21 Luna |
|---|---|---|---|
| GS-018 | Unscored | Correct | Pending |
| GS-023 | Correct | Correct | Pending |
| GS-030 | Partial | Unscored | Pending |
| GS-049 | Correct | Wrong | Pending |
| GS-053 | Partial | Partial | Pending |
| GS-056 | Wrong / handoff | Wrong / handoff | Pending |
| GS-062 | Wrong / handoff | Correct | Pending |
| GS-084 | Correct | Correct | Pending |
| GS-094 | Correct | Wrong / handoff | Pending |
| GS-108 | Correct | Partial | Pending |
| GS-140 | Partial | Unscored | Pending |
| GS-163 | Correct | Correct | Pending |
| GS-166 | Wrong / handoff | Wrong / handoff | Pending |


## GS-140 routing and GS-166 citation fidelity

GS-140 admitted `store/discord.md` and `store/services/duplicate-tickets.md` on all three 6.1-sol attempts. Each timed out before reaching the gates. Admission worked live. The explicit wait-for-staff advice and delivery still need verification.

GS-166 admitted the upload and SFTP articles and handed off after two excerpt mismatches with zero exact citation matches. The draft judge also found missing destination-by-file-type guidance and a threshold that conflicted with the staff reference. Both saved drafts omitted source text while citing full spans. Replaying the exact saved excerpts and labels from both runs passed, and changing one non-whitespace character failed. Removing blockquote prefixes alone did not recover the full excerpts. The evidence points to quote fidelity. Destinations and the panel threshold remain owner decisions. Retention and restoration for GS-049/GS-053 and section 5 of the conventions report also remain open.

The Luna comparison, durability samples, and targeted fix-4 run are in progress.
