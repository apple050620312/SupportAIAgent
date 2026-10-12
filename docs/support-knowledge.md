# Markdown 客服知識庫

客服 AI 現在可搜尋一個資料夾中的 Markdown 文件，再依文件與 Support Core 工具處理問題。這是搜尋與工具協作，不會訓練模型權重，也不保證文件內的每個問題都能全自動解決。缺少工具、必要資料或授權時仍會轉人工。

## 放置文件

預設使用專案根目錄的 `knowledge/`。建立這個資料夾並放入 UTF-8 `.md`，可使用子資料夾，例如 `minecraft/java.md` 與 `network/connection.md`。這個資料夾已被 Git 忽略，文件不會隨程式提交或推送。

也可以在已忽略的 `.env.ticket-support` 設定其他資料夾

```dotenv
SUPPORT_KNOWLEDGE_ROOT="D:/SupportKnowledge"
```

使用絕對路徑，不填或留空就用預設目錄。路徑在載入原 Ticket Bot 前確定，不受 bot 改變工作目錄或環境變數影響。Gateway 不需要掛載這個資料夾，文件由 Support Core 讀取，OpenClaw 透過受限工具取得相關內容。

這是所有已獲准客服單共用的客服文件。只放可以提供給客戶的處理指引，不放 API key、密碼、客戶紀錄、帳務資料或內部管理憑證。忽略 Git 不能替代內容審查，搜尋結果仍可能成為模型提示詞、對話紀錄與客戶回覆。

## 本機檢查

```powershell
corepack pnpm knowledge:check
```

這個命令先 build，再檢查本機 Markdown，僅印出文章數、可搜尋段落數與 byte 數。不呼叫 WHMCS、Pterodactyl、Discord、OpenClaw 或模型，也不印出路徑和文件內容。資料夾不存在、沒有有效文章、格式錯誤或超出限制時以非零狀態結束。

確認文件後再依 [既有接入指南](testing-ticket-openclaw.md) 設定已核准的測試環境，使用 `corepack pnpm start:ticket-support`。這個啟動器會在載入 live bot 前檢查知識庫。既有的身分解析、服務對應、Gateway 和 test channel 授權設定仍然必要，新增知識庫不會自動啟用正式服務或人工核准介面。

手動 launcher 已接上伺服器檔案與 startup 的唯讀 provider。高風險 approval 目前是獨立 prototype，launcher 尚未接入正式 staff approval 事件，這類變更應交人工處理，不能把文件寫的核准當成已完成接線。

## AI 如何使用

1. `search_support_knowledge({ query, limit? })` 以症狀、版本、產品名稱或錯誤碼搜尋。支援英文關鍵字與中文單字及雙字詞的加權排序，預設回傳五個段落，最多八個。
2. 搜尋提供 `articleRef`、相對來源、標題、段落標題、行號與摘要。AI 用 `read_support_article({ articleRef, startLine?, maxLines? })` 讀取完整處理段落，使用 `nextLine` 繼續閱讀。它不能指定任意檔案路徑。
3. 核對版本與前提，再透過 Core 查已擁有服務、狀態、資源及可用診斷資料。低風險恢復依既有政策執行，高風險變更走可信工作人員核准流程。
4. 操作後核對結果並請客戶確認。回覆引用例如 `minecraft/java.md 第 8–16 行`，分清文件建議與實際工具結果。
5. 搜尋不足時換關鍵字或詢問缺少資料，文件衝突、缺少工具、權限不足、操作失敗或無法驗證時交班，保留引用和已嘗試步驟。人工接手後仍遵守靜默與重新接手規則。

每輪的固定流程會傳入 OpenClaw，native plugin 也提供對應工具和 Skill。固定流程是模型指引，真正授權仍由 Core 和可信 ticket context 執行，不能依賴模型遵守文字作為唯一保護。

## 搜尋與更新

目前使用本機記憶體中的詞彙搜尋，不使用 embedding、向量資料庫、Redis、額外網路服務或跨客戶記憶。搜尋不到是空 `matches`，不是上游失敗，也不能證明文件不存在相關解法。完全不同的同義詞可能找不到，建議文件附常用別名、中文名稱、英文名稱與錯誤碼。

第一次搜尋載入完整目錄。後續在距離上次成功載入滿 30 秒後的下一個查詢重新建立索引，文件新增、修改與刪除可於下一次刷新反映。不是即時 watcher。`articleRef` 是相對來源加內容的 SHA-256，刷新後舊版本消失時回 `KNOWLEDGE_NOT_FOUND`，AI 應重新搜尋。檔案正在更新、索引失敗或超限回 `UPSTREAM_UNAVAILABLE`，不以過期成功或空結果掩蓋。

輸出一律標示 `trust: reference_only`。文件不是 policy，不能更換 actor、提供 ownership、替工作人員核准或開啟新工具。Markdown 的程式碼、連結、HTML 與 shell 指令不會由索引器執行或自動抓取。不要讓客戶直接寫入這個資料夾；檔案邊界檢查不能把惡意文件變成可信操作規則。

## 限制與維護

| 項目 | 限制 |
| --- | --- |
| 文章 | 最多 2000 個非空 UTF-8 Markdown |
| 檔案大小 | 每個最多 1 MiB，讀取也受 byte 上限保護 |
| 總大小 | 最多 64 MiB |
| 目錄 | 深度最多 16，掃描最多 20000 個 entry，掃描階段最多 15 秒 |
| 文章行數 | 最多 20000 行，每行最多 8000 字元 |
| 索引 | 最多 40000 個段落 |
| 搜尋輸入 | 非空 query 最多 300 字元 |
| 搜尋輸出 | 最多 8 個段落，每段摘要最多 800 字元 |
| 文章讀取 | 每頁最多 120 行或 24000 字元，先達者為準 |

忽略非 `.md`、隱藏檔案和目錄、`node_modules`、`dist`、`coverage` 與 `vendor`。不跟隨 symlink 或 Windows junction，根目錄也必須是實際目錄。維護者應使用受控目錄和原子換檔方式更新，不在搜尋期間更換目錄或以外部未信任程序重寫檔案。

核心紀錄只包含工具名、結果分類與 correlation ID，不包含 query、文章正文或來源。這不表示 Gateway 對話保存會自動遮蔽文件，因此仍需要審查共用文件內容。

## 文件建議格式

參考 [文章範本](examples/support-knowledge-article.md)。每個問題應記錄症狀、搜尋關鍵字、適用版本、前提、診斷證據、處理步驟、風險和核准需求、驗證方式、人工接手條件與更新日期。文件描述的操作若沒有 Core 工具支援，AI 只能提出可供人工執行的指引或交班。

接上真實知識庫後，逐篇以合成客服情境驗證搜尋、引用與工具可用性，再用實際授權測試環境驗證修復效果。目標仍是解決 80% 的重複問題，這次的 mock 測試不代表已達到該比例。
