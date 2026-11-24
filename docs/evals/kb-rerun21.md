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
| Rerun 21 Luna | 3 | 3 | 4 | 3 | 3 |

| Item | Rerun 20 6.1-sol | Rerun 21 6.1-sol | Rerun 21 Luna |
|---|---|---|---|
| GS-018 | Unscored | Correct | Wrong / handoff |
| GS-023 | Correct | Correct | Unscored |
| GS-030 | Partial | Unscored | Partial |
| GS-049 | Correct | Wrong | Unscored |
| GS-053 | Partial | Partial | Partial |
| GS-056 | Wrong / handoff | Wrong / handoff | Wrong / handoff |
| GS-062 | Wrong / handoff | Correct | Unscored |
| GS-084 | Correct | Correct | Correct |
| GS-094 | Correct | Wrong / handoff | Wrong |
| GS-108 | Correct | Partial | Partial |
| GS-140 | Partial | Unscored | Correct |
| GS-163 | Correct | Correct | Correct |
| GS-166 | Wrong / handoff | Wrong / handoff | Wrong / handoff |

## GS-140 routing and GS-166 citation fidelity

GS-140 admitted `store/discord.md` and `store/services/duplicate-tickets.md` on all three 6.1-sol attempts. Each timed out before reaching the gates. Admission worked live. The explicit wait-for-staff advice and delivery still need verification.

GS-166 admitted the upload and SFTP articles and handed off after two excerpt mismatches with zero exact citation matches. The draft judge also found missing destination-by-file-type guidance and a threshold that conflicted with the staff reference. Both saved drafts omitted source text while citing full spans. Replaying the exact saved excerpts and labels from both runs passed, and changing one non-whitespace character failed. Removing blockquote prefixes alone did not recover the full excerpts. The evidence points to quote fidelity. Destinations and the panel threshold remain owner decisions. Retention and restoration for GS-049/GS-053 and section 5 of the conventions report also remain open.

## Luna comparison

Luna ran the full clean group with `MODEL_ID=gpt-6-luna`, the same judge and the same deadline. Its checkpoint is `golden-2026-11-24T05-49-19-911Z-13.json`. It delivered 7/13 answers, 6/13 on the first attempt, with 3/13 correct per scheduled item. The standard arm delivered 8/13, all on its first attempt, with 5/13 correct. Luna recorded fewer correct outcomes than 6.1-sol in this pair. This pair does not support Luna-first or a Luna policy for timeout-prone items. Luna recovered a partial GS-030 while giving up the correct GS-018 result. Provider waiting and inference are combined in the elapsed time.

- GS-018 — Wrong / handoff, 2 attempt(s), 0 exact matches and 2 citation failures.
- GS-030 — Partial, 1 attempt(s), 9 exact matches and 1 citation failures.
- GS-140 — Correct, 1 attempt(s), 4 exact matches and 0 citation failures. Policy admissions by attempt are recorded below.
- GS-166 — Wrong / handoff, 1 attempt(s), 0 exact matches and 2 citation failures.

GS-140 admitted both policy articles on its only attempt. It asked the customer to route the issue to after-sales so technicians could inspect the installer. The judge credited wait guidance from the queue explanation and the advice against duplicate tickets. The draft still lacked an explicit instruction to wait for a staff reply.

Luna’s GS-166 draft recommended SFTP for large files and folder uploads. It omitted drag-and-drop and destinations by file type. Two excerpt mismatches still caused a handoff.

## Durability

The full 6.1-sol clean run is sample one. Four additional blocks scheduled the same five items against the clean index. The bar is five correct deliveries with valid citations. Parentheses show attempts.

| Sample | GS-023 | GS-108 | GS-084 | GS-094 | GS-163 |
|---|---|---|---|---|---|
| Full clean run | Correct (1) | Partial (1) | Correct (1) | Wrong / handoff (1) | Correct (1) |
| golden-2026-11-24T06-08-50-711Z-5.json | Partial (3) | Correct (1) | Correct (3) | Correct (3) | Unscored (1) |
| golden-2026-11-24T06-19-58-991Z-5.json | Correct (3) | Correct (1) | Correct (1) | Correct (1) | Correct (2) |
| golden-2026-11-24T06-27-51-707Z-5.json | Partial (1) | Correct (1) | Correct (1) | Correct (1) | Correct (1) |

The targeted fix-4 run is in progress.
