# KB rerun 11 診斷證據盤點

主來源為本機 checkpoint `eval-results/golden-2026-11-23T17-40-32-806Z-13.json`，另核對 [Rerun 11 報告](golden-set-step12-docs-rerun-11.md)、repo 外 golden set 與本機 `knowledge/`。Golden set 的 SHA-256 與 checkpoint 的 `datasetSha256` 相符。

`outcome` 取自歷史工單。本輪交付與轉人工看 `answer`、`handedOff`。事件序號為 `eventLog` 陣列順序（從 1 起）。事件沒有時間戳，也沒有獨立的完整度事件，完整度原值見各題陣列。

`evidence` 記錄最終 attempt 存檔的搜尋回傳，`admittedEvidence` 記錄 runner 回傳的引用候選。分數取自 `semanticScores`，按檔名和起始行配對。該欄沒有結束行，同起始行而範圍不同的段落不借用分數。「待查」表示沒有可可靠配對的分數。「未見」只指這兩個存檔陣列，不外推至所有查詢或上一 attempt。

| 題號 | outcome | handedOff | handoffMarkerPresent | handoffMarkerOverridden | semantic.verdict | semantic.basis | contentCoverage | ungroundedDelivery |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GS-023 | `resolved` | `false` | `false` | `false` | `wrong` | `judge` | `true` | `false` |
| GS-056 | `resolved` | `false` | `true` | `true` | `wrong` | `judge` | `true` | `false` |
| GS-084 | `resolved` | `true` | `false` | `false` | `wrong` | `lifecycle` | `true` | `false` |
| GS-108 | `resolved` | `true` | `true` | `false` | `wrong` | `lifecycle` | `true` | `false` |
| GS-140 | `resolved` | `true` | `true` | `false` | `wrong` | `lifecycle` | `true` | `false` |
| GS-166 | `resolved` | `true` | `false` | `false` | `wrong` | `lifecycle` | `false` | `false` |

## GS-023

**Golden set 參考答案**

- 連不上伺服器時可先刷新 DNS 快取再試
- 建議改用 Google DNS
- 若 DNS 功能正常，重新加入即可正常連線

**相關本機 KB**

- `debug/connection.md`（evidence 與 admittedEvidence 均有）。23–32 是上游封鎖與替代位址。33–47 明載改用 Google DNS、清 DNS 快取、用 nslookup 核對後重連。33–47 只見於 admittedEvidence。
- `debug/googledns.md`（兩陣列均未見整篇）。Google DNS 設定、清快取與驗證的完整教學。
- `debug/automatic-route-switching.md`（兩陣列均未見整篇）。線路故障時會自動切換，可稍等再試。
- `practice/advanced/automation.md`（evidence 與 admittedEvidence 均有）。228–235 列 DiscordSRV 通知事件。

**搜尋與 admission**

`evidence` 共 8 筆，以下依存檔順序列出。

- `practice/advanced/automation.md:228-235`
- `panel/start-server.md:15-38`
- `practice/advanced/proxy.md:11-32`
- `panel/config/startup.md:40-44`
- `store/discord.md:6-43`
- `store/account/login-recovery.md:8-11`
- `panel/common/console.md:1-22`
- `debug/connection.md:55-66`

檢索到但未 admitted 的段落為 0。

`admittedEvidence` 共 26 筆，依首次出現順序列出。重複筆數如表。

| 段落 | 筆數 | semanticScores.score | 亦見於 evidence |
| --- | ---: | ---: | --- |
| `practice/advanced/automation.md:228-235` | 1 | `0.5977694927427694` | 是 |
| `panel/common/console.md:1-22` | 1 | `0.4801270041391691` | 是 |
| `debug/connection.md:23-32` | 1 | 待查 | 否 |
| `panel/start-server.md:15-38` | 1 | `0.6014380883605103` | 是 |
| `store/discord.md:6-43` | 1 | `0.520396244270813` | 是 |
| `practice/advanced/proxy.md:11-32` | 1 | `0.527637883777133` | 是 |
| `panel/config/startup.md:10-13` | 1 | 待查 | 否 |
| `panel/config/startup.md:14-17` | 1 | 待查 | 否 |
| `panel/config/startup.md:18-21` | 1 | 待查 | 否 |
| `panel/config/startup.md:22-25` | 1 | 待查 | 否 |
| `store/discord.md:44-52` | 1 | 待查 | 否 |
| `panel/config/startup.md:40-44` | 1 | `0.5257832691312476` | 是 |
| `debug/connection.md:55-66` | 1 | `0.4955857279031897` | 是 |
| `panel/config/startup.md:26-33` | 1 | 待查 | 否 |
| `debug/connection.md:33-47` | 1 | 待查 | 否 |
| `debug/connection.md:72-78` | 1 | 待查 | 否 |
| `debug/connection.md:79-84` | 1 | 待查 | 否 |
| `debug/connection.md:85-98` | 1 | 待查 | 否 |
| `store/account/login-recovery.md:12-19` | 1 | 待查 | 否 |
| `store/account/login-recovery.md:8-11` | 1 | `0.5050502546480948` | 是 |
| `panel/config/startup.md:34-39` | 1 | 待查 | 否 |
| `store/discord.md:53-55` | 1 | 待查 | 否 |
| `debug/connection.md:18-22` | 1 | 待查 | 否 |
| `debug/connection.md:48-54` | 1 | 待查 | 否 |
| `debug/connection.md:67-71` | 1 | 待查 | 否 |
| `debug/connection.md:99-102` | 1 | 待查 | 否 |

**草稿與交付**　`drafts` 共 2 份。最後一份含 `STAFF_HANDOFF` 為 `false`。

1. 預告查連線與啟動文件、服務狀態及遮罩日誌。
2. 記錄 running、無時間戳且讀不到日誌。說明 DiscordSRV 的通知用途，建議沿用已恢復的替代位址、測原位址，並在再發時記錄時間、錯誤與位址。

交付保留替代位址與排查內容，引用格式與最後草稿有差異。

**評分、gate 與完整度原值**

~~~json
{
  "semantic": {
    "verdict": "wrong",
    "judgment": {
      "points": [
        "missing",
        "missing",
        "missing"
      ],
      "verdict": "wrong",
      "reason": "The answer focuses on alternate connection addresses and possible upstream firewall or routing issues. It does not advise flushing the DNS cache or switching to Google DNS, and it does not explain that players can rejoin normally if DNS is working."
    },
    "basis": "judge"
  },
  "citationGateAttempts": [
    {
      "status": "passed",
      "grounded": true,
      "matched": [
        "[practice/advanced/automation.md:228-235]"
      ],
      "failures": [
        {
          "citation": "[debug/connection.md:23-32]",
          "reason": "excerpt_mismatch"
        }
      ],
      "claimSupport": true
    }
  ],
  "citationGateRepair": {
    "attempted": true,
    "repaired": true,
    "before": {
      "status": "failed",
      "grounded": false,
      "matched": [],
      "failures": [
        {
          "citation": "[practice/advanced/automation.md:228-235]",
          "reason": "excerpt_mismatch"
        },
        {
          "citation": "[debug/connection.md:23-32]",
          "reason": "excerpt_mismatch"
        }
      ],
      "claimSupport": false
    },
    "after": {
      "status": "passed",
      "grounded": true,
      "matched": [
        "[practice/advanced/automation.md:228-235]"
      ],
      "failures": [
        {
          "citation": "[debug/connection.md:23-32]",
          "reason": "excerpt_mismatch"
        }
      ],
      "claimSupport": true
    }
  },
  "citationGateViolation": false,
  "answerCompletenessAttempts": [
    true
  ]
}
~~~

**相關事件**　按 checkpoint 陣列順序摘錄。

| 序號 | attempt | kind | name | status | detail |
| ---: | ---: | --- | --- | --- | --- |
| 12 | 1 | `diagnostic` | `handoffMarker` | `absent` | — |
| 13 | 1 | `gate` | `citationGate` | `passed` | — |
| 14 | 1 | `judge` | `semantic` | `started` | — |
| 15 | 1 | `judge` | `semantic` | `ok` | `wrong` |

## GS-056

**Golden set 參考答案**

- 刪除全部資料後世界會重製
- 到設定按重新安裝伺服器再開機，世界就會重製

**相關本機 KB**

- `panel/common/settings.md`（兩陣列均未見整篇）。面板設定頁右下方有「重新安裝伺服器」。
- `panel/start-server.md`（兩陣列均未見整篇）。面板啟動及連線流程。
- `panel/config/user.md`（兩陣列均未見整篇）。重裝權限說明警告操作會清除伺服器資料。
- `index.md`（evidence 與 admittedEvidence 均有）。18–19 說每日做節點檔案備份，資料至少保留三天。

**搜尋與 admission**

`evidence` 共 8 筆，以下依存檔順序列出。

- `store/services/suspension-retention.md:14-17`
- `practice/advanced/automation.md:180-184`
- `index.md:18-19`
- `practice/advanced/automation.md:185-190`
- `practice/advanced/performance.md:218-221`
- `practice/advanced/performance.md:242-251`
- `store/services/suspension-retention.md:10-13`
- `store/services/cancel.md:1-18`

檢索到但未 admitted 的段落為 0。

`admittedEvidence` 共 24 筆，依首次出現順序列出。重複筆數如表。

| 段落 | 筆數 | semanticScores.score | 亦見於 evidence |
| --- | ---: | ---: | --- |
| `store/services/suspension-retention.md:14-17` | 2 | `0.5363717811501643` | 是 |
| `practice/advanced/automation.md:180-184` | 1 | `0.5046708861158814` | 是 |
| `index.md:18-19` | 1 | `0.470877082340687` | 是 |
| `store/services/suspension-retention.md:10-13` | 2 | `0.444598379642543` | 是 |
| `store/services/cancel.md:1-18` | 1 | `0.43541142386882864` | 是 |
| `store/services/suspension-retention.md:6-9` | 2 | 待查 | 否 |
| `practice/advanced/automation.md:185-190` | 1 | `0.47287917126926976` | 是 |
| `practice/advanced/performance.md:218-221` | 1 | `0.47152136838766595` | 是 |
| `practice/advanced/performance.md:242-251` | 1 | `0.466698985019807` | 是 |
| `index.md:8-8` | 1 | 待查 | 否 |
| `index.md:9-10` | 1 | 待查 | 否 |
| `index.md:11-13` | 1 | 待查 | 否 |
| `index.md:14-14` | 1 | 待查 | 否 |
| `index.md:15-17` | 1 | 待查 | 否 |
| `index.md:20-21` | 1 | 待查 | 否 |
| `index.md:22-24` | 1 | 待查 | 否 |
| `index.md:25-26` | 1 | 待查 | 否 |
| `index.md:27-41` | 1 | 待查 | 否 |
| `index.md:42-46` | 1 | 待查 | 否 |
| `index.md:47-51` | 1 | 待查 | 否 |
| `index.md:52-56` | 1 | 待查 | 否 |

**草稿與交付**　`drafts` 共 2 份。最後一份含 `STAFF_HANDOFF` 為 `true`。

1. 預告查文件、服務狀態與記錄。
2. 說全刪可能影響世界、進度及設定，記錄 running、無時間戳、無日誌。建議先別重啟或重裝，先查世界資料夾與備份，詢問刪除畫面及時間，引用每日節點備份。

交付保留草稿的備份及暫緩重啟建議，末尾 marker 未出現在交付文字。全刪後世界重製的專門 KB 段落待查。

**評分、gate 與完整度原值**

~~~json
{
  "semantic": {
    "verdict": "wrong",
    "judgment": {
      "points": [
        "partial",
        "missing"
      ],
      "verdict": "wrong",
      "reason": "The answer only states that deleting files may affect the world and progress, without confirming that the world will reset. It does not instruct the user to reinstall the server from settings and then restart it, and it contradicts the resolution by advising not to restart or reinstall."
    },
    "basis": "judge"
  },
  "citationGateAttempts": [
    {
      "status": "passed",
      "grounded": true,
      "matched": [
        "[index.md:18-19]"
      ],
      "failures": [],
      "claimSupport": true
    }
  ],
  "citationGateRepair": {
    "attempted": false,
    "repaired": false,
    "before": null,
    "after": null
  },
  "citationGateViolation": false,
  "answerCompletenessAttempts": [
    true
  ]
}
~~~

**相關事件**　按 checkpoint 陣列順序摘錄。

| 序號 | attempt | kind | name | status | detail |
| ---: | ---: | --- | --- | --- | --- |
| 12 | 1 | `diagnostic` | `handoffMarker` | `present` | — |
| 13 | 1 | `diagnostic` | `handoffMarkerDecision` | `overridden` | — |
| 14 | 1 | `gate` | `citationGate` | `passed` | — |
| 15 | 1 | `judge` | `semantic` | `started` | — |
| 16 | 1 | `judge` | `semantic` | `ok` | `wrong` |

## GS-084

**Golden set 參考答案**

- 無法登入管理介面且帳密一直顯示不對時，更改面板密碼即可解決
- 更改面板密碼的路徑：客戶中心 > 產品 & 服務 > 選擇您的服務 > 變更密碼

**相關本機 KB**

- `store/account/login-recovery.md`（evidence 與 admittedEvidence 均有）。12–19 涵蓋面板密碼變更路徑、重登及仍失敗再找客服。
- `store/account/reset-password.md`（evidence 與 admittedEvidence 均有）。商店帳戶忘記密碼的重設流程。
- `panel/start-server.md`（evidence 與 admittedEvidence 均有）。15–38 含登入相關說明。存檔無草稿所標的獨立 15–18 段。

**搜尋與 admission**

`evidence` 共 8 筆，以下依存檔順序列出。

- `store/account/login-recovery.md:12-19`
- `store/account/login-recovery.md:1-7`
- `panel/start-server.md:15-38`
- `panel/config/user.md:148-149`
- `panel/manage/upload.md:6-28`
- `store/account/reset-password.md:1-11`
- `store/account/login-recovery.md:8-11`
- `panel/config/user.md:174-176`

檢索到但未 admitted 的段落為 0。

`admittedEvidence` 共 13 筆，依首次出現順序列出。重複筆數如表。

| 段落 | 筆數 | semanticScores.score | 亦見於 evidence |
| --- | ---: | ---: | --- |
| `store/account/login-recovery.md:12-19` | 3 | `0.6194158780590118` | 是 |
| `store/account/login-recovery.md:1-7` | 1 | `0.501051554681427` | 是 |
| `store/account/login-recovery.md:8-11` | 3 | `0.4598947170252937` | 是 |
| `panel/start-server.md:15-38` | 1 | `0.4945756043496459` | 是 |
| `panel/manage/upload.md:6-28` | 1 | `0.4732877577986327` | 是 |
| `panel/config/user.md:148-149` | 1 | `0.4773190282109148` | 是 |
| `store/account/reset-password.md:1-11` | 1 | `0.4682310512744507` | 是 |
| `panel/config/user.md:174-176` | 1 | `0.4597646745714771` | 是 |
| `panel/config/user.md:105-114` | 1 | 待查 | 否 |

**草稿與交付**　`drafts` 共 2 份。最後一份含 `STAFF_HANDOFF` 為 `false`。

1. 預告查登入排查文件與服務狀態。
2. 記錄 running、無時間戳。引用面板密碼重設完整路徑，請變更後重登，仍失敗再回報錯誤。另提第三方登入須 Email 一致並標 15–18。

交付文字為「我不知道，現有資料不足以確認答案，已轉交人工客服。」

**評分、gate 與完整度原值**

~~~json
{
  "semantic": {
    "verdict": "wrong",
    "basis": "lifecycle"
  },
  "handoffContentVerdict": {
    "verdict": "correct",
    "judgment": {
      "points": [
        "covered",
        "covered"
      ],
      "verdict": "correct",
      "reason": "答案指出登入帳密不符時應重新設定面板密碼，並提供了完整的密碼變更路徑。這與客服確認的處理方式一致。"
    },
    "basis": "judge"
  },
  "citationGateAttempts": [
    {
      "status": "failed",
      "grounded": true,
      "matched": [
        "[store/account/login-recovery.md:12-19]"
      ],
      "failures": [
        {
          "citation": "[panel/start-server.md:15-18]",
          "reason": "wrong_lines"
        }
      ],
      "claimSupport": true
    }
  ],
  "citationGateRepair": {
    "attempted": false,
    "repaired": false,
    "before": null,
    "after": null
  },
  "citationGateViolation": true,
  "answerCompletenessAttempts": [
    true
  ]
}
~~~

**相關事件**　按 checkpoint 陣列順序摘錄。

| 序號 | attempt | kind | name | status | detail |
| ---: | ---: | --- | --- | --- | --- |
| 11 | 1 | `tool` | `/v1/me/handoff` | `ok` | — |
| 12 | 1 | `diagnostic` | `handoffMarker` | `absent` | — |
| 13 | 1 | `gate` | `citationGate` | `failed` | — |
| 14 | 1 | `judge` | `semantic` | `started` | — |
| 15 | 1 | `judge` | `semantic` | `ok` | `correct` |

## GS-108

**Golden set 參考答案**

- 伺服器無法啟動且根目錄缺少 server.jar 時，至設定點選重新安裝即可
- 若重新安裝後仍無法啟動，應提供控制台錯誤訊息或 logs/latest.log 再診斷

**相關本機 KB**

- `debug/nojar.md`（evidence 與 admittedEvidence 均有）。31–38 解讀 server.jar 缺失或檔名不符。45–50 查自傳核心檔名。51–56 從其他設定重裝，自動補核心。57–67 核心存在仍報錯時查啟動設定。51–56 只見於 admittedEvidence。
- `panel/common/settings.md`（兩陣列均未見整篇）。設定頁有重裝入口。
- `panel/config/startup.md`（evidence 與 admittedEvidence 均有）。說明啟動欄位及啟動指令需客服處理的限制。
- `panel/common/console.md`（兩陣列均未見整篇）。面板終端機與控制台輸出。

**搜尋與 admission**

`evidence` 共 8 筆，以下依存檔順序列出。

- `debug/nojar.md:31-38`
- `panel/config/startup.md:40-44`
- `debug/nojar.md:57-67`
- `debug/nojar.md:1-30`
- `panel/config/startup.md:1-9`
- `practice/config/server-properties.md:16-20`
- `practice/advanced/automation.md:11-14`
- `practice/advanced/automation.md:247-250`

檢索到但未 admitted 的段落為 0。

`admittedEvidence` 共 36 筆，依首次出現順序列出。重複筆數如表。

| 段落 | 筆數 | semanticScores.score | 亦見於 evidence |
| --- | ---: | ---: | --- |
| `debug/nojar.md:57-67` | 3 | `0.46826751303024344` | 是 |
| `debug/nojar.md:1-30` | 1 | `0.4684715351269872` | 是 |
| `debug/nojar.md:45-50` | 3 | 待查 | 否 |
| `debug/nojar.md:31-38` | 3 | `0.4942917291069919` | 是 |
| `panel/config/startup.md:40-44` | 2 | `0.485937285904899` | 是 |
| `panel/config/startup.md:1-9` | 1 | `0.44738121243519696` | 是 |
| `practice/config/server-properties.md:16-20` | 1 | `0.42622129275223647` | 是 |
| `practice/advanced/automation.md:247-250` | 1 | `0.42426710627525294` | 是 |
| `panel/config/startup.md:10-13` | 2 | 待查 | 否 |
| `panel/config/startup.md:14-17` | 2 | 待查 | 否 |
| `panel/config/startup.md:18-21` | 2 | 待查 | 否 |
| `panel/config/startup.md:22-25` | 2 | 待查 | 否 |
| `panel/config/startup.md:26-33` | 2 | 待查 | 否 |
| `panel/config/startup.md:34-39` | 2 | 待查 | 否 |
| `practice/advanced/automation.md:11-14` | 1 | `0.42610598267588595` | 是 |
| `debug/nojar.md:39-44` | 3 | 待查 | 否 |
| `debug/nojar.md:51-56` | 3 | 待查 | 否 |
| `practice/config/server-properties.md:6-15` | 1 | 待查 | 否 |
| `practice/advanced/automation.md:15-55` | 1 | 待查 | 否 |

**草稿與交付**　`drafts` 共 4 份。最後一份含 `STAFF_HANDOFF` 為 `true`。

1. 空字串。
2. 空字串。
3. 預告查文件、服務狀態及啟動排查。
4. 記錄 running、無時間戳、未取得日誌，先請重連並視面板狀態回報終端機錯誤。分自傳核心檔名、面板核心遺失時重裝、重裝後同錯誤查啟動參數，請再啟動確認，失敗時由客服核對記錄。

交付保留含條件式重裝及回報錯誤的草稿正文，末尾改為「已轉交人工客服。」

**評分、gate 與完整度原值**

~~~json
{
  "semantic": {
    "verdict": "wrong",
    "basis": "lifecycle"
  },
  "handoffContentVerdict": {
    "verdict": "correct",
    "judgment": {
      "points": [
        "covered",
        "covered"
      ],
      "verdict": "correct",
      "reason": "The answer directs the customer to reinstall the server from settings if the automatically installed JAR is missing and to report the console error if startup still fails. It does not contradict the staff resolution."
    },
    "basis": "judge"
  },
  "citationGateAttempts": [
    {
      "status": "passed",
      "grounded": true,
      "matched": [
        "[debug/nojar.md:31-38]"
      ],
      "failures": [
        {
          "citation": "[debug/nojar.md:45-50]",
          "reason": "excerpt_mismatch"
        },
        {
          "citation": "[debug/nojar.md:51-56]",
          "reason": "excerpt_mismatch"
        },
        {
          "citation": "[debug/nojar.md:57-67]",
          "reason": "excerpt_mismatch"
        },
        {
          "citation": "[panel/config/startup.md:40-44]",
          "reason": "excerpt_mismatch"
        }
      ],
      "claimSupport": true
    }
  ],
  "citationGateRepair": {
    "attempted": false,
    "repaired": false,
    "before": null,
    "after": null
  },
  "citationGateViolation": false,
  "answerCompletenessAttempts": [
    true
  ]
}
~~~

**相關事件**　按 checkpoint 陣列順序摘錄。

| 序號 | attempt | kind | name | status | detail |
| ---: | ---: | --- | --- | --- | --- |
| 12 | 1 | `tool` | `/v1/me/handoff` | `ok` | — |
| 13 | 1 | `diagnostic` | `handoffMarker` | `present` | — |
| 14 | 1 | `diagnostic` | `handoffMarkerDecision` | `retained` | — |
| 15 | 1 | `gate` | `citationGate` | `passed` | — |
| 16 | 1 | `judge` | `semantic` | `started` | — |
| 17 | 1 | `judge` | `semantic` | `ok` | `correct` |

## GS-140

**Golden set 參考答案**

- 重複開啟客服單不會加速處理
- 產品相關問題應使用售後服務類客服單
- 應等待技術人員回覆，勿大量重複開單

**相關本機 KB**

- `store/discord.md`（兩陣列均未見整篇）。綁定後可取得身分組並開「售後服務」客服單。
- `store/services/support-channels.md`（兩陣列均未見整篇）。請透過 Discord 開單，多次無法解決時轉真人。
- `practice/install/java-modpack-recovery.md`（兩陣列均未見整篇）。面板模組包功能暫時不能用時，上傳 server pack 並依需求設定。
- `practice/install/neoforge-1211.md`（evidence 與 admittedEvidence 均有）。NeoForge 1.21.1 的 Egg、Startup Config、重裝步驟。
- `practice/install/mod.md`（evidence 與 admittedEvidence 均有）。44–58 是載入器相容性相關段落，另有手動上傳指引。

**搜尋與 admission**

`evidence` 共 8 筆，以下依存檔順序列出。

- `panel/config/startup.md:26-33`
- `practice/install/mod.md:101-183`
- `practice/install/neoforge-1211.md:1-11`
- `practice/install/mod.md:66-100`
- `panel/config/startup.md:22-25`
- `practice/install/mod.md:44-48`
- `practice/install/mod.md:32-43`
- `practice/install/mod.md:6-10`

檢索到但未 admitted 的段落為 0。

`admittedEvidence` 共 35 筆，依首次出現順序列出。重複筆數如表。

| 段落 | 筆數 | semanticScores.score | 亦見於 evidence |
| --- | ---: | ---: | --- |
| `practice/install/neoforge-1211.md:1-11` | 1 | `0.6396957929866771` | 是 |
| `practice/install/mod.md:101-183` | 1 | `0.6285027946012864` | 是 |
| `practice/install/mod.md:59-100` | 3 | 待查 | 否 |
| `practice/install/mod.md:66-100` | 1 | `0.6332363278259358` | 是 |
| `practice/install/mod.md:101-233` | 1 | 待查 | 否 |
| `practice/install/mod.md:6-14` | 2 | 待查 | 否 |
| `practice/install/mod.md:27-43` | 3 | 待查 | 否 |
| `practice/install/mod.md:44-58` | 3 | 待查 | 否 |
| `panel/config/startup.md:26-33` | 2 | `0.6262696364227055` | 是 |
| `practice/install/mod.md:6-10` | 1 | `0.5954441258000067` | 是 |
| `panel/config/startup.md:22-25` | 2 | `0.5952052550608725` | 是 |
| `practice/install/mod.md:32-43` | 1 | `0.6039573489732685` | 是 |
| `practice/install/mod.md:44-48` | 1 | `0.5999916950911415` | 是 |
| `panel/config/startup.md:10-13` | 2 | 待查 | 否 |
| `panel/config/startup.md:14-17` | 2 | 待查 | 否 |
| `panel/config/startup.md:18-21` | 2 | 待查 | 否 |
| `practice/install/mod.md:15-26` | 3 | 待查 | 否 |
| `panel/config/startup.md:40-44` | 2 | 待查 | 否 |
| `panel/config/startup.md:34-39` | 2 | 待查 | 否 |

**草稿與交付**　`drafts` 共 5 份。最後一份含 `STAFF_HANDOFF` 為 `true`。

1. 預告查模組包文件、狀態及日誌。
2. 記錄 running、無日誌，預告再查安裝器或索引驗證文件。
3. 再次預告查狀態、日誌及模組包排查。
4. 記錄 running、無日誌，預告聚焦安裝器、暫存部署、完成與清理。
5. 先記錄多次縮小查詢範圍。報告狀態與日誌限制，引用 Forge/Fabric 不能混用的節錄，列出下載、解壓、部署、完成標記、清理、索引相容性與重跑驗證的待核對項目，請主機端查完整安裝器日誌。

交付文字為「我不知道，現有資料不足以確認答案，已轉交人工客服。」本機 KB 未核實重複開單／等待技術人員的專門段落，BMC4 暫存部署及索引處理文件待查。

**評分、gate 與完整度原值**

~~~json
{
  "semantic": {
    "verdict": "wrong",
    "basis": "lifecycle"
  },
  "handoffContentVerdict": {
    "verdict": "wrong",
    "judgment": {
      "points": [
        "missing",
        "missing",
        "partial"
      ],
      "verdict": "wrong",
      "reason": "The answer reasonably identifies what technical staff need to investigate, but it does not explain that duplicate tickets will not speed up support or direct the customer to the after-sales ticket category. Referring the issue to hosting staff only partially addresses the instruction to wait for a technician’s reply without opening duplicate tickets."
    },
    "basis": "judge"
  },
  "citationGateAttempts": [
    null,
    {
      "status": "failed",
      "grounded": false,
      "matched": [],
      "failures": [
        {
          "citation": "[practice/install/mod.md:44-58]",
          "reason": "truncated"
        }
      ],
      "claimSupport": false
    }
  ],
  "citationGateRepair": {
    "attempted": false,
    "repaired": false,
    "before": null,
    "after": null
  },
  "citationGateViolation": true,
  "answerCompletenessAttempts": [
    null,
    true
  ]
}
~~~

**相關事件**　按 checkpoint 陣列順序摘錄。

| 序號 | attempt | kind | name | status | detail |
| ---: | ---: | --- | --- | --- | --- |
| 11 | 1 | `tool` | `/v1/me/server-logs` | `error` | `HTTP_404` |
| 12 | 1 | `tool` | `/v1/me/invoice` | `error` | `HTTP_403` |
| 13 | 1 | `gate` | `citationGate` | `none` | — |
| 24 | 2 | `tool` | `/v1/me/server-logs` | `error` | `HTTP_404` |
| 25 | 2 | `tool` | `/v1/me/invoice` | `error` | `HTTP_403` |
| 26 | 2 | `tool` | `/v1/me/handoff` | `ok` | — |
| 27 | 2 | `diagnostic` | `handoffMarker` | `present` | — |
| 28 | 2 | `diagnostic` | `handoffMarkerDecision` | `retained` | — |
| 29 | 2 | `gate` | `citationGate` | `failed` | — |
| 30 | 2 | `judge` | `semantic` | `started` | — |
| 31 | 2 | `judge` | `semantic` | `ok` | `wrong` |

## GS-166

**Golden set 參考答案**

- 大檔案應使用 SFTP 上傳，而非面板直接上傳
- 可直接將資料夾拖曳上傳
- 上傳目標資料夾依檔案種類而定

**相關本機 KB**

- `panel/manage/upload.md`（evidence 與 admittedEvidence 均有）。6–28 寫超過 100 MB 用 SFTP、此頁不能傳資料夾，單一檔案可拖進頁面。
- `panel/common/sftp.md`（兩陣列均未見整篇）。大檔或資料夾走 SFTP，面板設定頁取得連線資訊，連線後按一般檔案管理方式傳輸。
- `panel/common/settings.md`（兩陣列均未見整篇）。設定頁左上角有 SFTP 連線資訊與啟動入口。

**搜尋與 admission**

`evidence` 共 8 筆，以下依存檔順序列出。

- `store/description/palworld.md:8-18`
- `panel/manage/upload.md:6-28`
- `index.md:18-19`
- `store/description/minecraft.md:8-18`
- `practice/advanced/proxy.md:176-177`
- `practice/advanced/proxy.md:198-211`
- `store/services/suspension-retention.md:14-17`
- `debug/nojar.md:45-50`

檢索到但未 admitted 的段落為 0。

`admittedEvidence` 共 28 筆，依首次出現順序列出。重複筆數如表。

| 段落 | 筆數 | semanticScores.score | 亦見於 evidence |
| --- | ---: | ---: | --- |
| `index.md:18-19` | 1 | `0.5288073753018783` | 是 |
| `store/description/palworld.md:8-18` | 1 | `0.5559555939833465` | 是 |
| `store/description/minecraft.md:8-18` | 1 | `0.5199369491022122` | 是 |
| `store/services/suspension-retention.md:14-17` | 1 | `0.5007122243668185` | 是 |
| `store/description/palworld.md:19-31` | 1 | 待查 | 否 |
| `panel/manage/upload.md:6-28` | 1 | `0.5300405368500218` | 是 |
| `practice/advanced/proxy.md:176-177` | 1 | `0.5063817837429935` | 是 |
| `practice/advanced/proxy.md:198-211` | 1 | `0.5043410555781475` | 是 |
| `debug/nojar.md:45-50` | 1 | `0.4985711741325747` | 是 |
| `index.md:9-10` | 1 | 待查 | 否 |
| `index.md:11-13` | 1 | 待查 | 否 |
| `index.md:15-17` | 1 | 待查 | 否 |
| `index.md:22-24` | 1 | 待查 | 否 |
| `index.md:27-41` | 1 | 待查 | 否 |
| `index.md:42-46` | 1 | 待查 | 否 |
| `index.md:47-51` | 1 | 待查 | 否 |
| `store/description/minecraft.md:19-31` | 1 | 待查 | 否 |
| `debug/nojar.md:31-38` | 1 | 待查 | 否 |
| `debug/nojar.md:39-44` | 1 | 待查 | 否 |
| `debug/nojar.md:51-56` | 1 | 待查 | 否 |
| `store/services/suspension-retention.md:6-9` | 1 | 待查 | 否 |
| `store/services/suspension-retention.md:10-13` | 1 | 待查 | 否 |
| `index.md:8-8` | 1 | 待查 | 否 |
| `index.md:14-14` | 1 | 待查 | 否 |
| `index.md:20-21` | 1 | 待查 | 否 |
| `index.md:25-26` | 1 | 待查 | 否 |
| `index.md:52-56` | 1 | 待查 | 否 |
| `debug/nojar.md:57-67` | 1 | 待查 | 否 |

**草稿與交付**　`drafts` 共 3 份。最後一份含 `STAFF_HANDOFF` 為 `false`。

1. 預告查上傳限制及大於 10 MB 的資料夾上傳方式。
2. 記下檔案管理不能上傳資料夾、超過 100 MB 用 SFTP，預告再查 10 MB 和面板解壓。
3. 建議先做 ZIP、壓縮檔小於 100 MB 時透過面板上傳，說未查到面板解壓說明，無法解壓則改 SFTP。引用面板上傳文件。

交付文字為「我不知道，現有資料不足以確認答案，已轉交人工客服。」歷史客服以大於 10 MB 指向 SFTP，面板 KB 記載的數字是 100 MB。10 MB 是否為現行限制、面板直接解壓流程與依類型選目的地的通用 KB 指引待查。

**評分、gate 與完整度原值**

~~~json
{
  "semantic": {
    "verdict": "wrong",
    "basis": "lifecycle"
  },
  "handoffContentVerdict": {
    "verdict": "wrong",
    "judgment": {
      "points": [
        "partial",
        "missing",
        "missing"
      ],
      "verdict": "wrong",
      "reason": "The answer recommends SFTP only for files over 100 MB rather than for files over 10 MB, and it incorrectly states that folders cannot be uploaded directly. It does not address choosing the destination folder based on file type."
    },
    "basis": "judge"
  },
  "citationGateAttempts": [
    {
      "status": "failed",
      "grounded": false,
      "matched": [],
      "failures": [
        {
          "citation": "[panel/manage/upload.md:6-28]",
          "reason": "excerpt_mismatch"
        }
      ],
      "claimSupport": false
    }
  ],
  "citationGateRepair": {
    "attempted": false,
    "repaired": false,
    "before": null,
    "after": null
  },
  "citationGateViolation": true,
  "answerCompletenessAttempts": [
    false
  ]
}
~~~

**相關事件**　按 checkpoint 陣列順序摘錄。

| 序號 | attempt | kind | name | status | detail |
| ---: | ---: | --- | --- | --- | --- |
| 11 | 1 | `tool` | `/v1/me/handoff` | `ok` | — |
| 12 | 1 | `diagnostic` | `handoffMarker` | `absent` | — |
| 13 | 1 | `gate` | `citationGate` | `failed` | — |
| 14 | 1 | `judge` | `semantic` | `started` | — |
| 15 | 1 | `judge` | `semantic` | `ok` | `wrong` |
