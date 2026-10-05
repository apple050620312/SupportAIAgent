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
| 客服工具 | 六個唯讀 tool factory、handoff tool、host currency guard、support Skill | pinned Harness/SDK 的 native wrapper 與 session context |
| 客服單生命週期 | typed bridge、waiting/resume/takeover/close、revision CAS、chunked idempotent handoff | 真正 bot event/roles、atomic store、serialized send、delivery receipts |
| 隔離與流程測試 | mock providers → Core HTTP injection → tools、A/B 客戶、expiry/takeover/foreign denial | 真實 provider、Discord event races、live host registration |
| Agent Evals | deterministic safety/workflow regression command | 相同客服案例下的實際 Harness、模型、cost/latency/summary quality 比較 |

操作入口是 [唯讀測試指南](testing-read-only-support.md)。第一個需要操作者執行的是 GetClientID characterization。全鏈 provider probe 另外要求明確授權、已審查 identity 合約與已確認 external ID mapping，兩者不會自動執行。

正常 `dev` 和 `start` 沒有接入 live adapters。這是有可執行離線鏈的原型，不是已部署或真實 E2E 通過。原型不會自行簽發假客戶作 production 授權，也沒有假定任何 session key 等於 Discord 身分。

尚未提供真實 bot state/send adapter 與 native plugin entry，原因是它們依賴 operator 的權限、部署 state API 和目標 Harness 版本。typed ports 與可執行 fake 展示了接點，但不能拿它們替代真實權限或持久 receipts。人工核對環境後，才將這些接點套到既有 host，而不是猜測壓縮檔就是正式 runtime。

後續寫入、重啟、訂單自動 Accept/Pending、帳務工具、console/file access、跨客戶記憶與資料庫不是本階段。主軸先穩定唯讀客服與交班，再另立有權限與批准流程的里程碑。
