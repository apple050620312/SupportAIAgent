# GS-041 downgrade-inference rerun

## Fix

This change uses deterministic evidence filtering instead of prompt wording. The project has repeated cases of models ignoring prompt instructions, including paraphrased citations and self-escalating handoffs. Filtering the known downgrade source at admission prevents an incidental semantic or lexical hit from reaching the model or downstream checks.

In `search_support_knowledge`, the filter runs after the admitted list is assembled, including any focused downgrade match, and before `coRetrieveCompanions`. The order is admission → downgrade-source filter → companion retrieval → evidence, citation gate, and completeness state. This prevents the passage and companions from entering the tool result, `evidence`, citation gate, or `answerCompletenessCheck` inputs.

When the prompt has a downgrade symptom, the passage remains admitted and retains `POSSIBLE_ROOT_CAUSE`, preserving the GS-105 guardrail. GS-138 coverage remains true because its prompt has no downgrade symptom and its relevant evidence is unaffected.

## Verification

| Command | Result |
| --- | --- |
| `pnpm build` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm test` | Passed, 395 script tests and 56 Support Core tests |
| `pnpm run eval:mock` | Passed, 76 tests |
| `pnpm lint` | Passed |

## Golden-set cases

Live rerun results are intentionally left for the coordinator.

| Case | Prior scope-fix result | This fix rerun |
| --- | --- | --- |
| GS-041 | wrong / handoff / coverage true / draft asks downgrade question | TBD |
| GS-105 | 10 correct / delivered / downgrade branch required and delivered | TBD |
| GS-138 | partial / delivered / coverage true | TBD |
