# 不改原檔的客服單與 OpenClaw 測試

程式已依 `ticket-main.zip` 的資料與事件流程接入。ZIP 不變，主 repo 不保存複製的 bot 原始碼。以下由操作者在隔離環境手動執行，會啟動真實機器人與 provider 查詢，尚未在本次開發中執行。

## 先完成 provider 核對

先依 [GetClientID 指南](testing-get-client-id.md) 與 [唯讀 provider 指南](testing-read-only-support.md) 審查結果。未知失敗不能視為未綁定，單一 clientid 不代表已證明唯一性。目標版本仍是 WHMCS 9.0.9 與 Pterodactyl 1.15.1。

## 準備原 bot

將 ZIP 解壓到 repo 外的隔離工作目錄，保留原檔。使用它原本的安裝方式準備相依套件，核對並更換歷史憑證，使用測試 bot、guild 及客服單。不要把含憑證的原 bot config 複製到本 repo。

這個接入使用原 bot 的同一個 Discord client、Mongoose model 與既有連線，不新增第二個 bot 或資料庫。只允許一個 bot 程序，不能與原本啟動的 instance 同時使用。確認沒有其他程序、MongoDB writer、document save 或 bulk operation 同時修改 ticket。

## 準備 OpenClaw

固定使用 `2026.9.8`。公開 [release](https://github.com/openclaw/openclaw/releases/tag/v2026.9.8)、[tool context](https://github.com/openclaw/openclaw/blob/v2026.9.8/src/plugins/tool-types.ts)、[runtime](https://github.com/openclaw/openclaw/blob/v2026.9.8/src/plugins/runtime/types-core.ts) 與 [embedded params](https://github.com/openclaw/openclaw/blob/v2026.9.8/src/agents/embedded-agent-runner/run/params.ts) 是此次接線依據。不是以浮動最新版作相容性保證。

先在主 repo 執行 `corepack pnpm install` 與 `corepack pnpm build`。使用測試 Gateway，從 repo 根目錄安裝 local link

```powershell
openclaw plugins install --link ./packages/openclaw-hosting-plugin
```

不要發布此私人 workspace 套件。Link 保留已建置的 workspace dependencies；將插件目錄單獨複製到另一台機器不等於完整部署。

在既有 Gateway 設定合併下列插件 entry，不要覆蓋整份設定

```json
{
  "plugins": {
    "entries": {
      "hosting-support": {
        "enabled": true,
        "config": {
          "coreBaseUrl": "http://127.0.0.1:3001",
          "agentId": "hosting-support"
        }
      }
    }
  }
}
```

以該版本的正常設定流程準備同名專用 agent、模型與 workspace，套用插件內的 hosting-support Skill。只允許七個 hosting tools，關閉 exec、任意 HTTP、檔案、跨 session、message 與其他管理工具。原生 run 也有七個名稱的雙重 allowlist，不能用這一點替代 Gateway 的測試設定。

Gateway 使用認證，bot 另從環境取得其 token，不把 token 放入插件 config 或模型提示詞。Core/Gateway 分機部署時都使用 HTTPS 及受保護網路。此 launcher 的 Core 只綁 loopback；跨機 TLS 由操作者配置受保護的代理，不把 loopback HTTP 範例直接改成公開 HTTP。

## 準備本機環境檔

從 `.env.ticket-support.example` 建立 Git 忽略的 `.env.ticket-support`。不要提供實際值到聊天或 commit。

| 變數 | 用途 |
| --- | --- |
| `TICKET_SUPPORT_ACK` | 授權後填 `I_HAVE_AUTHORIZATION` |
| `TICKET_BASELINE_REVIEW_ACK` | 原 bot 設定審查後填 `I_HAVE_REVIEWED_BASELINE_CONFIGURATION` |
| `GETCLIENTID_REVIEW_ACK` | identity 審查後填 `I_HAVE_REVIEWED_IDENTITY_CONTRACT` |
| `PTERODACTYL_EXTERNAL_ID_ACK` | 確認 mapping 後填 `WHMCS_SERVICE_ID` |
| `TICKET_BOT_ROOT` | 解壓後、內含 package.json 的 bot 絕對路徑 |
| `TEST_TICKET_GUILD_ID` / `TEST_TICKET_CHANNEL_ID` | 唯一要啟用 AI 的測試客服單 |
| `TICKET_STAFF_USER_IDS` | 有權接手的 staff user ID，以逗號分隔、不加空白 |
| `TICKET_AUDIT_CHANNEL_ID` | 可選的 staff-only 稽核頻道，必須與客服單不同 |
| `TICKET_AUDIT_REVIEW_ACK` | 設定稽核頻道時必須填 `I_HAVE_REVIEWED_STAFF_ONLY_CHANNEL` |
| `TICKET_CONTEXT_KEY` | 至少 32 bytes 的隨機 key，僅留在 bot/Core |
| `SUPPORT_CORE_PORT` | loopback Core port，預設 3001 |
| `TICKET_HUMAN_IDLE_MS` | 客戶追問等待最新 staff 活動的閒置時間，5,000 至 86,400,000 毫秒，預設 120,000 |
| `WHMCS_BASE_URL` / `WHMCS_API_IDENTIFIER` / `WHMCS_API_SECRET` | 新的必要唯讀憑證與 HTTPS 安裝根網址 |
| `PTERODACTYL_BASE_URL` / `PTERODACTYL_APPLICATION_API_KEY` / `PTERODACTYL_CLIENT_API_KEY` | 經驗證的 panel 根網址與兩種必要讀取 key |
| `OPENCLAW_BASE_URL` / `OPENCLAW_GATEWAY_TOKEN` | 測試 Gateway 根網址與認證 token |

launcher 會在載入原 bot 之前核對所有設定，不自行讀取原 bot 的 WHMCS/Pterodactyl 憑證。它先在 shared model 安裝 mutation guard，再載入原 `src/index.js`，等待 ready，從 ticket row 確認 owner 並啟用指定 channel。沒有修改原 bot 檔案。

若設定稽核頻道，launcher 會在啟動後核對它是同一 guild 的文字頻道，@everyone 沒有檢視權限，且只有明確列出的 staff member 與 bot 可以檢視。稽核只保存固定操作名稱、結果與隨機 correlation ID，不保存 Discord ID、客戶文字、capsule、Authorization header、provider 回應或原始錯誤。頻道權限改變或送出逾時時只回報固定失敗碼，不重試，也不影響客服授權。

## 手動啟動及驗收

```powershell
git check-ignore .env.ticket-support
corepack pnpm start:ticket-support
```

這會啟動真實流程。沒有 ACK 時會在載入 bot 和 HTTP 請求之前失敗。正常 `dev`、`start` 仍然只有 health。

1. 用客戶 owner 發訊息，核對查到的服務與資源確實屬於此測試帳號。若測試問題屬於短暫離線或啟動卡住，可核對 AI 先執行一次 `restart_my_server`，再查詢狀態；未設定的客服單、guest 和 bot 訊息都不應啟動模型。
2. 連續兩輪對話核對脈絡保留，且沒有跨客服單或跨 owner 記憶。Core 必須每次重新授權。
3. 以設定的 staff 身分在生成中接手，核對 signal 中止且沒有新的 AI 回覆。接手後讓客戶再問一次，核對 AI 在人工作業閒置期間保持靜默；超過閒置時間且沒有新的 Staff 回覆後，核對 AI 才重新查詢並接手。不同客服單不能被該 staff 事件冒充目的地。
4. 使用原 bot 的 close/delete/reopen/membership 路徑，核對 guard 在 query 執行前撤銷 AI。保守模式會撤銷所有已啟用 tickets，重開不會自動恢復。
5. 核對插件 `/hosting-support/turn` 沒有 Gateway 認證不能呼叫，body 的 capsule 不出現在模型 prompt、日誌或最終回覆。模型不能取得可重新簽發 capsule 的 key。
6. 交班送出失敗時先人工確認 Discord 結果。pending receipt 不自動重試，重啟也不能重送舊 AI 訊息。使用原客服單紀錄完成人工交接。
7. 停止後重啟時只有重新核對並明確指定的 channel 被啟用，舊 invocation/sessionId 不復活。launcher 會重新產生 session ID。
8. 原生 plugin loader、schema 驗證、工具 allowlist、實際 SDK 結果與版本要在本機確認。mock 不代表真實 OpenClaw 相容性測試已通過。

原 bot 的下班提示、transcript 及其他非 AI 功能仍照原程式執行。這次只控制新增 AI 的授權與送訊息流程，不宣稱已改寫原 bot 的所有通知規則。

不要讓 PteroAI 與 OpenClaw 同時處理同一張客服單。PteroAI 的舊 AI 路徑可讀取及修改檔案、startup、電源與 reinstall；本次 OpenClaw 路徑取代其身分、唯讀診斷、受限 restart 及交班部分。若要移轉其他寫入能力，必須先完成獨立的 mutation policy、approval、audit 與 receipt 設計。

最後依 [Harness 比較案例](harness-evaluation.md) 記錄合成客服案例的品質、延遲與成本，不保存正式對話或 raw provider 回應。測試通過且 identity authority 有證據後，再決定 ADR 0003 與正式 rollout。單程序方案的界線見 [ADR 0005](decisions/0005-unchanged-ticket-baseline-openclaw.md)。
