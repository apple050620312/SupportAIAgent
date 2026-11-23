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

## 逐題歸因

### GS-096：用了正確證據，仍要求客服驗證

- `eventLog` 記錄搜尋、補讀與所選服務的狀態查詢成功，`toolErrors` 為空。狀態工具查的是所選服務，不能證明公開測試服在線。最後一份 `drafts` 引用首筆 `test-server.md:1-7`，建議去 Discord #測試伺服 核對公告上的位址及版本再重試。Gate 匹配該段且無失敗，完整度為 true。草稿以 `STAFF_HANDOFF` 收尾，`answer` 保留做法並加上轉人工通知。直接觸發因素是模型的 marker。
- 顧客已提供使用的 26.3 和嘗試過的位址，開頭想解決的是購買前試連失敗。版本與位址是相關的疑難排解線索。草稿自行把「客服確認公開測試服在線、確認支援 26.3」列成當下的必要工作，儘管已給出以公告為準的下一步，且紀錄沒有顯示按公告重試後仍失敗。這符合 rerun 7 的升級模式。
- `handoffContentVerdict.judgment` 判 wrong，指出缺少歷史上正確的位址、未說明歷史上不支援 26.3 而應改用 26.2，也缺少 L 系列用途及多人遊玩選型建議。選型超出開頭試連問題。現行 owner KB 只把位址和使用規則交由公告公布，沒有固定保證。歷史答案與現行指引的評分口徑 **待 owner 裁定**，目前保留原判分。

### GS-105：降版段落已進入工具結果，草稿走了網路排查分支

- `eventLog` 有兩筆成功搜尋，這對應 runner 在同一工具步驟內並行執行的主搜尋和聚焦搜尋。程式把聚焦命中的降版段落加入 admitted，再補讀、排序並交回模型。`steps: 2` 不代表只做一次 Core 搜尋。`drafts` 回答了面板位址、連接埠、DNS 等事項，只確認客戶端和伺服器版本是否相符，沒有問是否曾由高版降到低版。`handoffContentVerdict` 兩項皆 missing，也指出缺少歷史解法中的世界檔處理及重啟。當前 KB 支持在確認降版後先備份，再選新世界或升級前相容備份。草稿沒有用這段證據，也沒有證明降版是故障原因。見 [聚焦搜尋和 admission](../../packages/agent-loop/src/index.ts#L185-L241)。
- `citationGateAttempts[0]` 記三筆 `excerpt_mismatch`，其中 `debug/connection.md:23-32` 出現兩次，`debug/connection.md:33-47` 一次，`matched` 為空。草稿把連接埠確認、替代位址、DNS 操作重述成文字和條列，接上原段標籤，未複製完整段落。完整度也為 false。去掉首尾空白的存檔草稿有 681 個 JS 字串單位，命中動作詞「連線」，但沒包含保存段落的任一規範化 24 字元前綴。這和記錄的 false 一致。降版步驟確實缺失，但規則本身沒有測到這項語義缺漏。
- `eventLog` 無模型 handoff marker，最後正常 `stop`。狀態讀取成功，日誌 HTTP 404 是選用查詢，原問題沒有命中必讀狀態或日誌的規則。兩項驗證任一失敗都足以觸發 runner 的 handoff，這次兩項皆失敗，最終只交付通用句。見 [必讀匹配](../../packages/agent-loop/src/index.ts#L47-L59)及 [交付條件](../../packages/agent-loop/src/index.ts#L291-L326)。

### GS-138：政策內容有用，引用格式和完整度一起擋下交付

- `eventLog` 記搜尋、補讀成功，`toolErrors` 為空。最後草稿說明主機可跑 Velocity、Paper 可放外部自有主機、須遵守條款且後端品質不保證。`handoffContentVerdict` 為 partial，缺歷史答案所述的特殊網路處理理由。現行 Velocity 段落沒有這個理由。顧客問的是架構可行性與合規，草稿另外要求 staff 確認庫存、特定方案與額外申請，並加上模型 marker。即使修好引用，這個 marker 仍會觸發轉人工。網路理由 **待 owner 裁定**。
- `citationGateAttempts[0]` 對 Velocity 和 Minecraft 各記一筆 `excerpt_mismatch`，`matched` 為空。和本機 KB 比對，兩個區塊都用 Markdown blockquote 加了逐行 `>`，連來源引述層級也被改動。這些是額外字元，單靠放寬空白無法匹配。GS-138 和 GS-105 都未遵守逐字引用，但前者主要是重包格式，不能把它和後者的語句改寫當成同一種 paraphrase。
- `answerCompletenessAttempts` 由 rerun 7、8 的 true 變 false。Rerun 9 去掉 marker 的存檔草稿有 1269 個 JS 字串單位，且有可命中動作詞規則的文字（例如「需要」）。以同一規則比對存檔 evidence，rerun 7、8 都能命中 Velocity 前綴，rerun 9 零命中。逐行加入 `>` 使原本跨標題及換行的前綴不再連續。內容仍覆蓋主要政策，false 不能證明缺了程序，尤其這題主要問政策。歷史網路理由的缺漏是草稿 judge 的獨立發現。
- `store/description/minecraft.md:19-31` 在 rerun 8、9 的兩筆 `excerpt_mismatch` 屬 **GS-138**。GS-105 的兩輪 gate 紀錄沒有此標籤，題目描述把這組紀錄歸到了 GS-105。GS-138 兩輪的存檔 search evidence 都只列同篇的 8–18；本機 19–31 涵蓋端口和流量規範。存檔陣列不足以判定 gate 當時是否收到 19–31，也不足以還原該段進入 gate 的途徑。可確認的是 gate 程式把查到該標籤但文字不符的情形記為 `excerpt_mismatch`，缺標籤才走 `wrong_lines` 或 `unknown_citation`。見 [gate 診斷分支](../../packages/agent-loop/src/citation-gate.ts#L51-L74)。

### GS-041：模型發出 marker，帳戶鎖定本身是有效阻礙

`eventLog` 記狀態成功、選用日誌 HTTP 404、marker present，`finishReasons` 結尾為 stop。Gate 匹配 Docker 文章，完整度為 true，`answer` 保留草稿。模型確實像 rerun 7 一樣將一些細節一併轉人工，例如再確認 KB 已寫明的重新安裝步驟。但顧客本來就要求 Java 8，且明確表示映像欄位鎖住，這兩項不能當成模型自行添加的非關鍵細節。通用自助操作無法解除該帳戶的阻礙。`handoffContentVerdict` 指出未確立歷史上的 Java 25／Netty 因果與 Java 8 必要性，也未確認客服能解除限制。這兩項 **待 owner 裁定**。

## 共通機制

`SYSTEM_PROMPT` 已要求用相關證據、先回答有支援的部分、給具體動作、照抄完整摘錄並緊接來源與行號。它沒有要求機械使用每筆 admitted 段落，gate 也允許略過段落。這裡缺的是可驗證的選證與覆蓋要求。GS-105 跳過關鍵分支和改寫引文，GS-138 改動 Markdown。在已有逐字指令及 `requiredQuote` 的情況下，這是觀察到的遵循失敗，單次紀錄無法判斷模型為什麼如此生成，也無法推論它一貫偏好改寫。見 [提示詞](../../packages/agent-loop/src/index.ts#L18-L31)與 [工具輸出](../../packages/agent-loop/src/index.ts#L238-L241)。

提示詞對 handoff 的門檻是原請求仍有必要阻礙，包括被問到且無法驗證的即時可用性、必要的帳戶狀態，或實際的欄位鎖定。它也要求先給支援內容，並避免升級未被問到的版本、庫存或方案細節。現有 runner 辨識草稿末行的 `STAFF_HANDOFF` 後，沒有另查該理由是否屬於原請求。GS-096 與 GS-041 都由 marker 觸發，前者把可先自查的事項當成阻礙，後者確有原請求中的帳戶阻礙。見 [提示詞門檻](../../packages/agent-loop/src/index.ts#L22-L29)及 [marker 與路由](../../packages/agent-loop/src/index.ts#L291-L309)。

完整度檢查需要 trim 後至少 80 個 JS 字串單位、至少一段 evidence、命中任一中英文動作詞，且草稿含任一 excerpt 的前 24 個字串單位（兩側先 NFKC、再轉小寫）。它沒有使用問題參數，也未核對動作詞是否出現在解答或引文裡，不能衡量程序覆蓋度。上述前綴比對只用保存的草稿與 evidence 重現可見訊號，沒有重跑 eval，也沒有取得 runner 內完整 evidence 快照。見 [完整度規則](../../packages/agent-loop/src/index.ts#L72-L80)。

GS-105 與 GS-138 的通用句是 runner fallback。Gate 容許空白變動，至少要有一組合法節錄和標籤，且不能有阻擋性的錯誤。兩題都是零匹配，因此 gate fail。Runner 要兩項檢查都過、完成必讀、非空、正常 stop 且無非法工具，才把符合長度的回覆保存在 `supportedPartial`。驗證失敗令它保持空值，兩題也沒有可用的必讀狀態 checkpoint，因此 handoff 分支交付通用句。這條路徑會整份捨棄草稿，連 GS-138 已答對的架構和品質限制也一起消失。GS-138 同時有 marker，GS-105 無 marker，仍得到相同通用句。見 [gate 通過條件](../../packages/agent-loop/src/citation-gate.ts#L97-L109)及 [fallback](../../packages/agent-loop/src/index.ts#L299-L326)。

## 排序的修正目標與驗證方式

1. **讓模型處理最能解釋症狀的段落。** 未來重跑 GS-105 時，分開記錄工具實際回傳的 admitted evidence 及最後草稿。確認草稿先問是否曾降版，保留面板位址說明，並依當前 KB 在確認降版後給出備份、替換成新世界或相容備份的條件式做法及驗證步驟。重啟是歷史評分點，另查當前證據是否支援。比較 `drafts`、`answer` 與語義逐點分數。
2. **確保引文可驗證，並在交付前保留已驗證的部分。** 可評估由程式從 admitted 段落組裝引用，或在驗證失敗時先做一次有限的引用修正。用 GS-105、GS-138 驗證 `citationGateAttempts.matched` 有合法配對，且 `answer` 保留有根據的部分。加入錯行及未知來源對照，確認無法驗證的內容仍會被攔住。
3. **把轉人工限制在原請求的剩餘阻礙。** 用 GS-096 檢查公告核對及重試能直接交付，用 GS-138 檢查架構和條款回答不因未問的庫存而升級。用 GS-041 確認帳戶鎖定仍可轉人工且保留自助指引。比較 `eventLog` 的 marker 和 handoff 事件以及 `answer`，以 GS-084 作為直接交付對照。
4. **把內容覆蓋和引文格式分開驗證。** 用 GS-138 的同一政策草稿對照兩種引用格式，內容覆蓋判定應穩定，引用則獨立驗證。再用 GS-105 對照有合法引文卻漏掉降版分支的草稿，內容檢查應指出缺項。記錄 `answerCompletenessAttempts`、`citationGateAttempts` 與草稿逐點評估。保留歷史分數，待 owner 裁定後另列現行政策覆蓋分數。

## 不是什麼原因

- **三題的目標段落沒有取回。** GS-096、GS-138 的目標段落都在 rank 1，GS-105 的聚焦搜尋也取回了降版段落。GS-105 的主搜尋仍偏向網路資料，修復後剩下的是草稿選用問題。
- **索引更新或更換模型 provider。** 三輪 checkpoint 的索引完整 digest、規模、檢索 provider、對話模型與 provider 均相同。這只排除已記錄的設定變更。
- **僅有空白差異。** GS-138 rerun 8 的 Velocity 標籤記為 `whitespace_mismatch`，rerun 9 記為 `excerpt_mismatch`，新草稿含額外的 Markdown 字元。GS-105 的三個 mismatch 對應改寫，空白容忍無法補回原文。
- **逾時、provider 失敗或 judge 觸發轉人工。** 四題均首試正常 stop，無 `modelFailures`，耗時低於 60 秒，`eventLog` 顯示先轉人工才開始評分。GS-041 和 GS-105 的選用日誌 404 也不會單獨觸發這條路由。
- **一個 gate 問題能解釋四題。** GS-096、GS-041 驗證全過仍發出 marker。修好 GS-105 的引用仍補不回降版內容，修好 GS-138 的引用也不會消除 marker。

## 未決事項

- **GS-041**：歷史 Java 8 必要性、Netty 因果及客服能否開放該帳戶欄位，待 owner 裁定。
- **GS-096**：歷史位址、版本及選型期望應如何與現行 Discord 公告指引一同比對，待 owner 裁定。
- **GS-138**：歷史上的特殊網路處理理由是否仍適用，待 owner 裁定。
- **GS-053**：逾期資料留存與恢復政策仍待 owner 裁定，未納入 rerun 9。見 [先前診斷](step12-diagnosis-2.md)。
