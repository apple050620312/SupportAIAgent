# Rerun 13 diagnosis — the 5 wrong items

Scope: rerun 13 (full 13-item docs group, checkpoint `eval-results/golden-2026-11-23T19-17-04-458Z-13.json`, retrieval `openai`, index 71 articles / 566 passages, digest `898c35b5b203`, model gpt-6.1-sol, 60 s limit), main `fc2fd8c`. Result **4 correct / 4 partial / 5 wrong / 0 unscored, handoff 2**. This report traces only the 5 wrong items: GS-056, GS-062, GS-140, GS-163, GS-166. Rerun 14 (targeted GS-140 + GS-166, new index 72 / 570, digest `6b7b4b6d68e2`) is used where it already re-measured an item. No code, KB, or index changes were made for this diagnosis. Evidence inventory: [kb-rerun13-diagnosis-evidence.md](kb-rerun13-diagnosis-evidence.md).

## Summary

| Item | Verdict | Delivered | Gate | Root cause (one line) |
| --- | --- | --- | --- | --- |
| GS-056 | wrong | delivered | passed | Passage admitted but unused; draft actively advises against the expected reinstall |
| GS-062 | wrong | delivered | passed | Passage admitted but unused; draft routes to the current ticket, opposite of the expected after-sales routing (regression vs rerun 11, model-side variance) |
| GS-140 | wrong | delivered | passed | Structural eval limitation: no support-flow cue exists in the prompt, so no retrieval can surface the policy |
| GS-163 | wrong | handoff | **failed** | Gate discarded the draft: verbatim quotes wrapped in ```` ```markdown ```` fences, which the quote matcher cannot recognise (proven by offline replay) |
| GS-166 | wrong | handoff | **failed** | Gate discarded the draft: blockquoted leading fragments of two long passages, attached to full-range labels (genuine truncation, proven by replay) |

Three distinct mechanisms, not one: **evidence-use failure** (GS-056, GS-062), **structural eval limitation** (GS-140), and **gate discarding a draft over citation format** (GS-163, GS-166). Of the two gate discards, only GS-166's draft was substantively partial in a way the gate did not cause; GS-163's draft was partial too, but for a different reason (missing activation-wait point) — the gate is the proximate cause of the handoff in both, not the sole cause of the wrong verdict in either.

## Per-item attribution

### GS-056 — "我剛剛把資料全刪了 會影響嗎" (wrong, delivered)

Expected points: (1) deleting all data resets the world; (2) go to Settings → Reinstall Server → restart, the world resets. The draft says the opposite of point 2: 「如果你想保留原本的資料，**先不要重啟、重裝或上傳檔案覆蓋**」, then asks a clarifying question (which screen did you delete from). Gate passed (matched `[index.md:18-19]`), completeness `true`, `contentCoverage: false`, `currentPolicyCoverage: true`.

- **Retrieval worked.** Two `knowledge/search` calls ran; the focused reinstall retrieval admitted `panel/common/settings.md:1-14` ("點擊右下方「重新安裝伺服器」可重新安裝您的伺服器"). It is in `admittedEvidence`. The regex repair from rerun 12 (matching 「資料全刪了」) is confirmed working.
- **The passage was never used.** The draft cites only the daily-backup passage and never mentions reinstall. Three compounding reasons:
  1. **The passage states a button, not a consequence.** `settings.md:1-14` is generic panel documentation; it never says "deleting all data resets the world" or "reinstall to complete the reset". The bridge between "I deleted everything" and "reinstall" is an inference the passage does not make.
  2. **The model's causal reasoning is inverted for this case.** It treats reinstall as destructive (true in general) and therefore as something to avoid before damage assessment — but the data is already deleted, so reinstall is the remedy, not the risk. The model failed to condition on the deletion having already happened.
  3. **A logs 404 pushed it into an uncertainty branch.** `toolErrors: ["/v1/me/server-logs:HTTP_404"]` — the draft frames everything around "還無法確認這次刪除了哪些檔案" and asks a clarifying question instead of answering. The 404 did not cause a handoff, but it set the draft's stance.
- **No mechanism requires using the focused passage.** Rerun-9 fix 1 added an "address the branch first" requirement only for the downgrade symptom. The reinstall focused retrieval has no equivalent. The rerun-11 prompt checklist (answer admitted passages point-by-point) did not prevent the skip: the model treated the backup passage as the point and ignored the reinstall one. `contentCoverage: false` while completeness is `true` shows the completeness check is format-based (length + action word + excerpt prefix), not coverage-based.

### GS-062 — repeated disconnects, "找你们几天了一直没给我回复" (wrong, delivered; regression partial → wrong)

Expected points: (1) a disconnect is an after-sales issue → open an after-sales ticket; (2) general tickets don't handle product after-sales; (3) duplicate tickets don't speed things up. The draft is a thorough MTR/WARP troubleshooting procedure ending with 「把测试结果补充到当前工单」 — it routes the customer to the **current** (general) ticket, the opposite of the expected routing. Gate passed on one matched pair (`[debug/connection.md:103-109]`) despite 7 failures (6 `excerpt_mismatch` + 1 `wrong_lines`); `contentCoverage: true`, `ungroundedDelivery: true` (see note below).

- **Retrieval is identical to rerun 11.** The after-sales passages `debug/connection.md:55-66` ("仍無法連線…開啟「售後服務」客服單") and `:116-128` (same instruction, with the data list) are in `admittedEvidence` in **both** runs, with the same top-3 semantic scores (0.558 / 0.523 / 0.515). Nothing changed on the retrieval side.
- **The regression is model-side evidence-use variance.** Rerun 11's draft quoted `:116-128` verbatim, including 「開啟「售後服務」客服單」, and was judged partial. Rerun 13's draft cited `:116-128` but used it only for the data-collection list, never stated the after-sales routing, never said "don't open duplicates", and added the opposite instruction ("补充到当前工单"). Same evidence in, different use out, across two runs on different code but with no retrieval change.
- **Branch selection failure.** The model treated the question as a technical troubleshooting question and prioritized the disconnect diagnosis. The process cue — "找你们几天了一直没给我回复" (waited days without a reply) — is the duplicate-ticket signal, but the model read it as "collect more diagnostics". The draft's final line ("需要技术人员按故障时间核对宿主节点") is correct as far as it goes, but it never converts that into the routing instruction the reference requires.
- **Diagnostic inconsistency worth one line:** `ungroundedDelivery: true` while the gate passed. The derived check (`eval-golden.ts:196`) requires the **full** excerpt string to appear in the answer; the relaxed gate passes on ≥1 matched pair. GS-062's draft cited 8 labels, only 1 with a verbatim excerpt, so the two diagnostics disagree by design. The draft's citations are indeed mostly paraphrases — the derived check is not wrong, but the two numbers mean different things and should not be read as contradicting each other.

### GS-140 — BMC4 installer, `/mods` empty (wrong, delivered)

Expected points: (1) duplicate tickets don't speed things up; (2) product issues use the after-sales ticket category; (3) wait for technical staff, don't open many duplicates. The draft is pure Forge-installer troubleshooting (mod.md citations), gate passed, marker overridden, delivered. All 3 points missing.

- **Confirmed structural limitation, unchanged since rerun 12.** The customer problem (BMC4 v59 installer, `/mods` empty) contains **no duplicate-ticket cue at all**. The support-flow clues (duplicate tickets, after-sales, wait for reply) appear only in the staff replies, which never enter the prompt. `admittedEvidence` is entirely installer/startup passages; `semanticScores` top 8 are all installer-related (0.60–0.64). No support-flow passage (`store/discord.md`, `store/services/support-channels.md`) was admitted, and the duplicate-tickets article did not exist in the rerun-13 index at all.
- **The KB article itself is proven fine.** Rerun 14's retrievability probe: for on-topic queries the article ranks **#1** (0.8343), all 4 passages in the top 5. In rerun 14's own run, the article is in **neither** the semantic top 8 **nor** admitted evidence — same prompt, same outcome. The wrong verdict is a property of the eval item, not the article.
- **What would measure it:** a golden item whose customer problem actually raises duplicate tickets. That means finding a real duplicate-ticket item among the 837 transcripts (preferred — keeps the golden set real-ticket-based), not a synthetic variant. A secondary option is a KB cross-reference from the installer articles to the duplicate-ticket policy, so the model can route even installer questions toward the policy when the customer reports waiting — that is a general policy statement, not ticket text, but it still needs owner approval as a KB addition.

### GS-163 — "已經購買伺服器要如何啟動呢" (wrong, handoff)

Expected point (single): after purchase, wait for support to activate the service, then start it from the control panel. The delivered answer is the generic fallback ("我不知道…已轉交人工客服"). `citationGateViolation: true`, gate failed with matched `[]` and two `excerpt_mismatch` failures (`[panel/start-server.md:1-14]`, `[panel/start-server.md:15-38]`). No tool errors — a clean run, pure gate failure. `handoffContentVerdict: wrong`, judgment points `['partial']`: "The answer explains how to start the server from the control panel once the service is activated, but it does not tell the customer that they must wait for customer support to activate it."

- **The discarded draft was verbatim — but fenced.** The `drafts` field preserves the model draft: a 9-step startup procedure quoting both passages in full, inside ```` ```markdown ```` fences. Offline replay of the gate logic (1:1 re-implementation, see evidence file) reproduces the exact failure, and **stripping the fences makes both citations match**. Mechanism, precisely: `quoteStart` requires only whitespace between the end of the quoted text and the citation label; the closing ```` ``` ```` sits between them, so neither the exact match nor the whitespace-tolerant regex can recognise the quote. The quote text itself is complete and verbatim.
- **Rerun 11 is the control.** Same passages, same code path: the rerun-11 draft quoted `:15-38` as plain text (no fences) and the gate passed on that pair; verdict correct. The only material difference is the model's formatting choice — fences this time, plain text last time. This is model-side formatting variance, not a retrieval or KB change (same digest `898c35b5b203`).
- **The gate is the proximate cause of the handoff, but not the sole cause of the wrong verdict.** The content judge rates the discarded draft itself only partial: it explains starting once activated ("服務開通後，查看您的電子郵件…") and ends with "請先確認服務是否已完成開通", but never states the wait-for-activation point explicitly. Even with the gate fixed, this draft would be partial at best. Both defects need fixing (see fix 1 + fix 3 below).
- **The `>`-repair could not help.** The repair pass strips blockquote prefixes; GS-163's draft has none on the quoted lines (the `> Source:` lines inside the quotes are part of the excerpt itself — stripping them would corrupt the match). Repair attempted, `repaired: false`, before/after identical.

### GS-166 — "伺服器資料夾大於10MB 傳不上去" (wrong, handoff; re-measured partial in rerun 14)

Expected points: (1) large files use SFTP, not the panel; (2) folders can be dragged directly; (3) the destination folder depends on file type. The delivered answer is the generic fallback. `citationGateViolation: true`, gate failed with matched `[]`, two `excerpt_mismatch` failures (`[panel/common/sftp.md:1-47]`, `[panel/manage/upload.md:6-28]`). `handoffContentVerdict: partial`, points `[covered, covered, missing]`: SFTP recommended, drag-into-SFTP-client covered, destination-folder point missing.

- **Genuine truncation, not a formatting accident.** The `drafts` field shows the model blockquoted the **leading fragment** of each passage (the SFTP intro + a few lines of a 47-line passage; the 2 warning lines of upload.md:6-28) and attached the full-range labels. Offline replay: stripping `> ` prefixes yields `truncated` for both — exactly the checkpoint's post-repair state. The repair pass correctly diagnosed truncation and correctly refused to fix it (it cannot invent the missing lines).
- **Do not re-diagnose the 10MB part.** Rerun 13 judged against the old 10MB staff answer. The owner has since adjudicated the panel limit as **100MB**, and rerun 14 (new index, upload.md clarified) already scores this item **partial, delivered**: the draft states 「面板檔案上傳上限為 100MB」 explicitly and the gate passed on `[panel/manage/upload.md:6-30]`. What is still wrong after the adjudication: (a) the gate still discarded a partial draft in rerun 13 (the sftp citation still fails even in rerun 14, but is diagnostics-only once one pair matches); (b) the destination-folder point is still missing (`contentCoverage: false` in rerun 14 too).
- **Rerun 14 also shows the fix direction for the gate:** its draft quoted the upload passage as **plain text** (no fences, no `>` prefixes), and the gate matched it. The difference between a discarded draft and a delivered one here is purely the model's quoting format.

## What is NOT the cause (ruled out with evidence)

- **General retrieval failure.** GS-056, GS-062, GS-163, GS-166 all had the target passages admitted; only GS-140's support-flow branch was absent, and that branch has no prompt cue to retrieve on.
- **Index or provider change.** Rerun 13 and rerun 11 ran on the same index digest `898c35b5b203`, same provider, same model.
- **Deadline / timeout / provider outage.** 0 unscored; no model failures recorded. Tool errors are limited to server-logs 404 (GS-056, GS-062, GS-140) and one `knowledge/read` 404 (GS-166) — none of them caused a handoff; GS-163 had zero tool errors.
- **The semantic judge alone.** Content verdicts on the discarded drafts (GS-163 partial, GS-166 partial) corroborate that the drafts were incomplete independently of the gate; the judge is not inventing the wrong verdicts.
- **A single gate problem explaining all five.** The gate failed on only 2 of the 5; the other 3 passed the gate and were delivered wrong.

## Ranked fix targets

### 1. Gate: normalise fenced verbatim quotes before matching (GS-163)

The gate's quote matcher should ignore ```` ``` ```` fence markers (and the language tag) when locating a quote, or equivalently strip fenced-code delimiters from the draft before evaluation. Deterministic, not prompt-based: prompt rules about citation format have repeatedly been ignored by the model (GS-041 downgrade inference, GS-138 blockquotes, now GS-163 fences). The repair pass should gain the same normalisation so it can recover fenced drafts instead of returning them unchanged.
- **Verify:** offline replay of the GS-163 rerun-13 draft passes the gate with both citations matched; targeted rerun GS-163 → gate `passed`, delivered. (Content verdict will be at best partial until fix 3 lands — that is expected, not a failure of this fix.)

### 2. Evidence use: generalise the focused-passage coverage requirement (GS-056, GS-062)

Rerun-9 fix 1 solved this only for the downgrade symptom ("address the downgrade branch first"). The same mechanism is now the cause in 2 of 5 items: a focused retrieval fires and admits the target passage, but nothing requires the draft to use it. Generalise the pattern: when a focused search fires for a symptom (reinstall, support-flow, …), record its hit as a required-coverage point and fail completeness when the draft does not address it. Prefer the deterministic runner-side check over another prompt instruction.
- **Verify:** GS-056 draft writes the world-reset consequence + Settings → Reinstall Server → restart steps; GS-062 draft states the after-sales routing and the no-duplicate-tickets point. Each should move wrong → partial or better on a targeted rerun. (GS-062's rerun-11 partial shows the draft can reach partial with the same evidence; the fix should make that stable, not run-dependent.)

### 3. Completeness: per-point required-step checks (GS-163, GS-056)

The completeness check passed on drafts that miss required steps (`contentCoverage: false` while completeness `true` in GS-056 and GS-163). Add required-step checks keyed to the admitted task: for GS-163, the draft must state waiting for support activation before panel startup; for GS-056, the draft must state the world-reset consequence and the reinstall+restart steps. This is the rerun-11 fix-5 direction, applied per item rather than as a single reflection-ratio threshold (which proved too blunt at 0.20).
- **Verify:** GS-163 draft mentions waiting for activation; GS-056 draft covers both expected points; `contentCoverage` flips to `true` on those items without changing the gate.

### 4. KB wording: state the consequence in the reinstall passage (GS-056; needs owner approval)

`settings.md:1-14` says where the reinstall button is, never what reinstall does after data deletion. Ask the owner (as a KB gap question, like the round-2 questions) to confirm a consequence sentence — e.g. "刪除全部資料後世界會重製；到設定按重新安裝伺服器再開機，世界就會重製" — and add it to the settings/reinstall passage. Note the wording overlaps the staff resolution; per the KB rule it needs explicit owner approval as a general procedure statement, not a copy of ticket text.
- **Verify:** the passage is retrievable for the GS-056 prompt and the draft cites it; GS-056 moves wrong → partial or better.

### 5. GS-140 measurement path (no code fix will move the current item)

- **(a) Find a real duplicate-ticket golden item** among the 837 transcripts — a ticket whose customer problem itself raises duplicate tickets. That is the only way to measure the duplicate-tickets article end-to-end. Do not synthesise one; the golden set is real-ticket-based.
- **(b) Optional KB cross-reference** (owner approval): a line in the installer troubleshooting articles pointing to the duplicate-ticket policy when staff have not replied. This could let the model route even installer questions toward the policy. It is a general policy statement, not ticket text.
- **Verify:** (a) the new item's admitted evidence includes `store/services/duplicate-tickets.md` and the draft cites it; (b) if (b) is done, the GS-140 draft mentions the after-sales category / wait guidance.

### 6. Measurement hygiene: align `ungroundedDelivery` with the gate (GS-062)

The derived check requires the full excerpt string in the answer; the relaxed gate passes on ≥1 matched pair. Both fired differently on GS-062 (gate passed, `ungroundedDelivery: true`). Either make the derived check use the gate's `matched` set, or record the two with distinct documented meanings. Diagnostic-only; does not change any verdict.
- **Verify:** rerun the GS-062 checkpoint through the scoring code and confirm the two diagnostics agree on the same draft.

## Fix order

1 → 2 → 3, then 4 and 5 in parallel (both need the owner), 6 whenever convenient. After fixes 1–3, re-run the full 13-item docs group (rerun 15) and compare against rerun 13 (4/4/5, handoff 2): the pass standard is GS-163 delivered, GS-056 and GS-062 each at least partial, no primary verdict regressed.
