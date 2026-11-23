# Golden set step 12 docs rerun 15

Rerun 15 executed 2026-11-23 with the 13-item docs group. The semantic judge scored **2 correct, 3 partial, and 8 wrong**. Rerun 13 scored 0 correct, 0 partial, and 13 wrong on the same group, so two items improved to correct and three improved to partial. No item regressed from a rerun-13 correct or partial verdict.

The checkpoint is `eval-results/golden-2026-11-23T20-17-56-803Z-13.json`. It records `retrieval.provider=openai`, model `text-embedding-3-small`, 72 articles, 570 passages, and digest `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`.

| Item | Rerun 13 | Rerun 15 | Handoff | Gate | Content coverage | Completeness attempts |
|---|---|---|---:|---|---:|---|
| GS-018 | wrong | wrong | yes | failed | false | false |
| GS-023 | wrong | partial | no | passed | false | true |
| GS-030 | wrong | partial | no | passed | false | true |
| GS-049 | wrong | wrong | no | passed | true | true |
| GS-053 | wrong | partial | no | passed | false | true |
| GS-056 | wrong | wrong | yes | passed | false | false |
| GS-062 | wrong | wrong | no | passed | true | true |
| GS-084 | wrong | correct | no | passed | true | true |
| GS-094 | wrong | wrong | yes | failed | false | false |
| GS-108 | wrong | correct | no | passed | true | true |
| GS-140 | wrong | wrong | no | passed | true | true |
| GS-163 | wrong | wrong | yes | passed | false | false |
| GS-166 | wrong | wrong | no | passed | false | true |

Targeted checks used the same OpenAI embedding index. GS-056 reached correct in its standalone run, while GS-062 reached partial in one standalone run and was wrong in another. GS-163 remained wrong but delivered an answer path. These runs show the intended fix effects while also showing model variance. The combined GS-056 plus GS-163 run had one correct and one wrong, with content coverage true for GS-056 and false for GS-163.

Fix impact was limited to the requested scope. The fence-test construction now contains one citation occurrence, preserving the citation gate’s per-occurrence diagnostics. The existing gate behavior and Support Core were unchanged. The rerun-15 corpus and index were unchanged.

Environment used `GOLDEN_LIVE_MODEL=1`, `EMBEDDING_PROVIDER=openai`, `EMBEDDING_MODEL=text-embedding-3-small`, `KB_INDEX_PATH=.kb-index/passages.json`, model `gpt-6.1-sol`, and the sub2api wrapper for chat access.
