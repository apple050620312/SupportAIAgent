# Rerun 14 — targeted GS-140 + GS-166 after index rebuild

**0 correct / 1 partial / 1 wrong / 0 unscored, 0 handoffs.** Targeted rerun of the two items whose owner adjudications landed on 2026-11-24 (GS-166: panel upload limit is 100MB; GS-140: duplicate-ticket policy added to the KB), run after rebuilding the semantic index. Checkpoint: [`golden-2026-11-23T19-34-48-783Z-2.json`](../../eval-results/golden-2026-11-23T19-34-48-783Z-2.json). Retrieval `openai`, `text-embedding-3-small`, index digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, 72 articles / 570 passages. Model gpt-6.1-sol via sub2api; 60-second per-question limit unchanged.

## Index rebuild

| | Articles | Passages | Digest |
| --- | --- | --- | --- |
| Before (rerun 13) | 71 | 566 | `898c35b5b203…` |
| After rebuild | 72 | 570 | `6b7b4b6d68e2…` |

Verified in `.kb-index/passages.json` (mode 600, gitignored):

- `store/services/duplicate-tickets.md`: **4 passages** — lines 1–5 （重複開客服單）, 6–9 （重複開單不會加速處理）, 10–13 （等待技術人員回覆）, 14–17 （產品問題使用售後服務類別）. All three expected points from the golden reference are present.
- `panel/manage/upload.md`: the 警告 passage (lines 6–30) now contains the explicit line 「面板檔案上傳上限為 100MB。」. The string `100MB` appears in exactly 1 excerpt in the whole index.
- 0 occurrences of `sk-proj` in the index.

## Per-item results

| Item | Verdict | Delivery | Citation gate | Note |
| --- | --- | --- | --- | --- |
| GS-140 | wrong | Delivered | passed | Draft went down installer troubleshooting; duplicate-ticket passage never entered evidence |
| GS-166 | partial | Delivered | passed | Draft states the 100MB limit explicitly and cites upload.md:6-30 |

### GS-140 — wrong, delivered (verdict unchanged; the cause is structural, not the KB article)

The customer problem is purely about a Forge modpack installer (Better MC [FORGE] BMC4 v59, `/mods` empty, no installer error detail). It contains **no mention of duplicate tickets, after-sales routing, or waiting for a reply** — none of the three expected points has any cue in the prompt.

- Admitted evidence (12 entries): all `practice/install/neoforge-1211.md` and `practice/install/mod.md`. `duplicate-tickets.md` appears in **neither** the semantic-scores top 8 **nor** admitted evidence.
- The draft answered the installer question (cited mod.md:44-48, gate passed, `claimSupport: true`) and was delivered, not handed off. The judge scored all three policy points `missing`.

**Retrievability probe (same index, official OpenAI embeddings):** for on-topic queries the new article ranks **#1** — 「重複開客服單 客服單一直沒有回覆 要再開一張嗎」 → 0.8343; 「開了很多張客服單都沒有人回覆」 → 0.6881 — with all 4 passages in the top 5. The KB addition works and is retrievable; this eval item cannot measure it because its prompt never raises the topic. The wrong verdict here is a property of the eval item, not of the KB article. To measure the article, a golden item whose customer problem actually asks about duplicate tickets / no reply is needed (the support-flow clues live only in staff replies, which the harness never feeds into the prompt — the same structural limitation already noted in reruns 11–13).

vs rerun 13: wrong, delivered → wrong, delivered. No change.

### GS-166 — partial, delivered (improved)

- The draft states 「面板檔案上傳上限為 100MB」 explicitly and cites `[panel/manage/upload.md:6-30]` (gate passed, matched pair). It recommends SFTP for folders over 10MB and says no compression is needed.
- Judge points `[covered, partial, missing]`: SFTP-for-large-uploads covered; folder drag-and-drop only partial (says folders can be uploaded without compression, but does not explain dragging the folder into the SFTP client); destination-folder-depends-on-file-type missing. `contentCoverage: false`.
- The 100MB owner adjudication is now reflected in the answer — in rerun 13 the draft was judged against the historical 10MB answer and handed off on a gate failure.

vs rerun 13: wrong + handoff → **partial + delivered**.

## Comparison (same 2 items)

| | Correct | Partial | Wrong | Handoff |
| --- | --- | --- | --- | --- |
| Rerun 14 | 0 | 1 | 1 | 0 |
| Rerun 13 | 0 | 0 | 2 | 2 |

## Notes

- No code changes, no KB content changes, no deadline change in this run — only the index rebuild plus the eval.
- First eval attempt failed with `Official embeddings configuration missing`: the harness needs `OPENAI_API_KEY` in env for semantic retrieval, not just `EMBEDDING_PROVIDER=openai`. Retried with the key read from `~/.config/support-ai-agent/openai-api-key` (never printed); the run then completed.
- The checkpoint file is gitignored and is **not** committed on this branch; only this report is committed. The checkpoint remains on disk at `eval-results/golden-2026-11-23T19-34-48-783Z-2.json`.
