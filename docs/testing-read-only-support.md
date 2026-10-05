# 唯讀客服原型測試

目標環境是 WHMCS 9.0.9 和 Pterodactyl 1.15.1，目前沒有對它們發出真實請求。

依 `docs/previus-chatgpt-conversation.md` 的主軸，能獨立開發的唯讀元件已串成離線原型。接下來需要人工核對真實環境，再決定是否啟用。客服單機器人、WHMCS 與 Pterodactyl 的外部專案都沒有被修改。

## 先看離線展示

```powershell
corepack pnpm demo:mock
corepack pnpm eval:mock
```

展示會透過真正的工具封裝與 Support Core 路由，查詢 mock 的客戶、服務及伺服器。最後測試人工接手後停止回覆。全部使用合成資料與注入的 mock，不使用網路、Discord bot、OpenClaw 或模型。

Evals 是程式流程與安全規則的回歸測試，不是 LLM 任務成功率、延遲或成本的實驗結果。正式的 Harness 比較仍需實際模型與客服單測試環境。

## 第一關 GetClientID

先完成 [GetClientID 操作指南](testing-get-client-id.md)。只回傳工具產生的遮蔽表格，不要提供 `.env`、客戶識別碼或原始回應。

要人工核對 linked 案例確實指向預期測試客戶。若 no-match 與驗證失敗無法區分，維持未知，不把它們都判定為未綁定。單一 clientid 也不能證明綁定唯一。

這一關尚未完成，不要直接跳到正式客服部署。

## 第二關 唯讀 provider 流程

只有在你已審查 GetClientID 的結果，且明確批准下一階段測試後，才準備 `.env.support-probe`。它是 Git 忽略的本機檔案，可從 `.env.support-probe.example` 複製。若已有檔案，先確認內容，不要覆蓋。

| 變數 | 內容 |
| --- | --- |
| `SUPPORT_PROBE_ACK` | 授權測試後填入 `I_HAVE_AUTHORIZATION` |
| `GETCLIENTID_REVIEW_ACK` | 審查後填入 `I_HAVE_REVIEWED_IDENTITY_CONTRACT` |
| `PTERODACTYL_EXTERNAL_ID_ACK` | 確認部署用 WHMCS service ID 作 external ID 後填入 `WHMCS_SERVICE_ID` |
| `WHMCS_BASE_URL` | HTTPS WHMCS 安裝根網址 |
| `WHMCS_API_IDENTIFIER` / `WHMCS_API_SECRET` | 有必要唯讀權限的測試憑證 |
| `PTERODACTYL_BASE_URL` | HTTPS panel 安裝根網址，不加 `/api` |
| `PTERODACTYL_APPLICATION_API_KEY` | 允許讀取指定 server 的 Application key |
| `PTERODACTYL_CLIENT_API_KEY` | 允許讀取測試 server resources 的 Client key |
| `TEST_LINKED_DISCORD_ID` | 已知已綁定的測試 Discord ID |
| `TEST_OWNED_SERVICE_ID` | 該客戶確實擁有的活躍 Pterodactyl WHMCS service ID |

可選填 `TEST_OTHER_CUSTOMER_SERVICE_ID`，只使用你已知道且允許測試的其他客戶服務 fixture。不隨機產生編號，不查找客戶，不枚舉服務 ID。

確認忽略規則，再由你手動執行

```powershell
git check-ignore .env.support-probe characterization-results/read-only-support.txt
corepack pnpm probe:read-only
```

這個命令會真的連線。它只會用固定的 `GetClientID`、`GetClientsDetails`、`GetClientsProducts`，以及 Pterodactyl external lookup 和 resources GET。它不使用 WHMCS Tickets、不讀檔、不用 WebSocket、不改設定，也不啟動或停止伺服器。

每個客戶操作都重新確認身分，產品查詢只限定同一客戶。服務清單按頁讀取，最多 1000 筆，查詢次數取決於該客戶的服務頁數，不固定為六次。未知結果立即停止，沒有自動重試。

輸出只有階段、成功或失敗、固定錯誤碼、受控的伺服器狀態與是否取得 resources。不包含識別碼、名稱、憑證或原始 provider 資料。失敗會退出並回報非零 exit code，不宣稱未綁定或已修復。

請回傳遮蔽表格，並在本機確認實際測試客戶、服務與 panel server 確實是同一條關係。即使探測成功，也不能據此認定所有資料都唯一或權限都正確。

## 第三關 客服單與 Harness

這一關使用隔離測試 guild 與客服單，不直接改正式 Ticket Bot。

`packages/ticket-bridge` 已提供身分 context、等待客戶、交班、人工接手與關閉的流程。接到既有機器人時，操作者需提供它的實際 state 與 messenger adapter，並核對這些條件

- context 的 owner、guild 和 channel 都來自已驗證的 Discord 事件及客服單資料，不是模型輸入
- staff 接手與關閉之前，由機器人檢查真正的 Discord 角色權限
- `TicketStore.compareAndSet` 使用真正的 revision 做原子更新
- `TicketMessenger.sendIfCurrent` 與接手、關閉共用該客服單的序列化邊界，避免生成中途接手後仍發送回覆
- `send` 核對預期 HUMAN_NEEDED revision，在既有客服單資料保存每個 handoff chunk 的 receipt，重試時不重複發送，generated text 禁止 mentions
- Core 的 `TicketAccessProvider` 每次讀取真正的客服單 state，不能用 demo 的 Map 代替

這些 host-specific adapter 不能從只讀壓縮檔推定正式部署行為。現有的 typed bridge 與離線假實作提供可接入的合約。它們不是正式 Discord SDK 串接或 durable delivery 的保證。

封存程式的 schema 與 close/reopen 路徑已核對，缺少必要 AI 狀態及並行送訊息機制。請先看 [客服單接入調查與遷移範圍](integrations/ticket-bot.md)，不要把已讀的 `closed` 或 `claimedBy` 直接替代 bridge 合約。正式接入仍需要程式遷移，並非只有測試。

Context 簽發使用 `TicketContextTokens`。正式 key 至少 32 個隨機 bytes，保留在可信 bot 與 Core，工具封裝只取得短效 capsule。不要把 key 或 capsule 放進提示詞、模型工具參數、URL 或日誌。

`createHostingTools` / `hostingToolFactory` 已提供六個唯讀工具與交班工具。未知 session 沒有工具，已知 session 綁定可信 capsule getter 與 host authority guard。這是可用 mock 測試的 tool factory，不是已安裝的 OpenClaw native plugin。先指定實際 OpenClaw host 版本與可驗證的 context 欄位，再依該 SDK 包成最薄的 entry/manifest。官方 API 是 experimental，不能猜 sender 或 session key 的權限。

依主軸比較 Harness 時，使用相同客服案例與 tool factory，評估工具執行、交班品質、接手靜默、脈絡隔離、延遲、成本及部署複雜度。不要因另一個 Harness 宣稱有 session 隔離，就跳過 Core 的客戶所有權檢查。

案例、合成 fixture 條件與結果欄位見 [Harness 比較案例](harness-evaluation.md)。尚未執行模型比較，不將 deterministic eval 的結果填入人工實驗表。

## 測試通過的條件

1. GetClientID 的 linked 與失敗行為有真實且經人工核對的證據，未知的 no-match 不被當成未綁定
2. 客戶存在與狀態政策、服務分頁、欄位形狀、external ID 對應和 key 權限在實際版本成立
3. A 客戶無法選到 B 客戶服務，provider 失敗時不繼續查伺服器
4. 人工接手、關閉及 context 過期立即阻止後續客戶操作，生成中的回覆也無法送出
5. 交班投遞失敗可安全重試，沒有跨客服單傳送、重複通知或模型指定 mentions
6. 真正 host 的工具註冊、簽發與 state adapter 經隔離環境測試，再決定最終 Harness

這些結果審查後才決定 ADR 0003 與正式啟用。Order Agent、重啟、退款、終止及其他寫入操作不屬於本次唯讀階段。
