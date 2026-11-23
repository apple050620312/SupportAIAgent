+# Step 12 KB rerun 8

Targeted semantic rerun of GS-041, GS-042, GS-084, GS-096, GS-105, and GS-138 completed on 2026-11-23. The run used gpt-6.1-sol through sub2api, the 60-second deadline, and the unchanged semantic index. Checkpoint retrieval reports provider `openai`, model `text-embedding-3-small`, digest `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`, 71 articles, and 566 passages.

## Measured totals

| Run | Correct | Partial | Wrong | Handoff |
|---|---:|---:|---:|---:|
| Step-12 baseline | 0 | 0 | 6 | 1 |
| Rerun 7 | 1 | 0 | 5 | 5 |
| Rerun 8 | 1 | 0 | 5 | 4 |

Rerun 8 therefore has no semantic improvement over rerun 7. Handoff count fell from 5 to 4. Lexical diagnostic was 0/6 correct. All six items scored and completed without retryable provider failure.

## Per item

| Item | Primary verdict | Draft verdict | Delivery | Citation gate | Completeness | Retrieval evidence |
|---|---|---|---|---|---|---|
| GS-041 | wrong | wrong | handoff | pass | pass | Docker switching admitted and cited. Downgrade article rank 7, score 0.4938. |
| GS-042 | wrong | wrong | delivered | pass | pass | Modpack preservation rank 1, score 0.7117. Several paraphrased citations remained diagnostic failures. |
| GS-084 | correct | correct | delivered | pass | pass | Password section rank 1, score 0.6194, confirming control retrieval. |
| GS-096 | wrong | wrong | handoff | fail | fail | No admitted evidence. |
| GS-105 | wrong | wrong | handoff | fail | fail | Downgrade article was absent from the eight admitted candidates. Network candidates ranked 1–8, led by debug/connection.md:72-78 at 0.5836. |
| GS-138 | wrong | wrong | handoff | fail | pass | Velocity article rank 1, score 0.6876. Citation had whitespace mismatch. |

Citation, completeness, and handoff-marker decisions are recorded separately in the checkpoint diagnostics. Wrong line ranges remain blocking failures. Current-policy coverage is recorded alongside the historical semantic verdict and does not adjudicate historical expectations.

## Pending owner adjudication

Fix 2 intentionally leaves these historical questions unresolved. GS-041 account action for Java 8 availability and the lock, GS-096 historical live address and version versus the current Discord guidance, and GS-138 historical network-processing rationale require owner review. The rerun reports current passage coverage separately and makes no policy decision from those historical references.

Checkpoint: `eval-results/golden-2026-11-23T15-21-22-224Z-6.json`.

