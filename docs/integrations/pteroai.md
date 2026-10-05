# PteroAI 移轉與取代基準

## 調查範圍

本文件根據 `PteroAI-main.zip` 的原始 Python 程式碼整理。壓縮檔只讀，沒有把原始碼複製到本 repository，也沒有使用其中的憑證或啟動它。

檢查的主要檔案是 `bot.py`、`core/classes.py`、`cmds/cmd.py`、`cmds/event.py`、`cmds/developer.py`、`cmds/manage.py`、`cmds/context_menu.py` 與 `data/tools.json`。

## PteroAI 實際提供的能力

### 客服與伺服器流程

- `cmds/event.py` 監聽客服頻道建立及互動事件，從 Discord 元資料取得作者、Pterodactyl identifier 及 internal ID。
- `cmds/cmd.py` 的 `Cmd.ai` 會嘗試用 `GetClientID` 及 `GetClientsProducts` 找 WHMCS 服務，再讓客戶選服務。
- 提供安裝卡住、伺服器無法啟動及自訂問題等入口。
- 啟動流程會先收集 Console，然後把結果交給 `PteroAI.chat`。

### PteroAI 工具

`core/classes.py` 的 `PteroAI` 對模型暴露：

- Console WebSocket 讀取
- 檔案列表與檔案讀取
- 檔案寫入與移動
- 讀取及修改 startup 變數或 Docker image
- reinstall

另外 `cmds/event.py` 會直接呼叫 application API 做 suspend/unsuspend。這些不是單純的客服查詢，而是會改變伺服器或客戶資料的操作。

### 其他功能

- `cmds/manage.py` 有 PayUNi 交易查詢。
- `cmds/developer.py` 提供 bot owner 執行 Python `exec`、載入、卸載及重載 extension。
- `cmds/context_menu.py` 定義 Minecraft 錯誤與 MTR context menu，但目前 callback 在實際分析程式前就 `return`，因此該分析路徑在 supplied archive 中是停用的。
- `cmds/cmd.py` 的 `Cmd.ai` 也在主要流程開始處直接 `return`，所以該 hybrid command 在 supplied archive 中沒有實際執行後續流程；`event.py` 仍保留另一條互動路徑。

## PteroAI 的整合方式

`core/classes.py` 的 `Request` 直接建立 WHMCS 與 Pterodactyl HTTP 請求。WHMCS 使用 `/includes/api.php` 和 `GetClientID`、`GetClientsProducts`；Pterodactyl 同一個類別同時使用 application API key、client API key 及 WebSocket token。

`PteroAI` 建構子直接接收 Discord author、Pterodactyl identifier 及 internal ID。後續模型工具呼叫不再經過 Support Core，也沒有每次操作重新驗證 ticket、Discord actor、WHMCS client 或服務所有權。

## 已確認的安全問題

- `Cmd.ai` 接受可由呼叫者提供的 `uid`，若重新啟用，會把任意 Discord ID 帶入 `GetClientID`。這不符合可信 actor context 規則。
- 互動 custom ID 內含作者 ID、Pterodactyl identifier 及 internal ID。它是 Discord UI 資料，不是簽章的授權 capsule。
- WHMCS 與 Pterodactyl 憑證由舊 bot 直接讀取，沒有 Support Core 的 provider port boundary。錯誤回應與內容處理也沒有目前 adapter 的嚴格 schema、大小限制及靜態錯誤投影。
- 模型可提出檔案寫入、移動、startup 修改、重裝和 Console 電源操作。按鈕確認只是在 Discord UI 層，沒有把操作重新綁定到 Core 的 ownership、ticket revision 或 staff takeover 狀態。
- Console 流程可自動 stop/start 伺服器；reinstall 後還會繼續透過 Console 等待結果。這些行為不能直接暴露給新 Harness。
- `developer.py` 的 owner-only `exec` 是任意 Python 執行能力，不能進入 OpenClaw 或 Support Core。
- `PteroAI.chat` 會把例外文字直接送到 Discord，且把模型提出的函式呼叫摘要顯示在訊息中；沒有目前流程的 raw error、token、media、async side effect 與最終回覆驗證。
- `Request.whmcs_request` 將所有 WHMCS `result=error` 摺疊成空結果，可能把認證失敗或上游錯誤誤判成沒有客戶。這是新 resolver 必須避免的行為。
- archive 的環境範例曾包含 token-like 歷史值。該值沒有被複製或使用；任何曾經暴露的舊憑證都應在環境外輪替。

## 與目前 OpenClawHostingSupport 的比較

| 能力 | PteroAI | 目前 OpenClaw 版本 | 判定 |
| --- | --- | --- | --- |
| Discord → WHMCS 身分 | 直接在 bot 內查詢，且有任意 `uid` 風險 | trusted ticket capsule → Core → WHMCS adapter | OpenClaw 取代 |
| 服務 ownership | Pterodactyl ID 進入 AI 物件後直接使用 | Core 每次依 actor 重查服務並核對 ownership | OpenClaw 取代 |
| 伺服器 status/resources | 直接用 client key | Core provider port，最小 DTO、嚴格 schema | OpenClaw 取代 |
| 低風險恢復 | Console 會自動 stop/start | `restart_my_server` 先驗證 ownership、狀態及頻率，再重新查詢 | OpenClaw 取代 |
| ticket lifecycle | in-memory active identifier，缺少 CAS 及 takeover binding | 原 bot shared model、revision gate、撤銷 admission、人工接手中止 | OpenClaw 取代 |
| Agent runtime | bot 直接呼叫模型 API | OpenClaw 2026.9.8 native plugin、固定八工具 allowlist | OpenClaw 取代 |
| handoff | 沒有 Support Core 的交班邊界 | `handoff_to_staff`、固定摘要、人工接手後靜音 | OpenClaw 取代 |
| 檔案讀寫 | 有 | 目前沒有 | 有意保留為後續安全設計 |
| startup 修改 | 有 | 目前沒有 | 有意保留為後續安全設計 |
| suspend/unsuspend、reinstall、電源操作 | 有 | 目前沒有 | 有意保留為後續需批准的寫入能力 |
| PayUNi、developer、一般 bot 指令 | 有部分獨立功能 | 不屬於 Support Agent 範圍 | 不宣稱取代 |

## Supersession 判定

目前版本已經可以取代 PteroAI 的「客服 AI 身分解析、服務查詢、伺服器唯讀診斷、低風險 restart、OpenClaw 執行及人工交班」路徑，而且安全邊界更強。PteroAI 不應與新的 Support Agent 同時處理同一個客服單。

這不是宣稱目前已經取代 PteroAI 的所有伺服器寫入能力。若商業需求仍包含檔案編輯、startup 修改、重裝或重啟，必須另立寫入能力設計，至少需要：

1. Core 內的明確 provider mutation port
2. 依已驗證客戶與服務建立的 operation policy
3. 每次操作的 staff 或客戶 approval，以及不可重放的 revision/nonce
4. dry-run、輸入大小與路徑限制、結果驗證及失敗交班
5. 與 Discord handoff、audit、重啟及 uncertain delivery 一致的 receipt 設計

在這些條件完成前，OpenClaw 以唯讀診斷加交班取代 PteroAI 的客服入口，是目前可以安全上線驗證的範圍。

## 移轉方式

1. 先在隔離環境完成 [Ticket Bot 與 OpenClaw 測試](../testing-ticket-openclaw.md)。
2. 確認 OpenClaw 的 owner-derived ticket ingress、WHMCS identity、Pterodactyl mapping 與人工 takeover。
3. 將 PteroAI 的客服互動入口停用或移出該測試客服單，避免兩個 AI 同時回覆。
4. 只有在人工測試通過並完成寫入能力的安全設計後，才評估逐項移轉高風險功能。
