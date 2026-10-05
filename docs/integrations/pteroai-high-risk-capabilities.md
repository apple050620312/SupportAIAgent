# PteroAI 高風險能力在 OpenClaw 的替代方案

OpenClaw Core 已提供受授權邊界保護的 Pterodactyl 操作提案，涵蓋檔案列表、檔案讀取、startup 設定讀取，以及檔案寫入、檔案移動、startup variable、Docker image、power start/stop/kill、reinstall、suspend 與 unsuspend。

模型只能提出 `propose_mutation`。Support Core 會重新解析可信 Discord actor、WHMCS customer、hosting service 與 Pterodactyl server，並把 typed operation 綁定 ticket scope、ticket revision、operation digest、短期 expiry 與一次性 approval。可信工作人員必須透過獨立 approval channel 核准，之後才可呼叫 `execute_approved_mutation`。

approval 過期、重放、ticket takeover、revision 改變、ownership 改變、provider 回應不確定或結果驗證失敗，都會拒絕或停止後續執行。Core 不接受模型提供的 WHMCS client ID、Pterodactyl UUID 或 credentials。provider 錯誤不會被轉成成功，也不會自動 retry。

目前 approval store 是 process-local prototype，程序重啟會撤銷未完成 approval。正式多程序部署需要另行設計持久化且具原子 consume 的 receipt store，不能以模型可見輸入繞過這個要求。
