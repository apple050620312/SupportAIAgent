# 客服單機器人接入調查

## 從 ZIP 確認的事實

來源是操作者提供的 `ticket-main.zip`。以下描述只適用於這份封存程式，尚未確認與正式部署一致。沒有執行機器人、連線資料庫或修改外部專案。

| 接點 | 檔案與行為 |
| --- | --- |
| 執行環境 | `package.json` 為 CommonJS，宣告 discord.js `^14.0.2` 與 mongoose `^8.0.2`。這是相依範圍，不是正式環境的實際版本 |
| 客服單資料 | `src/database/models/ticket.js` 保存 `guildId`、`channelId`、`userId`、`closed`、`deleted`、`claimedBy` 等欄位 |
| 事件載入 | `src/handlers/events.js` 載入 events 資料夾的 JavaScript 檔案 |
| 客戶訊息 | `src/events/ticketWorkingTIme.js` 監聽 `messageCreate`，按 channel 查客服單，確認 `userId` 等於訊息作者，再發送下班提示 |
| 關閉 | `src/buttons/ticket/close/confirm.js` 的 `run` 按 channel 查詢與更新 `closed`，之後另行修改 Discord 權限並送訊息 |
| 重新開啟 | `src/buttons/ticket/reopen.js` 的 `run` 按 channel 將 `closed` 改為 false，再修改權限並通知 |

schema 沒有目前 bridge 使用的五種 AI 狀態、顯式 revision 或 handoff receipt。Mongoose 自動版本欄位不能被當成這些操作已實施的 CAS 合約，因為已讀的關閉與重新開啟操作沒有拿預期 revision 作更新條件。

`claimedBy` 欄位的存在不能證明人工接手流程已實作。所檢查的開單路徑有它的初始欄位，但尚未確認正式環境由誰更新、何時更新、如何檢查 staff 角色。不能把「任何非客戶訊息」自動視為具權限的人工接手。

## 為什麼不能直接接上現有 bridge

`TicketStore` 需要可信 scope、明確狀態與可原子比對的 revision。`TicketMessenger` 需要送出前的狀態檢查，以及可重試的投遞紀錄。封存程式的 close/reopen 與直接 `channel.send` 沒有共用這個序列化邊界。

只在 AI 程式送訊息前讀一次 `closed`，仍可能在讀取後被人工關閉。只替新增的 AI 路徑加鎖，也無法涵蓋既有 close/reopen 路徑。重新開啟若恢復同一個權限 scope，舊的六十秒 capsule 也可能仍有效，因此需要讓 host 的 authority guard 淘汰舊 invocation，並明確決定重新啟用 AI 的規則。

這些是需要改動機器人權威狀態的實作缺口，不是單靠 live API 測試可以消除的未知。外部專案仍維持唯讀，Support Core 不直接讀取它的 MongoDB。

## 建議交給機器人維護者的遷移範圍

以下為建議，不是已存在的正式 API。

1. 核對正式 repo、部署版本、客服單 schema 與 staff 授權來源。owner 必須來自已驗證事件及客服單資料，不能從工具參數取得。
2. 在既有機器人的狀態層保存 AI state、revision 與交班 receipt。既有資料沒有明確 AI opt-in 時保持人工模式，不把所有未關閉客服單自動啟用 AI。
3. 實作 `TicketStore.read` 和 `compareAndSet`。讀取要核對 guild、channel、owner、deleted/closed；更新條件包含預期 scope、state 與 revision。更新成功後 revision 遞增，重開不得重設版本。
4. 將 staff 接手、關閉、刪除、重開、owner 變更與 AI 回覆送出納入同一客服單的序列化機制。先核對實際 bot 的程序數，不能用單程序記憶體鎖宣稱跨程序安全。
5. 實作 `sendIfCurrent` 與 handoff `send`。停用 mentions，核對預期 revision，保存 receipt；投遞結果不明時保留不明狀態供人工處理，不保證 Discord 與資料庫之間恰好一次投遞。
6. 讓可信 bot 簽發 context，Core 經受保護的 bot 介面取得權威 ticket state。不要暴露可由 agent 任意查詢 owner 或簽發任意 scope 的介面。
7. 核對正式 Harness 版本，將每次 invocation 綁到可信客服單 scope。接手、關閉、重開或 owner 變更時撤銷舊 invocation，包含生成中與待送出的回覆。

是否沿用既有 MongoDB、如何命名新增欄位及跨程序協調方式，由機器人維護者確認。這不授權 Support Core 引入 MongoDB、Redis 或其他持久層，也不授權本次修改外部機器人。

## 驗收證據

- A 客服單的 scope 不能讀取或送訊息到 B 客服單
- provider 等待中、模型生成中與 Discord 送出前的人工接手都能阻止後續回覆
- 關閉、刪除與 owner 變更立即停止查詢，重開不能復活舊 invocation
- CAS 失敗不繼續投遞，重啟後 receipt 與 ticket state 仍一致
- 交班分段送出一半時發生接手、關閉或投遞不明，能安全停止並交由人工核對
- 真正 Discord 角色與 bot 部署程序數有明確測試紀錄

目前只有主 repo 的 synthetic bridge 測試成立。正式接入程式與以上部署驗收仍未完成。
