# Rerun 21 diagnosis evidence

The source checkpoints are in the ignored `eval-results/` directory. The full 6.1-sol checkpoint preserves eight scored rows from before resume. The resumed GS-140 row ran at `d89aeac`. The clean and fix-4 corpus digests are recorded in the [run report](kb-rerun21.md).

| Sample | Checkpoint |
|---|---|
| Full clean 6.1-sol | `golden-2026-11-24T05-23-38-224Z-13.json` |
| Full clean Luna | `golden-2026-11-24T05-49-19-911Z-13.json` |
| Clean repeat 1 | `golden-2026-11-24T06-08-50-711Z-5.json` |
| Clean repeat 2 | `golden-2026-11-24T06-19-58-991Z-5.json` |
| Clean repeat 3 | `golden-2026-11-24T06-27-51-707Z-5.json` |
| Clean repeat 4 | `golden-2026-11-24T06-32-12-971Z-5.json` |
| Fix-4 GS-056 | `golden-2026-11-24T06-36-06-854Z-1.json` |
| Rerun 20 full clean | `golden-2026-11-24T04-40-33-409Z-13.json` |

## Full 6.1-sol checkpoint traces

| Item | Answer attempt times (s) | Admitted spans per attempt | Citation / completeness | Outcome |
|---|---:|---:|---|---|
| GS-018 | 56.8 | 17 | Pass / pass | Correct |
| GS-023 | 53.0 | 31 | Pass / pass | Correct |
| GS-030 | 60.3 / 60.1 / 60.1 | 28 each | Not reached | Unscored |
| GS-049 | 56.1 | 9 | Pass / pass | Wrong, delivered |
| GS-053 | 35.0 | 26 | Pass / pass | Partial |
| GS-056 | 35.8 | 21 | Pass / fail | Wrong, handoff |
| GS-062 | 34.9 | 30 | Pass / pass | Correct |
| GS-084 | 26.6 | 9 | Pass / pass | Correct |
| GS-094 | 49.0 | 18 | Fail / pass | Wrong, handoff |
| GS-108 | 42.9 | 19 | Pass / pass | Partial |
| GS-140 | 60.0 / 60.0 / 60.0 | 23 each | Not reached | Unscored |
| GS-163 | 34.6 | 13 | Pass / pass | Correct |
| GS-166 | 55.7 | 24 | Fail / pass | Wrong, handoff |

## Retention and citation evidence

- **GS-049.** The draft reproduces `store/services/end-of-term-cancellation-retention.md:1-11`, whose header attributes it to owner answers. Both reruns 20 and 21 include the same 3/10/17-day timeline. Rerun 20 foregrounds a verified local backup and says old files are never guaranteed on a new rental. Rerun 21 presents the timeline as applicable and leaves possible reuse before deletion for staff to confirm. The judge credited backup advice and avoiding a new invoice in both, but penalized the timeline only in rerun 21. The gate passed in rerun 21 with one exact match and two diagnostics. `referenceConflict` remained uncertain. The checkpoints cannot isolate framing from judge variance.
- **GS-094.** The full run used `startup.md:22-33` where the admitted labels were `22-25` and `26-33`. The three other labels identify admitted spans but their quotes have added blockquote markup. The Java warning also contains literal backslash-t text. The gate reported three excerpt mismatches, one wrong range and zero matches. The draft tied reinstall to Forge. All four standard repeats had seven matches, no citation failures and correct delivery. The first repeat needed three attempts. Luna split the range correctly and delivered with four matches and one mismatch, but also tied reinstall to Forge and scored wrong on content.
- **GS-166.** Both drafts cite `panel/manage/upload.md:6-30` and `panel/common/sftp.md:1-47`. Each leaves source text out while retaining the full span labels. Each had zero matches, two excerpt mismatches and a handoff after passing completeness. The recorded offline controls reproduced the failures, passed on exact saved excerpts and labels, rejected a one-character non-whitespace change, and found that stripping blockquote prefixes alone could not restore the missing text. These are citation controls. The handoff content still lacks destinations by type and the panel threshold conflicts with the staff reference. Luna also omits drag-and-drop. [Run report](kb-rerun21.md) · [Citation gate](../../packages/agent-loop/src/citation-gate.ts)

## GS-140 timing

| Sample | Policy articles admitted | Searches / reads | Total time (s) | Model calls (s) | Result |
|---|---|---:|---:|---|---|
| Rerun 20 6.1-sol | Neither | 1 / 8 | 41.2 | 4.81 + 35.09 | Partial |
| Rerun 21 6.1-sol attempt 1 | Both | 3 / 8 | 60.0 | 30.41 + 27.79 | Timeout |
| Rerun 21 6.1-sol attempt 2 | Both | 3 / 8 | 60.0 | 16.29 + 43.45 | Timeout |
| Rerun 21 6.1-sol attempt 3 | Both | 3 / 8 | 60.0 | 15.71 + 20.86 + 23.10 | Timeout |
| Rerun 21 Luna | Both | 3 / 8 | 39.9 | 2.45 + 12.02 + 23.87 | Correct by judge |

Both articles are `store/discord.md` and `store/services/duplicate-tickets.md`. Rerun 21 admitted 23 spans versus 19 in rerun 20. The third standard attempt also queried an invoice. Measured model calls include provider wait. The Luna draft explained queue order and advised against duplicate tickets, which the judge credited as waiting advice. The draft omitted an explicit instruction to wait for staff.

## Durability and corpus control

| Item | Full | Repeat 1 | Repeat 2 | Repeat 3 | Repeat 4 | Correct |
|---|---|---|---|---|---|---:|
| GS-023 | Correct | Partial | Correct | Partial | Partial | 2/5 |
| GS-084 | Correct | Correct | Correct | Correct | Correct | 5/5 |
| GS-094 | Wrong / handoff | Correct | Correct | Correct | Correct | 4/5 |
| GS-108 | Partial | Correct | Correct | Correct | Correct | 4/5 |
| GS-163 | Correct | Unscored | Correct | Correct | Correct | 4/5 |

GS-023 repeats 1, 3 and 4 all passed both gates with the same judge points `covered, covered, partial`. Repeat 1 says to retry after a DNS lookup check and needed three attempts. Repeat 3 says to reopen the game and retry after DNS verification. Repeat 4 says to retry the original address after confirming Google DNS. Repeats 3 and 4 also suggest retrying after the route switch. All three leave implicit the expected outcome that rejoining should normally work when DNS is working. Repeat 2 earned full credit for similarly worded retry guidance, so fixed-draft rescoring would help quantify judge consistency. GS-108's full draft asks for timing and panel status after reinstall fails and omits the new console error or log at that step. GS-163's miss was an unscored agent error before the gates, with one recorded attempt lasting 59.9 s. GS-084 needed three attempts in repeat 1.

GS-062 had eight exact matches, both policy articles and an overridden staff marker. GS-018 had one exact match and one citation diagnostic and covered both judged points in 56.8 s. Each has one clean success in rerun 21. GS-056 handed off on clean with failed completeness and delivered on fix 4 in 21.9 s with two exact matches, passing completeness and judge credit for restart and reset. The final local index is fix 4. [Run report](kb-rerun21.md)
