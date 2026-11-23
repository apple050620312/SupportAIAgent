# Step 12 docs-answerable subset rerun 5

Rerun 5 completed all 13 docs-answerable items with official OpenAI semantic retrieval and matched rerun 3's recorded search evidence. The citation gate passed on six items, up from one, and handoffs fell from 13 to 11. All 13 items still scored wrong.

| Metric | Clean baseline (rerun 2) | Rerun 3 | Rerun 4 (lexical, not comparable) | Rerun 5 | Change vs rerun 3 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Correct | 1 | 0 | 1 | 0 | 0 |
| Partial | 0 | 0 | 1 | 0 | 0 |
| Wrong | 12 | 13 | 11 | 13 | 0 |
| Unscored | 0 | 0 | 0 | 0 | 0 |
| Handoff | 12 | 13 | 10 | 11 | -2 |

Rerun 4 fell back to lexical retrieval because `EMBEDDING_PROVIDER=openai` was absent or empty in the harness environment. A key alone does not select embeddings. With the provider set, the harness requires the OpenAI key and validates the model and current KB against the index before starting. Missing credentials or a stale index would fail initialization. Rerun 5 explicitly set `EMBEDDING_PROVIDER=openai`, `EMBEDDING_MODEL=text-embedding-3-small`, and `KB_INDEX_PATH=.kb-index/passages.json` inside the command launched by `~/workspace/run-with-sub2api-key.sh`, with the official key loaded from the stored file into the eval process environment. The run used `GOLDEN_LIVE_MODEL=1`, `gpt-6.1-sol` via sub2api, the same `--ids` list, and the existing 60-second item deadline.

The completed checkpoint is `eval-results/golden-2026-11-23T13-06-46-542Z-13.json`. Its `retrieval.provider` is `openai`, with model `text-embedding-3-small`, threshold 0.4, hybrid ranking `cosine + 0.02/(lexical rank + 1)`, and the same index digest as rerun 3 (`c37481a60dfe20a780d9add2e11f5170a37aed4952f650597a040f89eb3e2211`). For each of the 13 items, all eight recorded search passages cleared 0.4 and matched rerun 3 exactly by source, start and end line, and excerpt. This comparison covers the 104 recorded search passages. The checkpoint does not separately capture the passages added by companion reads.

| Item | Semantic verdict, rerun 3 → 5 | Handoff, rerun 3 → 5 | Final gate, rerun 3 → 5 |
| --- | --- | --- | --- |
| GS-018 | Wrong → wrong | Yes → yes | Fail → fail |
| GS-023 | Wrong → wrong | Yes → no | Fail → pass |
| GS-030 | Wrong → wrong | Yes → yes | Fail → pass |
| GS-049 | Wrong → wrong | Yes → yes | Fail → fail |
| GS-053 | Wrong → wrong | Yes → yes | Fail → pass |
| GS-056 | Wrong → wrong | Yes → yes | Fail → fail |
| GS-062 | Wrong → wrong | Yes → yes | Fail → fail |
| GS-084 | Wrong → wrong | Yes → yes | Pass → pass |
| GS-094 | Wrong → wrong | Yes → yes | Fail → fail |
| GS-108 | Wrong → wrong | Yes → yes | Fail → fail |
| GS-140 | Wrong → wrong | Yes → yes | Fail → pass |
| GS-163 | Wrong → wrong | Yes → no | Fail → pass |
| GS-166 | Wrong → wrong | Yes → yes | Fail → fail |

GS-163 passed the gate and delivered an answer, but rerun 4's correct verdict did not reproduce. GS-094 still failed the gate and handed off, so rerun 4's partial verdict did not reproduce. GS-084 passed the gate in both semantic runs and still handed off, unlike in rerun 4. GS-023 was the other item that avoided handoff and received a wrong verdict.

**The answer-quality gain from rerun 4 did not reproduce.** With search evidence held constant, rerun 5 showed five more gate passes and two fewer handoffs, with no improvement in the primary semantic score. The gate's causal effect on handoffs is still unclear because the live runs generated different drafts. This comparison measures the change in observed outcomes across runs.

Before the live eval, build, typecheck, tests (349 script tests and 56 Support Core tests), the mock eval (76 tests), and lint passed.
