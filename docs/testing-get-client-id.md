# GetClientID 手動測試

目前開發已到需要操作者測試真實 WHMCS 的階段

主軸參考本機的 `docs/previus-chatgpt-conversation.md`。依對話中的順序，先確認 Discord 身分查詢，再接客戶服務與 Pterodactyl，最後才接 AI 和客服單事件。早期提到的資料庫、WHMCS Tickets 與其他 Harness 選項不代表目前採用的架構。現階段仍以 Support Core 作為授權邊界，不新增資料庫或 Redis。

唯讀 identity adapter 與 mock 測試已完成。它還沒有接入正式啟動流程，也不能證明真實帳號綁定唯一或客戶狀態有效。這次要測的是既有 `GetClientID` API 的回應，不是完整客服單機器人。

## 準備環境

使用 Node.js 24.16 以上版本，在專案根目錄執行

```powershell
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

準備一個你有權測試的 WHMCS 環境，以及兩個已知的 Discord 測試帳號

- 一個確定已綁定 WHMCS 的帳號
- 一個確定未綁定的帳號，兩者不能相同

優先使用非正式環境。若使用正式環境，必須先明確批准這次唯讀測試，並確認允許 malformed、empty、invalid-authentication 與 missing-authentication 四種負向請求。不要為了測試新增或解除客戶綁定，不要隨機產生 ID 找客戶。

API 憑證需要能呼叫 `GetClientID`。由 WHMCS 管理員確認角色與來源 IP 存取限制，不要為了測試放寬全部管理權限。舊 Ticket Bot 裡的憑證不要直接沿用，先在系統外完成輪替。

## 設定本機檔案

將 `.env.characterization.example` 複製成 `.env.characterization`，只在這個本機檔案填入實際值。若檔案已存在，先檢查內容，不要直接覆蓋。

| 變數 | 內容 |
| --- | --- |
| `WHMCS_BASE_URL` | WHMCS 安裝根網址，可包含安裝子目錄，遠端必須使用 HTTPS |
| `WHMCS_API_IDENTIFIER` | 這次測試的 API identifier |
| `WHMCS_API_SECRET` | 這次測試的 API secret |
| `TEST_LINKED_DISCORD_ID` | 已知已綁定測試帳號的 Discord User ID |
| `TEST_UNLINKED_DISCORD_ID` | 已知未綁定測試帳號的 Discord User ID |
| `CHARACTERIZATION_ACK` | 確認有授權後填入 `I_HAVE_AUTHORIZATION` |

`WHMCS_BASE_URL` 不要填 `/includes/api.php`，不要帶 query、fragment 或 URL 帳密。工具會自行加上 API 路徑。Discord ID 使用原始十進位字串，不加空白或正負號，不經過 JavaScript Number 或試算表數字轉換。

若已有安全測試資料，可以再填 `TEST_CLOSED_CLIENT_DISCORD_ID` 和 `TEST_INACTIVE_CLIENT_DISCORD_ID`。沒有就留空，不要新增或修改客戶來湊測試案例。

執行前可確認檔案與輸出目錄會被 Git 忽略

```powershell
git check-ignore .env.characterization characterization-results/get-client-id.txt
```

Node 會優先使用目前終端機裡既有的同名環境變數。如果結果與本機檔案設定不符，檢查是否有舊設定覆蓋檔案。不要把環境變數的實際值貼進對話或終端錄影。

## 執行一次

以下命令會真的連線到你設定的 WHMCS。確認授權及測試資料後，由你手動執行

```powershell
corepack pnpm characterize:get-client-id
```

工具預設依序發出六個唯讀查詢，若兩個選填案例都有設定則是八個。不會重試，不會查其他 API action，也不會建立、解除或修改綁定。無效驗證案例只在記憶體裡替 secret 加上固定尾碼，缺少驗證案例會完全省略 identifier 與 secret。

遠端使用 HTTPS。只有工具的本機測試可使用 localhost HTTP。請求為 form POST，憑證不在 URL，禁止轉址，每次請求有十秒 timeout，回應讀取上限為 64 KiB。

需要保留結果時，可將已遮蔽的表格存到忽略目錄

```powershell
New-Item -ItemType Directory -Force characterization-results | Out-Null
corepack pnpm characterize:get-client-id |
  Tee-Object -FilePath characterization-results/get-client-id.txt
```

這是再次執行工具的替代方式，不是要求連跑兩次。不要存原始 HTTP request、response 或 `.env` 內容。測完將本機檔案的 `CHARACTERIZATION_ACK` 改回範例值，避免下次誤執行。

## 回傳哪些結果

請只提供工具印出的遮蔽表格。先人工檢查後，再貼回這個對話

- case 與 HTTP status
- 遮蔽後的 content type
- JSON 是否可解析
- result 是否存在、型別及遮蔽後的值
- clientid 是否存在、型別與本機格式驗證結果，不包含實際值
- message 與 error 是否存在
- 已知的額外欄位名稱，其他名稱以 `<redacted-field>` 代替
- classification

不要提供 API 憑證、Discord ID、實際 clientid、客戶姓名、email、付款資料或原始錯誤訊息。工具不會將這些值寫入輸出或檔案，也不會把任意欄位名稱或任意 media type 原文印出。

另外用文字說明測試環境是否為非正式環境、已知 linked/unlinked 測試資料是否正確、是否有跑選填案例。不需提供網域或識別碼。

## 如何解讀

目前沒有已觀測的真實回應矩陣。上述案例都是待測項目，mock 的 `success` 不是 WHMCS 實測證據。

HTTP 200 或 `classification=json-object` 都不代表業務成功。linked 案例至少需要確認 `result` 為 `success`、`clientid` 存在，而且 `clientIdValidation` 為 `positive-safe-integer`。這是目前 adapter 的本機格式規則，不是 WHMCS 官方型別保證。`zero` 與 `invalid` 都不能作為有效客戶。工具不顯示值，所以它本身不能證明指向正確客戶或客戶仍存在。

unlinked、invalid-authentication 與 missing-authentication 必須分開比較。若都只看到 `result=error`、沒有 clientid、有 message，表格不能證明它們有可安全區分的 no-match 合約。不要把相同形狀直接改成 `IDENTITY_NOT_LINKED`。必要時再取得供應商說明或安全的固定錯誤代碼。

出現 HTTP error、network error、非 JSON、過大回應或不明欄位時，先保留「未知」結論，不要反覆探測或重試驗證失敗。

GetClientID 只回一個 ID 也不能證明映射唯一。沒有可用的 stale、duplicate 或 closed/inactive fixture 時，這些行為仍維持未確認。

## 測完後的開發

先人工審查這次結果，再更新整合文件及 adapter 的暫定解析規則。只有取得足夠證據才建立 ADR 0003。

客戶存在與 Active 狀態驗證、已擁有服務查詢、Pterodactyl server/resources、受控 Core 路由、tool factory 與客服單 bridge 已能用 mock 串接。它們尚未啟用正式環境。第一關審查後，依 [唯讀原型測試指南](testing-read-only-support.md) 測試 provider 與既有 bot/選定 Harness 的真正接點。確認唯一性及可信 ActorContext 傳遞後才開放客戶操作。自動審核訂單與重啟操作仍是後續階段。
