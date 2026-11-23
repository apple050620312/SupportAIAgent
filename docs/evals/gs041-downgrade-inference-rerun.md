# GS-041 downgrade-inference rerun

Targeted rerun for `GS-041,GS-105,GS-138` with live `gpt-6.1-sol` via sub2api and semantic retrieval. Checkpoint: `eval-results/golden-2026-11-23T17-32-59-202Z-3.json`. Branch: `feat/gs041-downgrade-inference`, head `73890f1` (fix) + `e5adfca` (tests) at rerun time.

Retrieval was verified as `openai` with model `text-embedding-3-small`, digest `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`, and 71 articles / 566 passages — identical to the comparison checkpoint `eval-results/golden-2026-11-23T17-17-06-478Z-2.json`.

## Fix (a): deterministic evidence filtering, not prompt wording

In `search_support_knowledge` (`packages/agent-loop/src/index.ts`, commit `73890f1`), when `hasDowngradeSymptom(prompt)` is false, any match with `source === DOWNGRADE_SOURCE` (`practice/advanced/version-downgrade.md`) is removed from `admitted` after admission is computed (both the semantic path and the lexical fallback converge here, and after the focused-search prepend, which only runs with a symptom) and before `coRetrieveCompanions`. Order: admission → downgrade-source filter → companion retrieval → runner `evidence` → citation gate / completeness check. The model therefore never sees the passage, and no companion of it can leak in either.

Why filtering over prompt wording (b): this project has repeated records of the model ignoring prompt instructions (paraphrased citations, self-escalating handoff). Filtering is deterministic, and it continues the already-merged scope-limiting direction (ac3a64c). The SYSTEM_PROMPT downgrade paragraph was left untouched: it is conditional on the passage being marked `POSSIBLE_ROOT_CAUSE`, which can no longer happen for no-symptom questions once the passage is filtered out.

Proof the filter did the work, not a retrieval change: in the new checkpoint GS-041's primary semantic scores still rank `practice/advanced/version-downgrade.md:1-12` at 0.4938, above the 0.4 threshold — the same hit as before — yet it is absent from `admittedEvidence`. (The checkpoint's `evidence` field still logs the raw primary-search matches, where the passage appears; the runner's internal evidence, which feeds the citation gate and `answerCompletenessCheck`, is built only from the filtered `admitted` list.)

## Verification

| Command | Result |
| --- | --- |
| `pnpm build` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed, 395 script tests and 56 Support Core tests |
| `pnpm run eval:mock` | Passed, 76 tests |
| `pnpm lint` | Passed |

New tests (`e5adfca`, `scripts/test/vercel-agent.test.ts`): no-symptom prompt + downgrade passage among search results → it appears in neither the tool result returned to the model nor `admittedEvidence`, on both the semantic and lexical admission paths. The symptom path is covered by the pre-existing focused-search admission test (downgrade passage still admitted and still priority-marked when the prompt has a downgrade symptom).

## Results

| Item | Field | Before (scope-fix rerun) | This rerun | Result |
|---|---|---|---|---|
| GS-041 | gate | passed | passed | unchanged |
|  | completeness / contentCoverage | true / true | true / true | unchanged |
|  | handedOff | true | true | unchanged |
|  | semantic verdict | wrong (lifecycle) | wrong (lifecycle) | unchanged |
|  | draft asks downgrade question | yes ("您之前有把這台伺服器的 Minecraft 版本從較高版本降到 1.8.3 嗎？…") | **no** | **fixed** |
|  | downgrade passage in admittedEvidence | yes (0.4939) | **no** (still scores 0.4938 in primary search) | **fixed** |
| GS-105 | gate | passed (rerun 10) | passed | unchanged |
|  | completeness / contentCoverage | true / true | true / true | unchanged |
|  | handedOff | false | false | unchanged |
|  | semantic verdict | correct (rerun 10) | correct | unchanged |
|  | downgrade branch | required + delivered first | required + delivered first (`version-downgrade.md:1-12` first in admittedEvidence) | guardrail held |
| GS-138 | gate | passed | passed | unchanged |
|  | completeness / contentCoverage | true / true | true / true | unchanged |
|  | handedOff | false | false | unchanged |
|  | semantic verdict | partial | partial | unchanged |

GS-041's draft now leads with the correct answer — Docker image switching / Java 8 (`panel/config/docker-image-switching.md:1-11`) and the locked field — and never mentions downgrading. Its verdict stays wrong only because it still hands off: the server-log read failed (`/v1/me/server-logs:HTTP_404`) and the draft asks staff to confirm why the Docker-image field is locked and whether a Java 8 image is available. That is the pre-existing account-blocker handoff, not the downgrade-inference defect this fix targets.

No primary semantic verdict regressed. GS-105 stays correct and delivered with the downgrade branch required and handled first; GS-138 stays partial and delivered with coverage true.
