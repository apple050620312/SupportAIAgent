# Golden set step 12 docs rerun 16

Rerun 16 used the clean fix-3 index and checkpoint `eval-results/golden-2026-11-23T21-16-38-246Z-13.json`. It completed with 72 articles, 570 passages, 13 scored results, and 0 unscored. The clean index digest was `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`.

The headline was 3 correct, 3 partial, and 7 wrong, with 2 handoffs. Rerun 15 was 3 correct, 4 partial, and 6 wrong, with 3 handoffs. The pass standard was **not met**. GS-056, GS-062, and GS-023 did not move to the required outcome, and three primary verdicts regressed.

| Item | Rerun 15 | Rerun 16 | Rerun 16 delivered / handoff | Gate |
|---|---|---|---|---|
| GS-018 | partial | wrong | handoff | failed, handoff content correct |
| GS-023 | wrong | wrong | delivered | passed, coverage false |
| GS-030 | partial | partial | delivered | passed |
| GS-049 | correct | wrong | delivered | passed |
| GS-053 | partial | partial | delivered | passed |
| GS-056 | wrong | wrong | delivered | passed, completeness true |
| GS-062 | wrong | wrong | delivered | passed |
| GS-084 | correct | correct | delivered | passed |
| GS-094 | correct | correct | delivered | passed |
| GS-108 | partial | wrong | handoff | failed, handoff content correct |
| GS-140 | wrong | wrong | delivered | passed |
| GS-163 | wrong | correct | delivered | passed, completeness true |
| GS-166 | wrong | partial | delivered | failed, then passed |

## Fix-5 variance runs

All four runs used the clean digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`.

| Item | Checkpoint | Verdict | Handed off | Gate |
|---|---|---|---|---|
| GS-023 | `golden-2026-11-23T21-26-59-874Z-1.json` | wrong | no | passed |
| GS-023 | `golden-2026-11-23T21-28-10-433Z-1.json` | wrong | no | passed |
| GS-108 | `golden-2026-11-23T21-29-17-878Z-1.json` | partial | no | passed |
| GS-108 | `golden-2026-11-23T21-30-24-582Z-1.json` | correct | no | passed |

## Targeted GS-056 fix-4 run

The approved sentence was added to `knowledge/panel/common/settings.md`, then the index rebuilt and verified at digest `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. Checkpoint `golden-2026-11-23T21-32-44-241Z-1.json` produced verdict **correct**, `handedOff=false`, and `resolved`. The draft contained reinstall, restart, and world-reset content.

The sentence was then removed, the file restored to end with the reinstall image line and one newline, and the index rebuilt. The worktree index is back at the clean digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`.

## Verified findings

1. Fix 1 still misses GS-062. The new `hasSupportFlowSymptom` regex returns false for the actual Simplified Chinese prompt, while all symptom regexes are Traditional-only. There is no simplified-to-traditional normalization in the codebase. `normalizeCoverageText` only applies NFKC and lowercase.
2. Fix 2's repair is defeated by negation on GS-056. The draft says 「先別重啟或重新安裝」, so keyword checks count reinstall and restart as covered. Only the world-reset sentence was appended, and it carries a `[panel/common/settings.md:1-14]` citation that does not contain that sentence in the clean index.
3. Fix 3 changed admission order, but GS-023's draft still leads with DiscordSRV material.
4. Both rerun 16 handoffs, GS-018 and GS-108, had `handoffContentVerdict=correct`, so the good-draft-discarded pattern recurred on new items.
