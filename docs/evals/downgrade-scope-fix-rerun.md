# Downgrade scope fix targeted rerun

Commanded rerun for `GS-138,GS-041` with live `gpt-6.1-sol` via sub2api and semantic retrieval. Checkpoint: `eval-results/golden-2026-11-23T17-17-06-478Z-2.json`.

Retrieval was verified as `openai` with model `text-embedding-3-small`, digest `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`, and 71 articles / 566 passages. The comparison checkpoint is `eval-results/golden-2026-11-23T16-55-11-084Z-6.json`.

| Item | Field | Rerun 10 | Fix rerun | Result |
|---|---|---:|---:|---|
| GS-138 | gate | passed | passed | unchanged |
|  | completeness | false | true | passed |
|  | contentCoverage | false | true | **passed** |
|  | handedOff | true | false | improved |
|  | semantic verdict | wrong | partial | improved, no regression |
| GS-041 | gate | passed | passed | unchanged |
|  | completeness | true | true | unchanged |
|  | contentCoverage | true | true | unchanged |
|  | handedOff | true | true | unchanged |
|  | semantic verdict | wrong | wrong | unchanged |

GS-138 coverage flipped to true, and the draft no longer requires mentioning downgrade. GS-041's draft still opens with the downgrade question ("您之前有把這台伺服器的 Minecraft 版本從較高版本降到 1.8.3 嗎？如果有，請先壓縮或下載世界備份，再使用新世界，或還原升級前與 1.8.3 相容的備份。") and the backup instructions, nearly verbatim vs rerun 10 — the GS-041 verification point did NOT pass. The fix removed the POSSIBLE_ROOT_CAUSE marking and the completeness requirement for this item (`hasDowngradeSymptom(prompt)` is false for GS-041), but the downgrade passage is still admitted via primary semantic search (score 0.4939, same as rerun 10) and visible to the model, which infers the downgrade branch on its own. Its semantic verdict remained wrong because the answer still does not establish the Java 25 / Netty cause or that Java 8 is required.

No primary semantic verdict regressed. GS-138 improved from wrong to partial. GS-041 remained wrong, and its draft still leads with the downgrade question — scoping the requirement and the marking did not stop the model from volunteering the branch when the passage is admitted.
