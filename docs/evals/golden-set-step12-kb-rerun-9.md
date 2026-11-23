# Step 12 KB rerun 9

The six-item semantic rerun completed on 2026-11-23 at code commit `f7ec8ce`. It used gpt-6.1-sol through sub2api and the 60-second answer deadline. The completed checkpoint confirms retrieval provider `openai`, model `text-embedding-3-small`, digest `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`, 71 articles, and 566 passages. The index was reused without rebuilding.

## Measured totals

| Run | Correct | Partial | Wrong | Handoff |
|---|---:|---:|---:|---:|
| Step 12 baseline | 0 | 0 | 6 | 1 |
| Rerun 7 | 1 | 0 | 5 | 5 |
| Rerun 8 | 1 | 0 | 5 | 4 |
| Rerun 9 | 1 | 1 | 4 | 4 |

GS-042 improved from wrong to partial compared with both prior reruns. No primary verdict regressed. GS-138 regressed on completeness compared with both prior runs, and its citation gate still failed after passing in rerun 7. The lexical diagnostic scored 0/6 correct. All six items scored on the first attempt with zero unscored items and zero provider failures.

## Per item

| Item | Primary verdict | Draft verdict | Delivery | Citation gate | Completeness | Retrieval evidence |
|---|---|---|---|---|---|---|
| GS-041 | wrong | wrong | handoff | pass | pass | Docker switching rank 1, score 0.6220. Downgrade article rank 3, score 0.4939. |
| GS-042 | partial | — | delivered | pass | pass | Modpack preservation rank 1, score 0.7117. Excerpt mismatch diagnostics remained. |
| GS-084 | correct | — | delivered | pass | pass | Password recovery section rank 1, score 0.6194. |
| GS-096 | wrong | wrong | handoff | pass | pass | `practice/advanced/test-server.md:1-7` was admitted again at rank 1, score 0.5671. It was admitted in rerun 7 and absent in rerun 8. |
| GS-105 | wrong | wrong | handoff | fail | fail | `practice/advanced/version-downgrade.md` did not enter the eight admitted candidates, so it has no recorded rank or score for this item. `debug/connection.md:72-78` led at rank 1, score 0.5836. |
| GS-138 | wrong | partial | handoff | fail | fail | Velocity rank 1, score 0.6876. The fresh draft failed the gate with two `excerpt_mismatch` diagnostics, for Velocity lines 1–9 and Minecraft lines 19–31. Only Minecraft lines 8–18 were admitted. |

A dash means the harness recorded no separate handoff draft verdict. GS-138's rerun 8 checkpoint scored the handoff draft partial, although the rerun 8 report lists it as wrong. Its primary verdict was wrong in all three reruns.

The saved rerun 8 GS-138 draft also cited `[store/description/minecraft.md:19-31]`. Only lines 8–18 were admitted, so this was a genuine `wrong_lines` defect that the gate correctly blocked. Repair 3 fixed only the Velocity whitespace issue. The fresh rerun 9 draft independently failed the gate. It had no whitespace mismatch diagnostic, but it repeated the unsupported Minecraft range and failed the Velocity excerpt check.

## Pending owner adjudication

GS-041's historical Java 8 requirement and account lock, GS-096's historical live address and version versus current Discord guidance, and GS-138's historical network processing rationale still require owner review. The semantic verdicts use the historical references.

Checkpoint file `eval-results/golden-2026-11-23T15-52-03-175Z-6.json`.
