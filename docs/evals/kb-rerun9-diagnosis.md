# KB rerun 9 診斷

Rerun 9 找回了 GS-096 和 GS-105 的目標段落，GS-138 也仍找到 Velocity 段落，但三題分別卡在轉人工判斷、證據選用與引用格式。GS-105 和 GS-138 的驗證失敗還讓整份草稿未能交付。六題共 1 正確（GS-084）、1 部分正確（GS-042）、4 錯、4 轉人工。見 [rerun 9 結果](golden-set-step12-kb-rerun-9.md)。

## 證據盤點

主來源為本機 checkpoint `eval-results/golden-2026-11-23T15-52-03-175Z-6.json`（執行版本 `f7ec8ce`）。已核對 repo 外 golden set 的 SHA-256 與 checkpoint 的 `datasetSha256` 相同，並比對本機 KB 及 rerun 7、8 的 checkpoint。三輪均記錄 gpt-6.1-sol / sub2api，檢索為 OpenAI `text-embedding-3-small`，索引 digest 前綴 `898c35b5b203`、71 篇 / 566 段。Rerun 9 的答案時限為 60 秒。見 [rerun 7 診斷](kb-rerun7-diagnosis.md)及 [rerun 8 結果](golden-set-step12-kb-rerun-8.md)。

| 題號 | 目標段落 | 步數與結尾 | marker | Gate / 完整度 | 草稿 → 交付 |
| --- | --- | --- | --- | --- | --- |
| GS-096 | `practice/advanced/test-server.md:1-7`，rank 1，0.5671 | 3，stop | present | pass / true | wrong → 保留草稿並轉人工 |
| GS-105 | `practice/advanced/version-downgrade.md:1-12`，存檔 evidence 首筆 | 2，stop | absent | fail / false | wrong → 通用句並轉人工 |
| GS-138 | `practice/advanced/velocity.md:1-9`，rank 1，0.6876 | 2，stop | present | fail / false | partial → 通用句並轉人工 |
| GS-041 | `panel/config/docker-image-switching.md:1-11`，rank 1，0.6220 | 2，stop | present | pass / true | wrong → 保留草稿並轉人工 |

四題的 `finishReasons` 都是前段 `tool-calls`、最後 `stop`，`semantic` 均記 `wrong`、`basis: lifecycle`。內容判斷另看 `handoffContentVerdict`。表中的 marker 取自 `eventLog` 的診斷事件，eval 在 runner 回傳後才寫入該事件，因此它出現在 handoff 工具事件後方。見 [eval 記錄方式](../../scripts/eval-golden.ts#L164-L206)。

Checkpoint 的 `evidence` 保存成功 search 的原始回傳，`semanticScores` 保存相似度回呼記錄。Runner 會另做過濾、補讀相鄰段落及排序，工具輸出會附 `requiredQuote`，gate 則使用 runner 內的累積 evidence。GS-105 有兩筆 search 成功事件，保存的 11 條以降版段落開頭，8 筆 `semanticScores` 則只涵蓋主檢索的候選，首筆是 `debug/connection.md:72-78`（0.5836）。這兩個欄位都無法完整還原 gate 當時使用的 evidence。見 [eval 擷取點](../../scripts/eval-golden.ts#L146-L154)及 [runner admission](../../packages/agent-loop/src/index.ts#L215-L241)。
