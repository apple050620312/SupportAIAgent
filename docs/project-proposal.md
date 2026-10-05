# 專題初始計畫大綱：以 Agentic AI 與 Harness Engineering 建立 Discord 託管服務客服系統

## 一、研究動機與目標

本專題將在已公司化營運的託管服務中進行實驗，以實際客服需求作為開發與驗證的依據。實驗驗證成功後，系統將正式上線，應用於日常客服工作。

託管服務的客戶會透過 Discord 詢問帳務、伺服器狀態與使用問題。人工客服除了回覆訊息，也需要反覆查詢資料、核對設定及排查問題。這些工作步驟繁瑣，客服不一定能即時處理，接手時也需要重新閱讀對話。

本專題以 Agentic AI 與 Harness Engineering 為核心，研究 AI 代理如何在權限限制內調用工具，處理繁瑣且重複的低風險客服工作。例如查詢服務狀態與收集診斷資訊，再依結果核對常見設定。Harness 負責協調工具執行與管理對話脈絡，也需要處理執行失敗的情況。系統會確認結果後回覆客戶，遇到超出能力或權限的問題，則整理已嘗試的步驟交由人工接手。

專題將比較不同 Harness 與脈絡管理方式，評估它們對客服任務完成率、處理成本及人工接手品質的影響。第一階段的產品目標是讓 AI 在安全通過的常見重複案例中自行完成約 80%，其餘案例在無法確認或超出權限時交給人工；80% 是待真實案例實驗驗證的目標，不是目前已達成的結果。

## 二、預計功能

- 在既有 Discord 客服單機器人中整合 Agentic AI，提供客服接待與問題處理。
- 根據 Discord 身分確認對應的 WHMCS 客戶與服務。
- 查詢 Pterodactyl 伺服器狀態，提供基本排查建議。
- 依問題串接受控工具並確認結果。六個唯讀查詢之外，目前唯一開放的低風險操作是由 Core 驗證 ownership、狀態及頻率的 `restart_my_server`；檔案、startup、reinstall、退款與終止仍交給人工。
- 運用 Context Engineering 整理客服單脈絡，提供任務需要的服務資料與處理紀錄，避免混用不同客戶的資訊。
- 產生交班摘要，人工接手後停止自動回覆；客戶再次詢問時，若超過設定的人工作業閒置時間仍沒有新回覆，才由可信 host 重新啟用 AI。

訂單審核列為後續擴充。退款與終止服務等高風險操作，以及備份還原，都不交由 AI 執行。

## 三、系統架構與技術

Discord 客服單機器人負責客服入口與客服單管理。Agentic AI 負責對話與安排工具處理步驟，由 Harness 管理執行流程。Support Core 檢查客戶身分與服務所有權，決定是否允許操作。工具的安全條件由程式預先定義，需要確認的操作須取得客戶或工作人員同意，不能由 AI 自行認定安全。

WHMCS 提供客戶及服務資料，Pterodactyl 提供伺服器狀態。後端採用 TypeScript、Node.js 與 API 串接。Harness 前期曾考慮 Hermes，目前暫以 OpenClaw 為候選，最終選型將透過原型測試，比較工具調用、權限控制、Discord 整合及維護成本。Support Core 保持獨立，方便後續替換 Harness。第一版不另建客戶資料庫，也不加入 Redis。

常見排查與交班流程預計整理為可重用的 Agent Skills，讓代理依任務使用適合的處理指引。系統透過 Tracing 追蹤工具執行結果與人工接手情況，供除錯與評估使用。紀錄只保留必要且去識別化的資訊，不包含憑證或原始客戶資料。

## 四、開發與驗證步驟

1. 確認 Discord 與 WHMCS 的身分查詢介面及錯誤行為。
2. 完成客戶身分、服務所有權與伺服器狀態的唯讀查詢。
3. 建立常見問題的工具處理流程，串接 Discord 對話、交班摘要與人工接手功能。
4. 建立 Agent Evals，以相同案例比較不同 Harness 與脈絡管理方式。評估安全完成率、人工接手率、回應時間與成本，並檢查摘要品質及權限隔離。80% 目標只計入有工具或人工可核對結果的低風險重複案例；工具失敗、結果不確定或權限不足時必須安全交班，不得以猜測算作完成。

## 五、預期成果與目前進度

預期交付客服原型與程式碼，並附上架構文件及測試報告。展示流程從客戶提問開始，由 AI 調用工具處理並確認結果，最後回覆客戶或交由人工接手。實驗將評估哪些重複工作能在權限與安全限制內由系統完成。

目前已完成基礎架構與身分查詢測試工具。客戶、服務與伺服器的唯讀流程已能用模擬資料串接，並包含工具封裝、交班摘要與人工接手檢查。目標環境為 WHMCS 9.0.9 與 Pterodactyl 1.15.1，實際 API 回應及客服單機器人和 Harness 的接點仍待人工測試，尚未正式上線。

## 參考資料

以下資料作為設計與評估的參考，不代表專題已採用特定廠商 API。部分概念於 2025 年已提出，並非全部在 2026 年首次出現。

- [OpenAI：Agents API 與 managed harness](https://developers.openai.com/api/docs/guides/agents-api/overview)
- [Anthropic Context Engineering 2025 年 9 月](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [OpenAI：Agent Skills](https://developers.openai.com/api/docs/guides/tools-skills)
- [Anthropic Agent Evals 2026 年 1 月](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [OpenAI：Agent workflow 評估與 Tracing](https://developers.openai.com/api/docs/guides/agent-evals)
