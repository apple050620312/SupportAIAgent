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

GS-138 coverage flipped to true, and the draft no longer requires mentioning downgrade. GS-041 no longer adds downgrade or backup questions. It asks about the Docker image field being locked, whether Java 8 is available, and the next steps for switching the image and retrying Minecraft 1.8.3. Its semantic verdict remained wrong because the answer still does not establish the Java 25 / Netty cause or that Java 8 is required.

No primary semantic verdict regressed. GS-138 improved from wrong to partial. GS-041 remained wrong.
