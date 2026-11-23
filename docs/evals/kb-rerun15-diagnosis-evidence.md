# Rerun 15 diagnosis evidence

This trace compares the clean checkpoints `eval-results/golden-2026-11-23T20-33-56-444Z-13.json` (rerun 15) and `eval-results/golden-2026-11-23T19-17-04-458Z-13.json` (rerun 13). The verified totals are rerun 15 3 correct, 4 partial, 6 wrong, 3 handoffs, versus rerun 13 4 correct, 4 partial, 5 wrong, 2 handoffs. Rerun 15 retrieval is OpenAI `text-embedding-3-small`, digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`, 72 articles and 570 passages. Rerun 13 is digest `898c35b5b203`, 71 articles and 566 passages. Both use the same model, sub2api provider, temperature, step cap, and 60-second deadline. Both have 13 scored items and zero unscored items.

## Gate and completeness fields

| Item | R13 gate / completeness / coverage | R15 gate / completeness / coverage | R15 admitted target evidence | R15 final answer (verbatim) |
|---|---|---|---|---|
| GS-056 | passed / `[true]` / false | passed / `[false]` / false | `debug/nojar.md:51-56` was admitted, along with `index.md:18-19` | `如果你刪除的是伺服器內的檔案，可能會影響：\n\n- 世界資料，包含地圖、玩家進度與建築\n- 設定檔、插件或模組\n- 啟動所需檔案，嚴重時可能導致伺服器無法啟動\n\n目前後端顯示你的伺服器狀態是 **running**，但我無法從這項狀態確認哪些資料已被刪除，也無法確認是否能直接還原。\n\n官方文件記載：\n\n### 💾 每日檔案備份\n我們**每天會進行節點檔案備份作業**，並且資料保留至少三天，全方面保護您的伺服器資料安全！ [index.md:18-19]\n\n你現在可以先確認世界、玩家資料和設定是否正常。若需要還原已刪除的檔案，請提供刪除的大致時間與資料類型，讓客服確認可用的備份與還原方式。\n\n已轉交人工客服。` |
| GS-062 | passed / `[true]` / true | passed / `[true]` / true | `debug/connection.md:103-109` and support-flow passages were admitted | R15 says to pause reinstall, collect WinMTR, try WARP, and ask staff to check host/network records. It does not state the expected after-sales ticket routing or avoid duplicate tickets. |
| GS-163 | failed / `[true]` / false | passed / `[false]` / false | `panel/start-server.md:1-14` and `:15-38` were admitted | `您好！後台顯示您的伺服器目前為 **運行中（\`running\`）**，但沒有提供狀態更新時間。您可以先到控制面板的「控制台」，點擊上方的連線位址複製，再貼到 Minecraft 裡試連線。...` followed by the full panel startup procedure and `已轉交人工客服。` It never says to wait for support activation. |
| GS-166 | failed / `[true]` / false | failed / `[true]` / false | `panel/common/sftp.md:1-47` and `panel/manage/upload.md:6-28` were admitted | `我不知道，現有資料不足以確認答案，已轉交人工客服。` |

The complete GS-023, GS-108, and baseline drafts are retained in the checkpoint JSON. The relevant attribution is summarized below.

## GS-163 completeness replay

Fix 3 adds this condition in `requiredTaskCoverage` (`packages/agent-loop/src/index.ts`, from commit `e4fcf43`): when `panel/start-server.md` is admitted and the prompt contains purchase/start cues, the answer must match `(?:等候|等待?|待).{0,20}(?:開通|啟用)` or the English activation equivalent. The prompt is the golden item’s `您好，我想詢問已經購買伺服器要如何啟動呢！`; its expected point is that purchase requires waiting for customer support to activate the service, after which the panel can start it. R15’s draft contains panel startup instructions and no activation-wait phrase, so the result is correctly `false`. The new gate repair allowed a panel citation to pass, but the complete-answer check then correctly routed the substantively incomplete draft to handoff. The check is not rejecting a complete answer.

## GS-056 completeness replay

Fix 2/3 checks admitted reinstall evidence when the prompt is a reinstall symptom. The required expression in `e4fcf43` requires all three items in one answer: reinstall, restart/reboot, and a world-reset consequence. R15 admitted `debug/nojar.md:51-56`, whose text gives the reinstall action, but its draft contains none of `重新安裝`/`reinstall`, none of `重啟`/`重新啟動`/`再開機`/`restart`, and no reset-world expression. It discusses possible deletion and backup only. `requiredTaskCoverage` therefore returns false, and `answerCompletenessCheck` returns false. That is a genuine missing-task-point result. The clean R15 index did not contain the later fix-4 consequence sentence, so it must not be used to explain this run.

## GS-062 required-task coverage

R15 admitted support-flow evidence, but `requiredTaskCoverage` only fires its support-flow branch when `hasSupportFlowSymptom(prompt)` is true. The GS-062 prompt is repeated disconnects after reinstall. Its R15 answer contains “先暂停重装” and detailed MTR/WARP collection, but no after-sales/客服單/duplicate wording. The observed completeness result is nevertheless true. This means the branch did not fire for this prompt, rather than firing and mutating the answer. The check has no repair or answer-generation behavior. The result is a false negative in task coverage for this item, while the citation gate passes on the admitted connection passage. The same structural issue explains why admitted support-flow evidence remains unused.

## GS-023 regression

Both runs passed the citation gate and completeness. R13’s answer gave the current status, a direct connection test, alternate-address/DNS/WARP troubleshooting, and escalation evidence, and scored partial with `contentCoverage: true`. R15 instead led with an unrelated DiscordSRV notification passage, then gave only the alternate-address troubleshooting and a generic evidence request. It still had 26 admitted passages and passed the gate because `[practice/advanced/automation.md:228-235]` matched. The completeness result remained true. The regression is model/evidence selection and answer content, not a gate or completeness effect. The changed corpus and index can alter retrieval ordering, but the checkpoint proves the gate did not discard the answer.

## GS-108 regression

Both runs have gate passed, completeness true, content coverage true, no handoff, and the same server-log 404. R13’s answer included the missing-jar diagnosis, manual JAR-name correction, reinstall path, startup-parameter checks, and a useful final connection check. R15 included the same core articles and steps but opened with uncertainty, told the customer only to refresh and wait, and ended by asking staff to inspect missing logs. The semantic judge moved from correct to partial because R15 was less decisive and less directly resolved the reported startup issue. No fix-1/2/3 field changed, so this is model/draft variance, possibly influenced by the changed retrieval corpus, not a code effect.

## GS-166 and rerun-13 cause

GS-166 is unchanged in mechanism. In both runs the model’s final answer is the generic handoff, the completeness check remains true, and the citation gate fails because the draft has no usable citation. In R13 the discarded substantive draft cited the SFTP and upload passages but failed citation matching and was replaced by the handoff. R15’s final answer is already the generic handoff, with the same substantive content absent. This is the same genuine truncation/citation-gate failure identified in rerun 13, not a new completeness failure.

## Exclusions

Retrieval failure is ruled out for the diagnosed items. The target passages were admitted for GS-056, GS-062, GS-163, and GS-166. GS-023 and GS-108 also had broad admitted evidence. The provider and embedding model are unchanged, while the index digest and corpus size changed as recorded above. No item was unscored, no model failure was recorded, and the run stayed within the stated deadline. Judge-only effects cannot explain GS-056 or GS-163 because their delivery fields changed before semantic scoring. They can explain the GS-108 verdict change only after the gate, completeness, and coverage fields remained identical.
