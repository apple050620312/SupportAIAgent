# Step 12 KB Rerun 10 — 2 正確／1 部分／3 錯／2 轉人工

| 重跑 | 正確 | 部分 | 錯 | 轉人工 |
|---|---:|---:|---:|---:|
| Rerun 8 | 1 | 0 | 5 | 4 |
| Rerun 9 | 1 | 1 | 4 | 4 |
| Rerun 10 | 2 | 1 | 3 | 2 |

2026-11-23 在 `feat/kb-rerun9-fixes` 的 `f9daef2` 建置後執行。回答模型為 sub2api 的 `gpt-6.1-sol`，每次回答期限為 60 秒。Checkpoint 為 `completed`，六題皆有語意分數，`unscored=0`。檢索為 `openai` / `text-embedding-3-small`，沿用 71 篇、566 段的索引，digest 為 `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`。GS-041 記錄兩次 `TimeoutError`，由 harness 第三次嘗試完成。其餘五題各一次。

Rerun 10 checkpoint 為 `eval-results/golden-2026-11-23T16-55-11-084Z-6.json`。Rerun 9 對照為 `eval-results/golden-2026-11-23T15-52-03-175Z-6.json`。

| 題目 | 語意 verdict（9 → 10） | handedOff（9 → 10） | Gate（9 → 10） | 完整度（9 → 10） | contentCoverage（10） | admittedEvidence 目標段落（10） | citationGateRepair attempted / repaired（10） | handoffMarkerOverridden（10） |
|---|---|---|---|---|---|---|---|---|
| GS-041 | 錯 → 錯 | true → true | passed → passed | true → true | true | 有，`panel/config/docker-image-switching.md:1-11` | false / false | false |
| GS-042 | 部分 → 部分 | false → false | passed → passed | true → true | true | 有，`practice/install/modpack-world-preservation.md:1-12` | true / true | false |
| GS-084 | 正確 → 正確 | false → false | passed → passed | true → true | true | 有，`store/account/login-recovery.md:12-19` | false / false | false |
| GS-096 | 錯 → 錯 | true → false | passed → passed | true → true | true | 有，`practice/advanced/test-server.md:1-7` | false / false | true |
| GS-105 | 錯 → 正確 | true → false | failed → passed | false → true | true | 有，`practice/advanced/version-downgrade.md:1-12` | false / false | false |
| GS-138 | 錯 → 錯 | true → true | failed → passed | false → false | false | 有，`practice/advanced/velocity.md:1-9` 及 `store/description/minecraft.md:19-31` | false / false | false |

Gate 和完整度使用 `citationGateAttempts` 與 `answerCompletenessAttempts` 的最後一筆。Rerun 9 沒有獨立的 `contentCoverage`、`admittedEvidence`、`citationGateRepair` 或 marker 覆蓋欄位。

- **GS-041**：Rerun 9 的草稿與交付已包含 Docker 自助步驟，並因欄位鎖定要求管理員確認。Rerun 10 草稿新增降版與備份提問，末尾仍有 `STAFF_HANDOFF`，交付仍保留自助步驟並轉人工。Gate 配對 Docker 段落，降版與三個連線引用有 `excerpt_mismatch`。兩次人工草稿評分均為錯，仍缺 Java 25／Netty 與 Java 8 的明確解釋，也沒有確認歷史處置已開放權限。
- **GS-042**：兩次均交付備份舊整合包與舊世界、再安裝新包的步驟。Rerun 10 草稿列出更多備份檔案與啟動檢查。去掉一層 `>` 後，`citationGateRepair.before` 的零配對變成 `after` 的保留存檔段落配對，四個其他引用仍有 `excerpt_mismatch`。判分維持部分，仍缺 Java 17 改 21、從日誌辨認 Paper，以及明確說明備份檔可留在伺服器。
- **GS-084**：兩次草稿與交付都保留客戶中心的完整面板密碼變更路徑及用新密碼重試的指引。目標引用通過，無 marker，直接交付並維持正確。
- **GS-096**：兩次草稿都指向 Discord 最新公告，且末尾有 `STAFF_HANDOFF`。Rerun 9 的交付附上轉人工通知。Rerun 10 的 `handoffMarkerPresent=true`、`handoffMarkerOverridden=true`、`handedOff=false`，交付新增直接連線步驟。語意仍為錯，judge 記錄歷史答案的測試位址、版本與方案建議皆缺。Rerun 9 人工草稿對版本一項獲部分覆蓋，Rerun 10 交付的版本項為缺漏，兩者評的是不同輸出。
- **GS-105**：Rerun 9 草稿只排查位址、連線與版本是否一致，gate 零配對，交付只有轉人工通知。Rerun 10 的 `admittedEvidence` 含降版段落，草稿與交付開頭先問是否從更高版本降回 26.2，再說明備份後新開世界或還原相容備份。Gate 直接配對降版段落，其餘引用仍有 `excerpt_mismatch`。完整度通過並直接交付，所以本題沒有觸發引用修正或 supportedPartial 遞補。
- **GS-138**：Rerun 9 草稿的 Velocity 與 Minecraft 引文都失配，並額外問未被要求的庫存與申請條件，最後只交付轉人工通知。Rerun 10 草稿不提庫存且無 marker，Velocity 逐字引文成功配對，另兩個引用仍有 `excerpt_mismatch`，因此沒有觸發引用修正。完整度仍為 false，交付保留 Velocity 可用、Paper 可外放與連線品質不保證的內容，再附轉人工通知，符合 supportedPartial 路徑。兩次人工草稿皆為部分，均缺歷史答案對網路特殊處理的解釋。

Fix 4 的線上結果只記錄每題最終草稿的 coverage。另以現有 `answerCompletenessCheck` 在本機重播，使用 checkpoint 中能按來源與行號配對的引文。GS-105 的八段都能配對，原草稿為 true，移除降版段落及尾端的降版提問後為 false。GS-138 可配對 24 段中的八段，原稿與加一層引用的稿件均為 false。GS-138 也納入了降版段落，草稿沒有降版內容，現行檢查會對任何納入降版段落的題目套用這項條件。僅在離線重播排除該段落後，原稿為 true、加一層引用的稿件仍是 false，因此本次未重現 GS-138 兩種格式均通過的預期。

相較 Rerun 9，沒有主語意 verdict 退步。GS-105 從錯升為正確，GS-105 和 GS-096 各減少一次轉人工。GS-138 的 gate 與交付內容改善，完整度和主 verdict 維持原結果。
