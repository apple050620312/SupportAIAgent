# 主軸實作與人工驗證交接

依操作者整理的本機 `docs/previus-chatgpt-conversation.md`，本次完成目前唯讀階段中能從已知合約獨立實作的部分。最新指示優先於舊對話裡的禁推送、暫停實作或早期資料庫建議。

目標環境 WHMCS 9.0.9，Pterodactyl 1.15.1。外部 zip 只讀，未修改既有 Ticket Bot 或 addon，不提交壓縮檔、原對話或秘密。

| 主軸項目 | 已完成的程式與證據 | 仍需人工環境驗證 |
| --- | --- | --- |
| Discord → WHMCS | GetClientID candidate、canonical snowflake、遮蔽 harness、mock tests | 真實 success/no-match/auth/ambiguity，映射唯一性 |
| 客戶存在與狀態 | GetClientsDetails wrapper、ID 比對、Active-only prototype policy | WHMCS 9.0.9 response shape、狀態政策批准 |
| 已擁有服務 | 客戶限定分頁、row ownership、重複/不一致拒絕、最小 DTO | empty/pagination 形狀、backend marker、實際 key 權限 |
| 服務 → Pterodactyl | 官方 1.15.1 external GET、full UUID resources GET、資料最小化 | service ID external mapping、Application/Client key scope |
| 唯讀 Core | `/v1/me` opt-in routes、trusted context、schema/ownership checks | TLS/private network、真正 ticket store、identity authority |
| 客服工具 | 六個唯讀 tool factory、受限 restart、handoff tool、OpenClaw 2026.9.8 native entry/manifest、Gateway turn route、out-of-band toolBindings | 真正 native loader、SDK、模型工具 allowlist 與 session context 測試 |
| 客服單生命週期 | 以原 ZIP 作基底的 owner-derived event ingress、單程序 overlay、mutation/send gate、receipt 與 restart revocation、manual launcher | 實際 Mongoose/Discord ordering、staff allowlist、exclusive single process、投遞不明的人工核對 |
| 隔離與流程測試 | mock providers → Core HTTP injection → tools、A/B 客戶、expiry/takeover/foreign denial | 真實 provider、Discord event races、live host registration |
| Agent Evals | deterministic safety/workflow regression command | 相同客服案例下的實際 Harness、模型、cost/latency/summary quality 比較 |
| 安全稽核 | 可選 staff-only Discord audit recorder，固定欄位與失敗隔離 | 實際頻道權限、保留政策與營運人員審查 |
| PteroAI 移轉 | 已完成原始 ZIP 能力與風險盤點，唯讀客服 AI 路徑由 OpenClaw 取代 | 高風險檔案、startup、電源及 reinstall 操作需另立寫入里程碑 |
| 寫入與持續改善 | 已加入 Core ownership 驗證、頻率限制及狀態前置檢查的低風險 `restart_my_server`；ADR 0006 定義其餘 approval-bound mutation 與 reviewed learning loop | 真實 restart 權限、結果驗證、Staff approval host event、人工 eval |

操作入口是 [唯讀測試指南](testing-read-only-support.md)。第一個需要操作者執行的是 GetClientID characterization。全鏈 provider probe 另外要求明確授權、已審查 identity 合約與已確認 external ID mapping，兩者不會自動執行。

正常 `dev` 和 `start` 沒有接入 live adapters。這是有可執行離線鏈的原型，不是已部署或真實 E2E 通過。原型不會自行簽發假客戶作 production 授權，也沒有假定任何 session key 等於 Discord 身分。

操作者已指定不修改 `ticket-main.zip` 並以它作基底，Harness 使用 OpenClaw。因此不再等待另一份 repo 或 Harness 選擇。主 repo 已實作接入程式與 launcher，使用原 bot 的 shared model/client，沒有複製來源、修改 ZIP、引入新資料庫或啟動真實 bot。

原 schema 缺少 AI state、顯式 revision 與 receipts，現在透過明確 opt-in 的單程序 overlay 處理。所有受 guard 包覆的 legacy mutation 都先撤銷 AI，重啟不延續舊 admission，投遞不明不盲目重試。這不是 durable 或多程序保證。來源與限制見 [客服單調查](integrations/ticket-bot.md)、[ADR 0005](decisions/0005-unchanged-ticket-baseline-openclaw.md) 及 [手動接入測試指南](testing-ticket-openclaw.md)。[Harness 案例](harness-evaluation.md) 仍需人工跑模型品質與成本實驗。

後續寫入、訂單自動 Accept/Pending、帳務工具、console/file access、跨客戶記憶與資料庫不是本階段。重啟已是唯一受限的低風險操作，仍需真實權限與結果驗證；其餘寫入另立有權限與批准流程的里程碑。

## Markdown 知識庫整合 2026-10-12

已新增本機 Markdown 索引、中文及英文詞彙搜尋、來源行號、分頁閱讀、版本化 articleRef 和十五工具的 OpenClaw 接線。手動 launcher 會在啟動 live bot 前檢查已設定的知識庫，並接上已有的伺服器檔案與 startup 唯讀 port。預設目錄是已忽略的 `knowledge/`，也可設定 `SUPPORT_KNOWLEDGE_ROOT`，詳見 [知識庫指南](support-knowledge.md)。

合成測試驗證檔案邊界、索引更新、工具流程、人工接手和未核准操作拒絕，沒有呼叫 live provider、bot 或模型。實際知識庫搜尋品質、模型對文件注入的表現、逐篇工具覆蓋率和解決比例仍需人工評估。高風險 approval prototype 已有程式碼，但正式 staff approval 接線與各操作驗證仍是部署工作。上方是前期紀錄，應連同本次進度與 ADR 0007 閱讀。
