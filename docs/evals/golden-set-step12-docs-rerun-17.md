# Golden set step 12 docs rerun 17

Rerun 17 ran the rerun-16 diagnosis fixes 1–4 (branch `feat/kb-rerun16-fixes`, head
`5fd0c91`) against the clean index, checkpoint
`eval-results/golden-2026-11-23T22-22-33-544Z-13.json`. It completed with 72 articles,
570 passages, 13 scored results, and 0 unscored. The clean index digest was
`6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, retrieval
`provider=openai`, model `gpt-6.1-sol` via sub2api. Dataset SHA
`5d774be134d5287bb93200f8f0c74d0abd6cf234481f560147ed4536487bdc3c`, same as rerun 16.

The headline was 4 correct, 2 partial, and 7 wrong, with 4 handoffs. Rerun 16 was
3 correct, 3 partial, and 7 wrong, with 2 handoffs. The pass standard was **not met**:
GS-062 and GS-056 did not reach partial, GS-023 did not reach partial, and two primary
verdicts regressed (GS-030 and GS-053, partial → wrong). GS-018 and GS-108 were delivered.

| Item | Rerun 16 | Rerun 17 | Rerun 17 delivered / handoff | Gate |
|---|---|---|---|---|
| GS-018 | wrong | partial | delivered | passed |
| GS-023 | wrong | wrong | handoff | failed, handoff content partial |
| GS-030 | partial | wrong | handoff | failed, handoff content partial |
| GS-049 | wrong | wrong | delivered | passed |
| GS-053 | partial | wrong | delivered | passed |
| GS-056 | wrong | wrong | handoff | passed, completeness false (intended withhold) |
| GS-062 | wrong | wrong | handoff | passed, coverage false |
| GS-084 | correct | correct | delivered | passed |
| GS-094 | correct | correct | delivered | passed |
| GS-108 | wrong | correct | delivered | passed |
| GS-140 | wrong | wrong | delivered | passed |
| GS-163 | correct | correct | delivered | passed |
| GS-166 | partial | partial | delivered | passed |

## Fixes in this branch

All on `feat/kb-rerun16-fixes` (base `3598cf0`, head `5fd0c91`), verified by the boss
with the full suite green on the final head (build, typecheck, `pnpm test` 416 + 56,
`eval:mock` 76, lint) and `sk-proj` count 0 in the diff. No `knowledge/`, `.kb-index/`,
or Support Core changes.

- Fix 1 (`e898e58`): support-flow detection in both scripts + vocabulary expansion
  (斷開/断开, 連接不上, Simplified variants), duplicate-ticket policy admitted into the
  focused search, coverage split into the routing check (`store/discord.md`) and the
  duplicate check (`store/services/duplicate-tickets.md`).
- Fix 2 (`647295a`, `737cb2e`, `5fd0c91`): repair requires positive, source-supported
  reinstall/restart instructions (per-occurrence negation, bare-mention check) and only
  appends the world-reset sentence when the admitted excerpt supports it; the world
  pattern covers both word orders. Two boss-verification rounds caught and fixed a
  global-negation veto and an action-verb requirement that rejected legitimate two-branch
  answers; the final code passes all six checks (preserve-only fails, E's fix-4 draft
  passes, natural 「不要保留資料」 phrasing passes, verbatim fix-4 「使用」 wording passes,
  repair sentence satisfies its own coverage pattern, clean evidence still withholds).
- Fix 3 (`030e722`): SYSTEM_PROMPT now leads connection problems with the connection
  recovery procedure (cache flush, Google DNS, conditional rejoin) and keeps DiscordSRV
  to a qualified aside.
- Fix 4 (`459a9b8`, `d96ab14`, `ff7e46c`, `0353ae3`, `973065b`): fenced and blockquoted
  citation spans are repaired (fence removal, outer `> > Source:` unwrap) without
  weakening grounding; fake ranges still fail.

Fix 5 (SFTP KB gaps + cancellation-retention reconciliation) was not attempted; it needs
owner input.

## Targeted GS-056 fix-4 run

Checkpoint `eval-results/golden-2026-11-23T22-30-32-474Z-1.json` produced verdict
**correct**, `handedOff=false`, judge basis, both expected points covered. The gate passed
with `[panel/common/settings.md:1-16]` matched and completeness true. The delivered answer
gives the reset procedure (Settings → Reinstall Server, restart, new world) with the
fix-4 sentence quoted.

The run used the fix-4 index, digest
`04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` (72 articles,
570 passages). Note: swapping the index alone is not sufficient — the loader rejects an
index whose digest does not match the on-disk corpus, so the worktree's
`knowledge/panel/common/settings.md` was also temporarily replaced with main's fix-4
version for this run. Both were then restored from backup and verified: the worktree
index is back at the clean digest
`6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, and
`knowledge/panel/common/settings.md` again ends with the reinstall image line and a
single newline (the fix-4 sentence is absent from the worktree copy).

## Verified findings

1. Fix 4 delivered GS-018 (wrong → partial) and GS-108 (wrong → correct). Both gates
   now pass. GS-018's judge still marks the second point partial: the answer recommends
   SFTP on Network Error but suggests renaming the file first rather than explicitly
   checking the upload connection. GS-108 is fully correct.
2. Fix 3's content goal is achieved on GS-023, but the citation gate is now the binding
   constraint. The R17 draft leads with connection recovery, gives cache flush, Google DNS
   (`8.8.8.8` / `8.8.4.4`), and conditional rejoin, with DiscordSRV only as a qualified
   aside; the diagnostic judge scores the draft partial (covered, covered, partial).
   The gate failed with zero matched citations — every quote is paraphrased or shortened
   (`excerpt_mismatch`) — the unwrap/fence repair could not recover it, so the draft was
   handed off. GS-030 is the same story (handoff content partial: flush covered, Google
   DNS partial, auto route-switch missing) plus merged ranges the gate rejects as
   `wrong_lines` (`[debug/warp.md:92-112]`, `[debug/connection.md:67-84]`).
3. Fix 1's mechanism works but the last mile fails on GS-062. The classifier fires on the
   exact saved prompt and on a Traditional paraphrase (boss-verified; a full-175 sweep
   shows GS-062 as the only newly triggered item, and GS-140 stays negative). R17 admits
   `store/services/duplicate-tickets.md:6-9, 10-13, 14-17`, where R16 admitted none of it.
   But `store/discord.md` (the after-sales route) was never admitted — the focused search
   (limit 3) returned only duplicate-ticket ranges — and the draft paraphrases the
   duplicate guidance as 「請在現有工單裡補充」 without the literal 售後 / 客服單 / 重複
   policy statements, so coverage fails on the keyword check and the diagnostic judge
   scores all three expected points missing. The model also requested handoff itself
   (`STAFF_HANDOFF`).
4. Fix 2 behaves as designed on GS-056. On the clean index the R17 draft is preserve-only
   (「請先不要再次啟動、重新安裝或覆蓋目前檔案」), completeness is false, and the answer
   is honestly handed off with no unsupported reset claim appended — the R16 wrong
   delivery is gone. On the fix-4 index the same code delivers a correct answer (see
   above). GS-056 therefore cannot move on the clean index without the fix-4 sentence in
   the evaluated corpus; that sentence already exists in main's KB and index.
5. Regressions: GS-030 (partial → wrong) is the gate story in finding 2. GS-053
   (partial → wrong) is a judge-basis change on the unresolved retention reference
   conflict: the R17 draft suggests staff may confirm whether restoration is possible,
   contradicting the reference that recovery is impossible after 14 days. No fix 1–4
   code path touches GS-053's content, and its gate passed in both runs. This is fix-5
   territory and still needs the owner's retention ruling.
6. Controls held: GS-084, GS-094, GS-163 correct; GS-166 partial; GS-140 wrong as the
   scope control (its prompt has no support-flow cue, correctly not forced).

## What still needs a decision

- Retention / backup-timing ruling for GS-049 and GS-053 (fix 5, owner).
- Fix 1 last mile: admit `store/discord.md` routing alongside the duplicate-ticket policy
  (e.g. a dedicated focused search for the routing article), and consider semantic rather
  than literal-keyword coverage for the duplicate guidance — the R17 draft conveys "use
  the existing ticket" without the word 重複.
- Gate vs paraphrase (GS-023, GS-030): the drafts now have the right content but paraphrase
  quotes and merge ranges; the verbatim gate discards them. Options are a quote-fidelity
  instruction, a paraphrase-tolerant gate that preserves grounding, or merged-range repair.
  Do not weaken grounding silently.
