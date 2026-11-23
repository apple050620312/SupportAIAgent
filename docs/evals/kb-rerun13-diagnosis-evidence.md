# Rerun 13 diagnosis — evidence inventory

Sources: rerun-13 checkpoint `eval-results/golden-2026-11-23T19-17-04-458Z-13.json` (retrieval `openai`, `text-embedding-3-small`, digest `898c35b5b203`, 71 articles / 566 passages, gpt-6.1-sol, 60 s limit); rerun-11 checkpoint `eval-results/golden-2026-11-23T17-40-32-806Z-13.json` (same digest); rerun-14 checkpoint `eval-results/golden-2026-11-23T19-34-48-783Z-2.json` (digest `6b7b4b6d68e2`, 72 / 570); golden set `~/workspace/coffee-host-golden/golden_set.json`; KB articles in `knowledge/`. All checkpoint values below were read directly from the files, not from reports.

## Headline numbers

| | correct | partial | wrong | unscored | handoff |
| --- | --- | --- | --- | --- | --- |
| Rerun 13 (13 docs items) | 4 | 4 | 5 | 0 | 2 |
| Rerun 11 (same 13) | 1 | 6 | 6 | 0 | 4 |
| Rerun 14 (GS-140 + GS-166 only) | 0 | 1 | 1 | 0 | 0 |

Rerun-13 per-item verdicts: correct GS-018? No — correct: GS-049, GS-084, GS-094, GS-108. Partial: GS-018, GS-023, GS-030, GS-053. Wrong: GS-056, GS-062, GS-140, GS-163, GS-166. Handoffs: GS-163, GS-166.

## GS-056 — wrong, delivered

- Expected points (golden set): 「刪除全部資料後世界會重製」; 「到設定按重新安裝伺服器再開機，世界就會重製」. Staff resolution: same two points in one sentence.
- Customer problem (verbatim): 「我剛剛把資料全刪了 會影響嗎」
- Checkpoint: `semantic.verdict: wrong`, `handedOff: false`, `handoffMarkerPresent: false`, gate `passed` (matched `[index.md:18-19]`, failures `[]`), `answerCompletenessAttempts: [true]`, `contentCoverage: false`, `currentPolicyCoverage: true`, `citationGateViolation: false`, `toolErrors: ["/v1/me/server-logs:HTTP_404"]`, `referenceConflict.status: uncertain` ("No owner-confirmed current-KB passage was available.").
- Event log: 2× `/v1/me/knowledge/search` `ok` (primary + focused reinstall retrieval), 8× `/v1/me/knowledge/read` `ok`.
- Admitted evidence includes `panel/common/settings.md:1-14` (focused-retrieval prepend). Its excerpt: 「點擊右下方「重新安裝伺服器」可重新安裝您的伺服器」 (plus SFTP/settings boilerplate). No consequence statement anywhere in the passage.
- Draft (from `drafts[1]`, the delivered answer): warns deletion impact depends on which files were deleted; cites only the daily-backup passage `[index.md:18-19]`; says 「如果你想保留原本的資料，**先不要重啟、重裝或上傳檔案覆蓋**」; asks which screen the deletion happened on. Reinstall is never mentioned.
- Rerun 11 (same item): wrong, delivered, gate passed (matched `[index.md:18-19]`). Its draft also said 「**先別重啟或重裝。**」 — the anti-reinstall stance is stable across both runs.

## GS-062 — wrong, delivered (regression partial → wrong)

- Expected points: 「伺服器斷線屬於售後問題，須開售後服務客服單」; 「一般客服單不處理產品售後相關問題」; 「重複開單並不會加速處理」.
- Customer problem (verbatim, abridged): bought the machine last night, repeated disconnects, reinstalls last under 10 minutes, 「找你们几天了一直没给我回复」.
- Checkpoint: `semantic.verdict: wrong`, `handedOff: false`, `handoffMarkerPresent: true`, `handoffMarkerOverridden: true`, gate `passed` (matched `[debug/connection.md:103-109]`, failures: 6× `excerpt_mismatch` + 1× `wrong_lines`), `answerCompletenessAttempts: [true]`, `contentCoverage: true`, `currentPolicyCoverage: true`, `citationGateViolation: false`, `ungroundedDelivery: true`, `toolErrors: ["/v1/me/server-logs:HTTP_404"]`.
- Admitted evidence includes `debug/connection.md:55-66` and `:116-128` (both contain 「開啟「售後服務」客服單」). Draft cites `:116-128` but uses it only for the data-collection list; final instruction: 「把测试结果补充到当前工单」.
- Rerun 11 (same item): partial, delivered, gate passed with 4 matched pairs. Its draft quoted `:116-128` verbatim including 「開啟「售後服務」客服單」. Semantic top-3 scores identical in both runs: connection.md:9 (0.558), :55 (0.523), :116 (0.515). Retrieval unchanged; the regression is model-side evidence use.
- `ungroundedDelivery` definition (`scripts/eval-golden.ts:196`): `hasGateEvidence = evidence.some(e => answer.includes(`[${e.source}:${e.startLine}-${e.endLine}]`) && answer.includes(e.excerpt))`. GS-062's draft cited 8 labels but only 1 with a verbatim excerpt, so the derived check is false while the relaxed gate passes.

## GS-140 — wrong, delivered (structural)

- Expected points: 「重複開啟客服單不會加速處理」; 「產品相關問題應使用售後服務類客服單」; 「應等待技術人員回覆，勿大量重複開單」.
- Customer problem (verbatim, abridged): Better MC [FORGE] BMC4 v59, index requires MC 1.20.1 / Forge 47.4.20; `.plugin-install-*` temp dirs hold the index and overrides, root `/mods` empty; installer deployment stage unclear.
- Checkpoint: `semantic.verdict: wrong`, `handedOff: false`, `handoffMarkerPresent: true`, `handoffMarkerOverridden: true`, gate `passed` (matched `[practice/install/mod.md:44-48]`, 4× `excerpt_mismatch` diagnostics), `answerCompletenessAttempts: [true]`, `contentCoverage: true`, `toolErrors: ["/v1/me/server-logs:HTTP_404"]`.
- Admitted evidence: only `practice/install/mod.md`, `practice/install/neoforge-1211.md`, `panel/config/startup.md` passages. Semantic top 8: neoforge-1211.md:1 (0.640), mod.md:101 (0.629), mod.md:66 (0.633), startup.md:26 (0.626), mod.md:44 (0.600), mod.md:32 (0.604), startup.md:22 (0.595), mod.md:6 (0.595). No support-flow passage in either array. The duplicate-tickets article did not exist in the rerun-13 index.
- Rerun 14 (same item, new index): still wrong, delivered; admitted sources still only `panel/config/startup.md`, `practice/install/mod.md`, `practice/install/neoforge-1211.md`; semantic top 8 identical. The article is in neither array. Rerun-14 probe (from the rerun-14 report): on-topic queries rank the article #1 (0.8343 for 「重複開客服單 客服單一直沒有回覆 要再開一張嗎」, 0.6881 for 「開了很多張客服單都沒有人回覆」), all 4 passages in the top 5.
- Rerun 11 (same item): wrong, handoff, gate failed (`truncated` on `[practice/install/mod.md:44-58]`), answer was the generic fallback.

## GS-163 — wrong, handoff (gate discard)

- Expected point (single): 「購買伺服器後須待客服開通，開通後即可在控制面板啟動伺服器」. Staff resolution: service activated, customer can use the server.
- Customer problem (verbatim): 「您好，我想詢問已經購買伺服器要如何啟動呢！」
- Checkpoint: `semantic.verdict: wrong`, `handedOff: true`, `handoffMarkerPresent: false`, gate `failed` (matched `[]`, failures: `[panel/start-server.md:1-14]` `excerpt_mismatch`, `[panel/start-server.md:15-38]` `excerpt_mismatch`), `citationGateViolation: true`, `contentCoverage: false`, `citationGateRepair: {attempted: true, repaired: false}` (before/after identical), `toolErrors: []`.
- `handoffContentVerdict: {verdict: 'wrong', judgment: {points: ['partial'], verdict: 'wrong', reason: 'The answer explains how to start the server from the control panel once the service is activated, but it does not tell the customer that they must wait for customer support to activate it. It does not contradict the staff resolution.'}, basis: 'judge'}`.
- Discarded draft (from `drafts[1]`): 9-step startup procedure quoting both passages in full inside ```` ```markdown ```` fences, each followed by its citation label on a separate line; ends with 「如果您尚未收到控制面板帳號創建通知，請先確認服務是否已完成開通」. No explicit "wait for support to activate" statement.
- Offline replay (1:1 re-implementation of `quoteStart`/`quoteFailure` from `packages/agent-loop/src/citation-gate.ts`, run against the draft + checkpoint `evidence`): both citations `excerpt_mismatch` — exact reproduction of the checkpoint gate. After deleting the ```` ```markdown ```` and ```` ``` ```` fence lines, **both citations match**. Mechanism: `quoteStart` requires only whitespace between the end of the quoted text and the citation label; the closing fence is non-whitespace, so neither the exact match nor the whitespace-tolerant regex can recognise the quote.
- Rerun 11 (same item): correct, delivered, gate passed (matched `[panel/start-server.md:15-38]`, with 2 `excerpt_mismatch` diagnostics). Its draft quoted `:15-38` as plain text without fences and mentioned the activation email ("如果您是第一次登入，請在服務開通後寄送的帳號建立通知中…").
- Admitted excerpts (checkpoint `evidence`): `panel/start-server.md:1-14` (account-creation notification, "如您是首次購買，您將會在服務開通後收到控制面板帳號創建通知") and `:15-38` (login → console → Start → EULA → Done → copy address). Semantic scores: :1 (0.707), :15 (0.665).

## GS-166 — wrong, handoff (gate discard; re-measured partial in rerun 14)

- Expected points: 「大檔案應使用 SFTP 上傳，而非面板直接上傳」; 「可直接將資料夾拖曳上傳」; 「上傳目標資料夾依檔案種類而定」.
- Customer problem (verbatim): 「你好 請問伺服器資料夾大於10MB 傳不上去 是要壓縮傳上去嗎?」. Staff resolution: files over 10MB use SFTP (with SFTP tutorial); folders can be dragged directly; destination folder depends on file type.
- Checkpoint: `semantic.verdict: wrong`, `handedOff: true`, gate `failed` (matched `[]`, failures: `[panel/common/sftp.md:1-47]` `excerpt_mismatch`, `[panel/manage/upload.md:6-28]` `excerpt_mismatch`), `citationGateViolation: true`, `contentCoverage: false`, `citationGateRepair: {attempted: true, repaired: false}` — after repair the failures became `truncated` for both. `toolErrors: ["/v1/me/knowledge/read:HTTP_404"]`.
- `handoffContentVerdict: {verdict: 'partial', judgment: {points: ['covered', 'covered', 'missing'], verdict: 'partial', reason: 'The answer recommends SFTP instead of the control panel for large uploads and explains that the folder can be dragged directly into the SFTP client. It mentions a destination folder but does not explain that the destination depends on the file type.'}, basis: 'judge'}`.
- Discarded draft (from `drafts[1]`): recommends SFTP, blockquotes the SFTP intro + first lines (`> # SFTP`, `> 控制面板的檔案管理僅供基礎使用…`) with label `[panel/common/sftp.md:1-47]`, then blockquotes the 2 warning lines with label `[panel/manage/upload.md:6-28]`. Both quotes are leading fragments of much longer passages.
- Offline replay: both citations `excerpt_mismatch` — exact reproduction. After stripping `> ` prefixes, both become `truncated` — exactly the checkpoint's post-repair state. The repair pass correctly diagnosed truncation and correctly refused to fix it (the missing lines cannot be invented).
- Rerun 14 (same item, new index): **partial, delivered**. Gate passed on `[panel/manage/upload.md:6-30]` (sftp citation still `excerpt_mismatch`, diagnostics-only). Its draft quoted the upload passage as **plain text** (no fences, no `>` prefixes) and states 「面板檔案上傳上限為 100MB」 explicitly. `contentCoverage: false` still (destination-folder point still missing). Rerun-13 judgment used the old 10MB staff answer; the owner has since adjudicated the panel limit as 100MB — the 10MB part is not a live defect.
- Rerun 11 (same item): wrong, handoff, gate failed (`excerpt_mismatch` on `[panel/manage/upload.md:6-28]`), answer was the generic fallback.

## Gate code references (read-only)

- `packages/agent-loop/src/citation-gate.ts`: `quoteStart` — exact match requires the excerpt to appear verbatim with only whitespace between its end and the citation label; fallback regex joins the excerpt's literal tokens with `\s+` and anchors at the end (`\s+$`) with a `(?<!\S)` lookbehind. `quoteFailure` — `truncated` when the quoted text is a strict prefix of the excerpt; otherwise `excerpt_mismatch`. `isBlockingCitationFailure` — `unknown_citation`, `missing_citation`, `no_admitted_evidence` always block; `wrong_lines` blocks only with no matched pair; `excerpt_mismatch`/`truncated` never block on their own — they block only by leaving `matched` empty, which fails the gate.
- `scripts/eval-golden.ts:196`: `hasGateEvidence = evidence.some(e => answer.includes(`[${e.source}:${e.startLine}-${e.endLine}]`) && answer.includes(e.excerpt))`; `ungroundedDelivery: !error && !handedOff && !hasGateEvidence`.
- Gate history (no change between rerun 11 and rerun 13 that affects excerpt matching): last excerpt-matching change was `f7ec8ce` (whitespace-tolerant regex, rerun-9 repairs); later commits `d04f415` (wrong_lines non-blocking with a match) and `c2a8d0b` (missing-citation label restoration) do not touch `quoteStart`.
