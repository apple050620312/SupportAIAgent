# KB rerun 11 診斷草稿

## 證據盤點

主來源是 checkpoint `eval-results/golden-2026-11-23T17-40-32-806Z-13.json`，證據盤點文件已核對其 dataset SHA、KB 與 golden set。六題的 outcome 都是 `resolved`，但 semantic verdict 都是 `wrong`。GS-023、GS-056 的 `handedOff=false`，GS-084、GS-108、GS-140、GS-166 的 `handedOff=true`。contentCoverage 除 GS-166 為 `false` 外皆為 `true`，六題 `ungroundedDelivery=false`。

證據陣列是 runner 存檔的搜尋結果，`admittedEvidence` 是 runner 回傳給模型的引用候選。未在這兩個陣列出現，不代表 KB 全文不存在。事件序號按 checkpoint 的 `eventLog` 陣列由 1 起算。citation gate 的 status、matched、failures、repair 與完整度均以下文逐題 JSON 原值為準。

## 逐題歸因

### GS-023

Golden 參考答案的三個要點是清除 DNS 快取、改用 Google DNS，以及 DNS 正常時重新加入即可連線。搜尋 `evidence` 有 8 筆，沒有未 admitted 的項目。第一組搜尋存檔未列 `debug/connection.md:33-47`，但 `admittedEvidence` 有該段，並且也有 `debug/connection.md:23-32`、`:55-66` 等段落。盤點記錄 `:33-47` 只出現在 admittedEvidence，完整 Google DNS 文章 `debug/googledns.md` 兩個陣列都未見。因此不能歸因為「目標段落完全沒檢索到」。更精確的說法是，段落已 admitted，但草稿沒有用它。

兩份草稿最後一份只保留替代位址、測原位址、記錄錯誤與位址，沒有三個 golden 要點。semantic judge 的三個 points 全為 `missing`，reason 明確說沒有 DNS flush、Google DNS、DNS 正常時重新加入。citation gate 唯一 attempt 是 `passed`，matched 為 `[practice/advanced/automation.md:228-235]`，對 `[debug/connection.md:23-32]` 記 `excerpt_mismatch`，repair 的 before 為 failed、after 為 passed，matched 仍只有 automation 段落，claimSupport 為 true。完整度為 `true`。所以 gate 沒有阻止交付，也沒有要求模型覆蓋每個 admitted 段落。現有 checkpoint 不能證明模型「看到了但拒絕使用」的內在原因，只能確認已 admitted 的 `:33-47` 未被交付採用。

**機制分類：提示詞（次因：完整度檢查）。** 提示詞要求使用相關證據和程序完整，但沒有把每個 admitted 段落轉成必答項。完整度只回報 true，沒有檢出三個語義缺項。

### GS-056

Golden 要求說明刪除全部資料會重製世界，並從設定選「重新安裝伺服器」再開機。相關專門內容在 `panel/common/settings.md`、`panel/start-server.md`、`panel/config/user.md`，但這三篇在 evidence 與 admittedEvidence 都未見整篇。盤點對「全刪後世界重製」的專門 KB 段落標為待查，不能聲稱 KB 有一個已被檢索出的專門段落。已取回且被採用的主要是 `index.md:18-19` 的每日備份資訊。

最後草稿說全刪可能影響世界、進度及設定，引用每日備份，並建議「先別重啟或重裝」。因此它既沒有確認重製，也反對 golden 要求的重裝與重啟。semantic points 為第一項 `partial`、第二項 `missing`，reason 明確指出沒有重裝/重啟且與解法矛盾。citation gate 單次 `passed`，matched 為 `[index.md:18-19]`，failures 為空，repair 未嘗試，完整度為 `true`。模型從哪一段推出「先別重裝」無法由 checkpoint 確認。可確認的是它選用了備份段落，將「可能影響資料」擴成保守建議，並沒有檢索或採用面板設定的重裝入口。

`handoffMarkerPresent=true`、`handoffMarkerOverridden=true`，但最後 `handedOff=false`。這符合 runner 對 marker 的覆寫，因為 gate、完整度與必要 reads 都通過，且提示詞要求有支持內容時不要因未問的阻礙升級。這個覆寫不會修正語義答案。

**機制分類：KB 內容（次因：提示詞）。** 目標重裝段落在兩個存檔陣列均未見，因而模型沒有可引用的程序。保守的「先別重裝」是草稿決策，具體來源待查。

### GS-084

Golden 是登入失敗時改面板密碼，路徑為客戶中心 > 產品 & 服務 > 選擇服務 > 變更密碼。最後草稿實際涵蓋兩點，`handoffContentVerdict.verdict=correct`，兩個 points 都是 `covered`，basis 是 judge。它在 rerun 7–10 皆正確已交付的差異，這次 checkpoint 顯示為 gate/lifecycle 路徑，而不是內容本身錯誤。

citation gate attempt 只有一個，status `failed`、grounded `true`、matched 為 `[store/account/login-recovery.md:12-19]`，另有 `[panel/start-server.md:15-18]` 的 `wrong_lines`。claimSupport 為 true，repair 未嘗試。由 `hasBlockingCitationFailure` 的規則，`wrong_lines` 會阻擋 gate，即使已有一個 grounded matched。checkpoint 的 `citationGateViolation=true`，完整度為 `true`。因此具體 gate 失敗原因是草稿引用了 panel/start-server 的錯誤行號，造成 blocking `wrong_lines`，不是內容不足。

事件 11 是 `/v1/me/handoff` 成功，12 的 handoffMarker 為 `absent`，13 gate failed，之後才 semantic judge。這表示交付被 gate lifecycle 丟棄，並非模型 marker 觸發。相對 rerun 7–10 的退步點，依本 checkpoint 能確認的是本輪多了一個錯行 citation 並令 gate fail，且 `handoffContentVerdict` 仍判 correct。其他輪次的差異值不在本證據盤點內，不能猜測是模型答案、檢索或 provider 改變。

**機制分類：gate（次因：提示詞/引用格式）。** 有根據的草稿被單一 blocking wrong_lines 丟棄，gate 沒有採用「已有 grounded 草稿」作為交付條件。

### GS-108

Golden 要求缺少 server.jar 時到設定重裝，仍失敗則提供控制台錯誤或 logs/latest.log。最後草稿保留條件式重裝和回報錯誤，`handoffContentVerdict=correct`，兩個 points 都 covered。citation gate status `passed`、grounded true、matched 為 `[debug/nojar.md:31-38]`，其餘四個 excerpt mismatch 不屬 blocking failure，完整度 true。

事件 12 是 /v1/me/handoff 成功，13 handoffMarker `present`，14 handoffMarkerDecision `retained`，15 gate passed。runner 原始碼先從模型文字末行以 `STAFF_HANDOFF` 判定 `requestedHandoff`，再計算 `markerRequiresHandoff = requestedHandoff && (failedRequiredRead || hasAccountBlockerCue(prompt))`，最後將 marker 保留。這個 marker 是模型寫在回覆末行的，不是 gate 流程新增。gate 只驗證引用。

近期「無帳戶阻礙時忽略 marker」修正實際有執行條件，但本題 prompt 含帳戶/面板阻礙 cue（checkpoint 盤點將其歸為該類），所以 `hasAccountBlockerCue(prompt)` 使 `markerRequiresHandoff` 為真，`handoffMarkerOverridden=false`。因此修正沒有在本題生效，原因是題目被判定具有帳戶阻礙，不是 gate 失敗。checkpoint 的 handedOff=true、marker present、overridden=false 與此一致。

**機制分類：marker 判斷（次因：提示詞）。** 模型產生 marker，runner 依 account-blocker cue 保留，且 gate/完整度均通過。

### GS-140

Golden 要求說明重複開單不會加速、等待技術人員回覆、使用售後服務類別。相關 `store/discord.md` 與 `store/services/support-channels.md` 在兩個 evidence 陣列均未見整篇，盤點對「不要重複開單／等待回覆」專門段落沒有可核對的已取回值，應列待查。模型回覆轉而列 Forge/Fabric 相容性、下載、部署與日誌待查，沒有三個客服流程要點。handoffContentVerdict 為 wrong，points 為 missing、missing、partial，reason 逐一指出未說明重複開單、售後類別及等待回覆。

第二次 citation gate attempt status `failed`，grounded false、matched 空，唯一 failure 是 `[practice/install/mod.md:44-58]` 的 `truncated`，claimSupport false。第一次 attempt 是 null。repair 未嘗試，完整度第二次為 true。事件 27 marker present、28 decision retained，29 gate failed，30/31 才 judge。除了 marker 外，gate 的 truncated citation 本身也足以阻止交付。HTTP_404 logs 與 HTTP_403 invoice 是工具事件，但盤點沒有證據顯示它們單獨造成此 gate failure。

**機制分類：檢索（次因：gate、KB 內容）。** 客服政策段落未出現在兩個存檔陣列，模型走了安裝排查分支；之後引用被截斷而 gate failed。專門段落是否存在於現行 KB、以及模型是否在其他 search attempt 看到，待查。

### GS-166

Golden 三點是大檔用 SFTP、資料夾可直接拖曳上傳、目的地依檔案種類。KB `panel/manage/upload.md:6-28` 明載超過 100 MB 用 SFTP、此頁不能傳資料夾、單一檔案可拖入。另有 `panel/common/sftp.md` 說大檔或資料夾走 SFTP，但全文在兩個存檔陣列均未見。最後草稿說小於 100 MB 可面板上傳、資料夾不能上傳、無法解壓則改 SFTP。semantic judge 判第一項 partial、後兩項 missing，並明確指出 100 MB 與 10 MB 的差異、錯誤否定資料夾直傳、未回答目的地選擇。這裡的 100 MB 直接來自目前 admitted 的 `panel/manage/upload.md:6-28`，10 MB 來自歷史客服答案；checkpoint 不能證明現行 10 MB 限制，盤點已將其列為待查。錯誤資料夾結論則是模型把該 KB 段落的限制套成整體答案，沒有採用 golden 所需的 SFTP 路徑或其他段落。

gate status `failed`、grounded false、matched 空，failure 是 `[panel/manage/upload.md:6-28]` 的 `excerpt_mismatch`。repair 未嘗試。完整度是 `false`，所以 gate 與完整度雙雙失敗，且 runner 不會把這份草稿當 supportedPartial。相對 rerun 6 由 partial 退為 wrong，checkpoint 可確認的差異是本輪 semantic verdict/判詞變成錯誤且草稿同時把資料夾說成不能直接上傳，並因引用 mismatch、完整度 false 被 lifecycle 丟棄。更細的模型生成原因或 rerun 6 的其他欄位待查。

**機制分類：KB 內容（次因：檢索、完整度檢查）。** 現行 KB 的 100 MB 與歷史 10 MB 形成未解決衝突，且資料夾/目的地指引未被 admitted。gate mismatch 與 coverage false 是交付失敗的獨立後果。

## 共通機制

### 1. admitted 證據存在，但模型選用與程序覆蓋不穩

GS-023 的 `debug/connection.md:33-47` 已在 admittedEvidence，仍漏三個程序要點；GS-056 的重裝相關文章則兩陣列均未見，造成可用證據缺口；GS-140、GS-166 的客服流程或 SFTP companion 也未在兩陣列出現。這同時顯示「檢索命中」與「模型採用」是不同失敗點。GS-023 的 `contentCoverage=true` 不能表示語義完整，GS-166 的 false 則只說格式/前綴與動作詞檢查失敗。

### 2. gate 可因一個引用錯誤丟棄整份有根據草稿

GS-084 有 grounded matched 且 handoffContentVerdict correct，但 `wrong_lines` 是 blocking，citationGateViolation=true，最後交付通用轉人工句。GS-140 的唯一引用 truncated 且 grounded=false，GS-166 是 excerpt_mismatch。GS-023 顯示 repair 曾做一次，after passed，但它只保留可匹配的 automation 引用，沒有補回漏答內容。近期「引用失敗時一次修正再驗證」在 GS-023 有實際生效（attempted/repaired 均 true），GS-084、GS-140、GS-166 的 repair 均未嘗試，不能宣稱普遍生效。

### 3. marker 路由與內容判定相互獨立

GS-108 gate passed、完整度 true、handoffContentVerdict correct，仍因模型 marker present 且 account blocker cue 使 decision retained 而轉人工。GS-084 無 marker 仍因 gate fail 轉人工。GS-056 marker present 但 overridden=true，最後未轉人工。這證明「無帳戶阻礙時忽略 marker」在 GS-056 生效，在 GS-108 因 cue 判定不適用，GS-084/140/166 沒有足夠條件用來判斷。

### 4. 近期修正逐項核對

- **admittedEvidence 分開記錄：有生效。** 六題盤點均區分 evidence 與 admittedEvidence，GS-023 尤其顯示 `:33-47` 只在 admitted；但分開記錄沒有保證模型使用。
- **引用失敗一次修正再驗證：只在 GS-023 生效。** 其 repair `attempted=true, repaired=true`，其餘四題有 gate failure 者均 `attempted=false`。
- **驗證失敗仍保留有根據草稿：未普遍生效。** GS-084 有 grounded/正確內容卻被交付通用句；GS-023 repair 後交付但原因是 gate passed。GS-140、GS-166 沒有 grounded partial 可保留。
- **無帳戶阻礙時忽略轉人工 marker：GS-056 生效，GS-108 未生效且有明確 cue。** GS-056 present/overridden=true/handedOff=false。GS-108 present/overridden=false/handedOff=true。
- **完整度格式無關、內容覆蓋分開記錄：欄位有分開記錄，但結果仍不能保證語義覆蓋。** GS-023、056、084、108、140 都 contentCoverage=true 而 semantic wrong；GS-166 兩者都 false。這證明格式與內容檢查分欄，不能證明內容檢查已涵蓋 golden 要點。
- **降版要求限縮為聚焦檢索命中：本六題沒有降版題，無證據判定。**
- **無症狀時過濾降版段落：本六題沒有降版題，無證據判定。**

## 排序的修正目標

TODO：下一步補入排序的修正目標與驗證方式。

## 不是什麼原因

TODO：下一步補入排除項與「不是什麼原因」。

