# Rerun 17 diagnosis evidence

The checkpoint rows were counted by `semantic.verdict` and `handedOff`. Both full runs completed and selected the same 13 docs items. The three checkpoints use OpenAI retrieval and share dataset SHA `5d774be134d5287bb93200f8f0c74d0abd6cf234481f560147ed4536487bdc3c`, model `gpt-6.1-sol` and temperature 0.2. The full runs record digest `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`. The targeted run records `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. Both have 72 articles and 570 passages. Clean excerpts below come from the supplied clean snapshot.

## GS-023 and GS-030

The table describes text surrounding each failed citation token in the final saved draft. Adjacent tokens often follow one shared paraphrased paragraph. The gate requires the full excerpt immediately before its individual token, with whitespace layout tolerated.

| Item | Saved citation | Draft text or gist | Why it failed |
|---|---|---|---|
| 023 | connection 9–13 | 「記下發生時間、網路環境、連線位址和連接埠」 and preserve error screenshot | Condenses preparation guidance, blends in console claim |
| 023 | console 1–22 | 「從面板『控制台』上方點擊複製」 | Inline summary of console procedure |
| Both | connection 23–32 | Open fast-line, infer possible firewall block and try udp with original port | Rephrases procedure and omits source material |
| Both | connection 33–47 | Google DNS heading, IPs, fenced flush command, nslookup and retry | Near-copy with changed punctuation, indentation and text, including omitted 「Windows」 and rephrased verifier. Fence removal alone leaves a mismatch |
| Both | connection 48–54 | Try WARP then retry the same address | Rephrases source. In 030 this is part of a longer WARP synthesis |
| 023 | connection 55–66 | After-sales Discord ticket with WinMTR and error details | Collapses the source paragraph and list into one sentence |
| 023 | automation 228–235 | DiscordSRV sends join/leave and start/stop messages. Console notice alone cannot attribute outage | Condenses event list and adds qualified inference |
| 030 | warp 76–87 | Click Connect with defaults, reopen from tray or Start | Condenses setup and omits images |
| 030 | warp 92–112 | Wait for Connected, retry, play a few minutes and record results | Unadmitted union of admitted 92–101 and 102–112. Also paraphrased |
| 030 | warp 113–125 | Disconnect and recover network if WARP fails or slows things down | Rephrases recovery steps in shared paragraph |
| 030 | warp 129–140, first | Check normal websites, other VPNs and Wi-Fi or network blocking | Condenses troubleshooting and mixes it with recovery steps |
| 030 | connection 67–84 | Bedrock/Hytale/Palworld use udp and correct port, then WARP | Unadmitted union of admitted 67–71, 72–78 and 79–84. Also paraphrased |
| 030 | connection 9–13 | Error screenshot, time, address, port and network | Paraphrased within final report paragraph |
| 030 | connection 55–66 | Supply WinMTR and report tested steps | Paraphrased within final report paragraph |
| 030 | connection 85–98 | WinMTR at time of issue, udp target for non-Java games | Paraphrased within final report paragraph |
| 030 | warp 129–140, second | WARP status, DNS verification and redact screenshots | Paraphrased within final report paragraph |

GS-023 recorded seven `excerpt_mismatch` failures. GS-030 recorded ten `excerpt_mismatch` and two `wrong_lines`. Each had zero matches, `answerCompletenessAttempts=[true]`, `contentCoverage=true`, and an unsuccessful citation repair with unchanged failure reasons. Both primary verdicts were lifecycle wrong. Diagnostic draft judgments were partial with points `[covered, covered, partial]` and `[covered, missing, partial]`, respectively. R16 GS-030 delivered with covered flush, missing auto switching, and partial DNS. R17 again omitted the line-switch point and the faster-update rationale. Clean `debug/automatic-route-switching.md:1-7` and `debug/googledns.md:1-12` supply those details. Neither was admitted for R17 GS-030.

## Offline gate replay

Ran the checked-in TypeScript gate in Node against the last saved drafts with terminal handoff markers removed. Joined admitted labels to the clean snapshot, with saved checkpoint excerpts as fallback for exact labels. Synthetic companion excerpts absent from both inputs were omitted. The omitted labels for GS-018 were mod 59–100, 6–14, 44–58, 101–233 and 27–43. For GS-108 it was server-properties 6–15. For GS-030 it was connection 116–132. None was cited by the corresponding R17 draft. This replays citation evaluation only. Checkpoint fields remain authoritative for final runtime state after draft repairs.

| Replay | Result |
|---|---|
| R17 GS-023 and GS-030, raw and with wrapper stripped | Failed with zero matches in each case |
| Append the exact clean connection 23–32 excerpt immediately before its existing token in each R17 DNS draft | Both pass with one match. Six and eleven residual failures, respectively |
| Add candidate unions of the admitted excerpts for GS-030's two merged labels, with its draft unchanged | Both wrong-line failures become excerpt mismatches. Still zero matches and failed |
| R17 GS-018 and GS-108 through the pre-fix gate from `9756730^` and the current gate | Both versions pass each draft with the same sole match |
| R16 GS-018 / GS-108 raw through current gate | Both fail. One-level wrapper stripping still fails GS-018 and passes GS-108 on nojar 45–50 |

At [citation-gate.ts](../../packages/agent-loop/src/citation-gate.ts), `inspectCitationGate` distinguishes an unknown label from a known source with wrong lines, and requires at least one exact match. Wrong lines and excerpt mismatches are diagnostics once a valid pair grounds the draft, absent another blocking error. The `claimSupport` field adds a first-sentence length check to grounded status. It does not measure entailment. [The agent loop](../../packages/agent-loop/src/index.ts) runs task repair before citation inspection, then checks completeness separately. The fallback unwrap skips wrong-line and unknown-citation cases.

## Other item traces

| Item | R16 | R17 clean or targeted |
|---|---|---|
| GS-018 | Failed on mod 101–183 `excerpt_mismatch`. Repair attempted, failed. Completeness false. Handoff diagnostic correct | One match, mod 101–183, two excerpt mismatches, repair not attempted. Completeness true and delivered partial. Renaming precedes explicit upload connection diagnosis |
| GS-108 | Six failures, zero matches, repair not attempted. nojar 45–50 quote blockwrapped on every line. Completeness true. Handoff diagnostic correct | One match, nojar 45–50, six excerpt mismatches, repair not attempted. Completeness true and delivered correct |
| GS-053 | Initial blockquote repair yielded four matches including retention 6–9, 10–13 and 14–17. Completeness true and delivered partial | Matches retention 10–13 and 14–17. Legal quote mismatch. Completeness true and delivered wrong. Staff-confirmation language now explicitly asks whether the original service or backup remains restorable |
| GS-056 | Matched index 18–19. Raw preserve-only draft differed from the delivered text, which added the world-reset claim. Completeness true, delivered wrong | Same matched backup passage, zero failures. Clean raw and handoff text preserve-only, completeness false. Targeted match settings 1–16, zero failures, completeness true and delivered correct |
| GS-062 | Matched connection 103–109, no duplicate policy or Discord routing admitted. Coverage true, delivered wrong | Matched connection 103–109, five excerpt mismatches including duplicate 6–9. Completeness and coverage false, marker retained, handoff diagnostic all three points missing |

GS-053's clean retention source says suspension at overdue, data on the node during the 7-day payment window, and another 7 days on the backup server after node deletion. Both checkpoints have `referenceConflict.status=uncertain`. The question supplies a missed July payment but no verified age or identity of the original service. The R17 draft reports an untimestamped running service and no July invoice. Neither proves restoration eligibility. A point-level move from missing to partial on the second expected point came with an overall wrong judgment for the new restoration suggestion.

GS-056 clean settings 1–14 identifies the reinstall button and ends after its image. It contains neither an explicit world-reset consequence nor a restart step. The added settings sentence reads 「若已將伺服器資料全部刪除，代表世界已被重置；此時使用『重新安裝伺服器』並重新啟動，即可完成重置並建立全新的世界。」 The targeted draft quotes that passage and states both claims directly. Fix 2 in `repairRequiredTaskDraft` requires source support for restart and for world reset independently. The matched backup quote does not support either. The raw clean draft's 「請先不要再次啟動、重新安裝或覆蓋目前檔案」 fails the positive procedure conditions.

GS-062's original prompt matches the classifier's repeated disconnection and waiting cues. R17 admits duplicate-tickets 6–9, 10–13 and 14–17, with no store/discord passage. The focused search code uses a shared limit of three and selects routing and duplicate policy independently from the returned list before companion retrieval. The checkpoint records admission, so three admitted policy spans do not independently establish the exact focused response ranking. Duplicate 6–9 says repeat tickets do not speed handling, 10–13 says wait for technicians, and 14–17 already names the after-sales category. Discord 6–43 documents linking and the role required to open it. The saved 「請在現有工單裡補充」 gist (Simplified in the checkpoint) conveys where to add details, without stating the no-speedup rule. `requiredTaskCoverage` checks duplicate words once the duplicate source is present. The separate routing-keyword branch runs only when store/discord is admitted, so its keyword test did not cause this handoff. The condition for delivery already failed on completeness even before considering the explicit handoff marker.
