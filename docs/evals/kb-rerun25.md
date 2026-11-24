# Golden set docs rerun 25

Rerun 25 scored **5 correct, 0 partial, 7 wrong and 1 unscored** on the 13 clean items. Five correct cited deliveries reached the interim 4/13 threshold. The unscored row missed the diagnosis's zero-unscored criterion. Rerun 24 scored 2 correct, 2 partial, 9 wrong and 0 unscored. [Rerun 24](kb-rerun24.md) · [Rerun 24 diagnosis](kb-rerun24-diagnosis.md)

The scheduled revision was `1d237f9` on `feat/rerun25-fixes`, based on main `b8d9cab`. The serial runner requested Fast and `gpt-6-luna` at max effort, with medium pinned for GS-030 and two separate max controls for that item. Review requested `gpt-6.1-sol` at low effort with a 900-token cap. Semantic judging requested `gpt-6.1-sol` under `step10-v1`. Each answer attempt had a 60-second maximum including review and delivery. Ticket lifecycle and account reads were synthetic. A runtime restart interrupted durability sample 3. The resume used the saved clean run, two max and two trigger-off controls, all of sample 2 and the first three rows of sample 3. [Run configuration](../../scripts/eval-golden.ts) · [Turn deadline](../../packages/agent-loop/src/deadline.ts)

## Corpus

The working settings article was copied to `~/workspace/fix4-settings.md` and checked for 「世界已被重置」. The clean copy from `~/workspace/clean-settings.md` was restored, checked for the absence of that sentence, and rebuilt with official OpenAI `text-embedding-3-small` embeddings. The corpus and active index matched the clean digest before each clean launch. After the clean controls, the backup was restored and the fix-4 index rebuilt and verified before targeted GS-056.

| Corpus | Articles / passages | Digest |
|---|---:|---|
| Clean full run and controls | 72 / 570 | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |
| Fix 4, targeted GS-056 | 72 / 570 | `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a` |

## Clean results

| Run | Scheduled | Scored | Correct | Partial | Wrong | Unscored | Scored handoffs |
|---|---:|---:|---:|---:|---:|---:|---:|
| Rerun 24 | 13 | 13 | 2 | 2 | 9 | 0 | 9 |
| Rerun 25 | 13 | 12 | 5 | 0 | 7 | 1 | 7 |

All 13 items are classified docs-answerable. Correct cited deliveries accounted for 38.5% of the scheduled set. The strict lexical diagnostic credited 0/13, and the seven-day resolution metric was unset. The clean harness took 552.5 seconds including judging. It saved all 13 rows and the final score summary, with status `running` and exit code 1 because one row was unscored. All five correct replies delivered on the first attempt with a passing citation gate. [Scoring](../../scripts/lib/semantic-judge.ts) · [Checkpoint status](../../scripts/eval-golden.ts)

| Item | Rerun 24 | Rerun 25 | Rerun 25 evidence |
|---|---|---|---|
| GS-018 | Wrong / handoff | Unscored | Both upload guides and the mod fallback were admitted. Two drafts reached their cutoff. The third draft returned and review reached its cutoff. |
| GS-023 | Wrong / handoff | Correct | Delivered the cited DNS setup, flush, resolver check, Minecraft reopen and original-address retry conditional on DNS being the sole cause. |
| GS-030 | Correct | Wrong / handoff | The medium draft introduced running Command Prompt as administrator, which the cited procedure did not supply. |
| GS-049 | Partial | Wrong / handoff | Review wanted an explicit request for staff to verify retention, restoration or reuse eligibility. The owner ruling remains deferred. |
| GS-053 | Wrong / handoff | Wrong / handoff | Review rejected the assertion of suspension after nonpayment as phrased against the cited policy. |
| GS-056 | Wrong / handoff | Wrong / handoff | Review accepted the cited backup statement. Local completeness withheld delivery because the reply left the reset outcome unresolved. The handoff deferred recovery eligibility. |
| GS-062 | Wrong / handoff | Correct | Gave the issue-specific after-sales versus general-support distinction, Discord prerequisite, basic reporting details and same-ticket wait advice. |
| GS-084 | Correct | Correct | Delivered the cited panel password reset and navigation path. |
| GS-094 | Wrong / handoff | Correct | Gave the cited Startup version and Settings → Reinstall sequence. |
| GS-108 | Wrong / handoff | Wrong / handoff | The lost auto-installed core procedure was admitted and the draft used conditional branches. Review found that the post-reinstall branch lacked the specific startup-parameter checks. |
| GS-140 | Wrong / handoff | Correct | On the first attempt, cited both policy articles, explicitly asked the customer to wait for technical staff in the existing ticket and assigned the installer and index checks to staff. |
| GS-163 | Wrong / handoff | Wrong / handoff | The first-purchase activation notice was grounded. Review found that the initial setup procedure still omitted clicking Reset Password. |
| GS-166 | Partial | Wrong / handoff | Review found the third-party sign-in password-change path missing. The size cutoff and file destinations remain deferred. |

Two early launches informed the final edits. The first stopped after three rows. GS-018 retrieved the panel-upload guide from the focused SFTP search, which the admission code only consulted for the SFTP article. The DNS drafts also showed an omitted faster-update rationale and a version of it that left out the comparison to some ISP resolvers. The second launch stopped after five rows. Both DNS cases scored correct and the panel-upload guide was admitted. The 800-character SFTP excerpt ended before the sign-in instructions, so the final revision reuses the full validated Support Core read for that cited span. The scheduled counts start at the final revision. [Procedure admission and repair](../../packages/agent-loop/src/index.ts)

## Verification and timeouts

| Group | Attempts | Draft timeouts | Review timeouts | Total timeout attempts | Unscored rows with a timeout | Verifier HTTP 400s |
|---|---:|---:|---:|---:|---:|---:|
| Rerun 24 clean | 15 | 0 | 2 | 2 | 0 | 0 |
| Rerun 24 scheduled total | 59 | 6 | 6 | 12 | 1 | 0 |
| Rerun 25 clean | 15 | 2 | 1 | 3 | 1 | 0 |
| Durability repeats | 32 | 1 | 7 | 8 | 0 | 0 |
| Clean and durability | 47 | 3 | 8 | 11 | 1 | 0 |
| GS-140 trigger off | 3 | 0 | 1 | 1 | 0 | 0 |
| GS-030 max control | 3 | 0 | 1 | 1 | 0 | 0 |
| Fix-4 GS-056 | 5 | 0 | 0 | 0 | 0 | 0 |
| Rerun 25 scheduled total | 58 | 3 | 10 | 13 | 1 | 0 |

GS-018 accounted for all three clean cutoffs and three more in samples 2–3. The clean row exhausted its attempts and remained unscored after a Core handoff. The durability repeats also had three review cutoffs on GS-140 and two on medium GS-030. All three trigger-on GS-140 cutoffs reached the 24 s review cap. GS-018's clean review used a shorter remaining window after a 42.8 s draft. The traces measure elapsed client time. Provider queue and inference times remain unknown. [Stage limits](../../packages/agent-loop/src/deadline.ts) · [Retry and trace recording](../../scripts/eval-golden.ts)

## Gate replay and paraphrases

| Control | Final replay |
|---|---|
| Version paraphrase | Passed, including version selection and Settings → Reinstall |
| Transfer paraphrase | `incomplete_answer` for omitting a direct answer on whether to compress the folder |
| Transfer paraphrase with explicit compression guidance | Passed after adding that the documented direct folder upload through SFTP needs no prior compression |
| First-purchase activation notice | Passed with the repaired notice and the password-reset step |
| Reversed panel and SFTP guidance | `unsupported_claim` for reversing the transfer advice |
| Purported full-span excerpt omitted the reinstall step | `incomplete_answer` for missing Settings → Reinstall |
| Unadmitted upload range | `wrong_lines` before review |
| Unsupported restoration guarantee | `unsupported_claim` for guaranteeing recovery |
| Missing required procedure point | `incomplete_answer` for missing Settings → Reinstall |

The gate rejected all five negative controls for their intended reasons. The extra transfer replay changed only the compression answer and used the same cited spans. The original eight controls and that supplemental replay made eight verifier calls with zero timeouts and zero HTTP 400s. All eight responses reported `gpt-6.2-sol`. [Citation gate](../../packages/agent-loop/src/citation-gate.ts) · [Draft verifier](../../packages/agent-loop/src/draft-verifier.ts)

## GS-140 trigger

All eight trigger-on attempts admitted both `store/discord.md` and `store/services/duplicate-tickets.md`. Neither article was admitted on the three off attempts. The table gives the first draft call time for each attempt, including provider wait.

| Sample | Searches / reads per attempt | Spans | Prompt bytes | First draft calls (s) | Outcome |
|---|---|---:|---:|---|---|
| On, clean | 3 / 2 | 3 | 4,313 | 10.6 | Correct on attempt one |
| On, sample 2 | 3 / 2 | 3 | 4,313 | 16.3 | Correct on attempt one |
| On, sample 3 | 3 / 2 | 3 | 4,313 | 17.2 / 12.2 / 10.2 | Correct on attempt three after two review cutoffs |
| On, sample 4 | 3 / 2 | 3 | 4,313 | 9.8 / 18.6 | Correct on attempt two after a review cutoff |
| On, sample 5 | 3 / 2 | 3 | 4,313 | 13.2 | Correct on attempt one |
| Off, control 1 | 1 / 3 | 12 | 7,826 | 25.0 | Wrong / handoff |
| Off, control 2 | 1 / 3 | 12 | 7,826 | 32.2 / 23.5 | Wrong / handoff after a review cutoff |

All five trigger-on deliveries told the customer to use after-sales support, wait for technical staff in the existing ticket and expect no speedup from duplicate tickets. They assigned installer and index checks to staff. The trigger-on cohort reached **5/5 correct and 3/5 on the first attempt**, short of the five-first-attempt criterion. Both off reviews found the routing, same-ticket wait and duplicate-ticket advice missing. Two off controls and unequal evidence sets limit the latency comparison. The mock request for live installer state reaches `HUMAN_NEEDED` with a passing citation gate. [Installer-state control](../../scripts/test/vercel-agent.test.ts#L541)

## Fast route

The pinned Luna max probe sent `fast` at 13:54:01.164 UTC and returned HTTP 200 with `default` in 2.075 s. Its returned `x-client-request-id` was `a8bb0aa4-5e71-4011-8577-325ef05e84b6` and its `x-request-id` was `8a412ad2-929a-4c3e-b318-8fcbed65d1ae`. The local gateway's service and middleware tests passed. That source normalizes `fast` to `priority` and applies account-scoped policy. The probe left the deployed rule, account selection and upstream request and response tiers unverified. **Fast remains unconfirmed**, so the concurrency benchmark was skipped. All 55 scheduled draft responses with tier metadata returned `default`. Three draft calls ended without tier metadata.

## GS-030 effort experiment

The medium pin and the two max controls used the clean index, identical recorded prompt hashes, 4,637-byte prompts, four read windows, the same three admitted spans and a 3,072-token cap. All ten draft calls returned Luna at the requested effort and `default` tier.

| Pinned effort | First draft calls (s) | Median first draft (s) | First-call reasoning / text tokens | Correct on first attempt | Correct overall | Scored handoffs | Review timeouts |
|---|---|---:|---|---:|---:|---:|---:|
| Medium | 4.718 / 4.955 / 6.435 / 5.744 / 4.146 | 4.955 | 0 / 195–260 | 2/5 | 3/5 | 2 | 2 |
| Max | 9.253 / 17.104 | 13.179 | 262–830 / 272–299 | 0/2 | 1/2 | 1 | 1 |

Both arms had zero draft timeouts. Medium drafted faster on the observed calls, and the first-attempt delivery and timeout comparisons have small, unequal samples across a restart. Medium's two handoffs included an unsupported administrator requirement and an unsupported escalation. One max control delivered on retry after a review cutoff. Review returned a malformed citation reference on the other. The two saved max controls ran before the four medium repeats, and the upstream account remains unknown. R24 recorded 3/5 first-attempt deliveries in each arm with zero cutoffs. [Effort pin](../../scripts/eval-golden.ts) · [R24 effort experiment](kb-rerun24.md#gs-030-effort-experiment)

## Durability

The clean run is sample one. Each cell gives the outcome and the number of attempts. Correct deliveries passed the citation gate and had matched evidence.

| Item | Full | Sample 2 | Sample 3 | Sample 4 | Sample 5 | R25 correct | R24 correct |
|---|---|---|---|---|---|---:|---:|
| GS-018 | Unscored (3) | Handoff (3) | Handoff (2) | Handoff (1) | Handoff (1) | 0/5 | 0/5 |
| GS-023 | Correct (1) | Handoff (1) | Correct (1) | Correct (1) | Correct (1) | 4/5 | 2/5 |
| GS-030 | Handoff (1) | Correct (1) | Correct (2) | Handoff (2) | Correct (1) | 3/5 | 3/5 |
| GS-062 | Correct (1) | Correct (1) | Correct (1) | Correct (1) | Handoff (1) | 4/5 | 0/5 |
| GS-094 | Correct (1) | Correct (1) | Correct (1) | Correct (1) | Correct (1) | 5/5 | 4/5 |
| GS-140 | Correct (1) | Correct (1) | Correct (3) | Correct (2) | Correct (1) | 5/5 | 1/5 |

The 24 repeat rows yielded 17 correct and seven scored handoffs. GS-094 met the 5/5 durability target among the five items measured against it. The four scored GS-018 repeats all reached a review verdict that flagged the missing instruction to upload the JAR in the SFTP client after connecting. The GS-023 miss skipped the wait and retry before escalating to DNS troubleshooting. GS-062 included the issue-specific after-sales distinction in all four correct deliveries. Review withheld sample 5 because the reporting branch omitted a complete WinMTR screenshot. [R24 durability](kb-rerun24.md#durability)

## GS-023 blind rescore

In R25 all five saved R21 answers scored partial. R24 scored three correct and two partial on the same texts. Both reruns credited cache flush and Google DNS on all five. The R24–R25 differences are on the expected result of the conditional rejoin.

| Saved answer in replay order | R24 rejoin point | R25 rejoin point |
|---|---|---|
| 1 | Covered | Partial |
| 2 | Partial | Partial |
| 3 | Partial | Partial |
| 4 | Covered | Partial |
| 5 | Covered | Partial |

All five rescoring calls requested `gpt-6.1-sol` under `step10-v1` and returned `gpt-6.2-sol` on the first attempt. The fixed-text comparison records judge variation. The R24 records lack per-call judge route metadata. [R24 blind rescore](kb-rerun24.md#gs-023-blind-rescore)

## Reviewer and judge routes

All 12 completed clean reviews and all 12 clean judge calls requested `gpt-6.1-sol` and returned `gpt-6.2-sol`. The clean judge traces include five delivered-answer scores and seven handoff-draft diagnostics. The clean GS-023 review passed and its delivered answer scored all three points covered. Both calls returned `default`.

| GS-023 call, UTC | Requested → returned model and effort | Sent `x-client-request-id` | Returned `x-client-request-id` | Response `x-request-id` |
|---|---|---|---|---|
| Review, 13:20:05.214 | `6.1-sol` low → `6.2-sol` low | `16d4a1ab-a8cc-4553-b9d2-2b417ddcf50c` | `1bdd335d-b894-4c3b-8367-33400a497428` | `84900a3c-c82f-4b24-a9f7-e2ee75d539df` |
| Judge, 13:20:19.690 | `6.1-sol` unset → `6.2-sol` medium | `cc2c3a15-17c9-4954-bfca-13b4dd51ad4d` | `af7e6600-bf80-49cb-a0d3-135a85f89323` | `107c4db6-cc57-447f-a7e0-ca4bd0e39bf0` |

Across the schedule, all 45 completed reviews and all 45 judge calls showed the same model labels. The other ten reviews timed out before returning model metadata. The local gateway source at `01629d7ff` applies channel mapping before account selection, resolves the upstream model at forwarding and can restore the public model label in a mapped response. Usage records support correlation by gateway and upstream request IDs. The gateway owner's records for the IDs above are needed to identify the deployed revision, effective mapping, selected account, forwarded model and tier, and upstream response and serving records. Gateway or upstream substitution is consistent with the client-visible mismatch. Its location and the actual serving model remain unverified. [Verifier construction](../../packages/agent-loop/src/model.ts) · [Judge request](../../scripts/lib/semantic-judge.ts) · [R24 raw gateway probes](kb-rerun24-diagnosis-evidence.md#model-route-and-fast)

## Pending policy

Owner decisions remain deferred for voluntary-cancellation retention and reuse (GS-049), nonpayment retention and restoration eligibility (GS-053), SFTP upload thresholds and file-type destinations (GS-166), and section 5 of the conventions report. [Conventions report](kb-conventions-report.md#5-conventions-versus-procedures)

## Fix-4 corpus check

On the restored corpus, **3/5 runs delivered correctly**, one delivered a partial answer, and one ended in a scored handoff. R24 reached 5/5. All four R25 deliveries cited `panel/common/settings.md:1-16`, limited the reset statement to deletion of all data, and gave reinstall followed by restart. The location of the reinstall action was implicit in all four replies. The judge marked the procedure point partial only in sample 2 and cited the missing Settings navigation. Review withheld sample 4 because the draft broadened the reset condition to deletion of server data in general.

| Sample | Attempts | Timeout stages | Final draft / review (s) | Verdict |
|---|---:|---|---|---|
| 1 | 1 | None | 16.4 / 2.7 | Correct |
| 2 | 1 | None | 13.4 / 3.4 | Partial, Settings navigation |
| 3 | 1 | None | 15.3 / 2.8 | Correct |
| 4 | 1 | None | 11.4 / 8.8 | Wrong / handoff, unsupported reset scope |
| 5 | 1 | None | 9.2 / 3.1 | Correct |

The working settings article and active index are at fix 4.

## Attribution

R24 and R25 used the same golden-set, answerability manifest and clean corpus digests. R25 changed drafting guidance, passage admission, repair instructions and reviewer guidance. Correct GS-062 replies gave the issue-specific routing distinction. The focused GS-140 path retained three policy spans and the delivered replies cited policy guidance. GS-018 and GS-108 gained applicable admissions. Their clean outcomes ended at cutoffs and a procedure omission respectively. The individual effects of the changes remain unresolved. [Draft and admission changes](../../packages/agent-loop/src/index.ts) · [R24 diagnosis](kb-rerun24-diagnosis.md)

All seven scored wrong clean rows were lifecycle handoffs. Diagnostic judging of the withheld drafts gave three correct (GS-030, GS-108 and GS-163), one partial and three wrong. The gate and local completeness checks evaluate grounding and the applicable procedure before delivery. The independent judge scores against historical reference points. The GS-023 rescore records variation under the same rubric, and upstream route attribution remains open.

## Saved evidence

The local `eval-results/rerun25/` directory holds `full-clean.json`, `full-manifest.json`, `paired-manifest.json` for the two saved max and trigger-off controls, and `durability-manifest.json` for samples 2–5. The replay, rescore and Fast evidence is in `gate-replay.json`, `gate-replay-transfer.json`, `gs023-blind-rescore.json`, `fast-route.json`, `routes.md`, `routing-source.md` and `gateway-source-tests.log`. The corpus records are `clean-index-verified.json`, `clean-index-resume-verified.json` and `fix4-index-verified.json`. `fix4-manifest.json` lists all five targeted GS-056 checkpoints.
