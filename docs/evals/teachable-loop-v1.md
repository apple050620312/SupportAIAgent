# Teachable loop v1

## Implementation

Support Core now accepts explicit standing-policy teachings from the configured owner and authorized management staff. It proposes an edit to one reviewed Markdown section and records the article, the section, the exact before and after text, the teaching message, the teacher and the timestamp. The adapter posts the preview, then binds the Discord message and exact proposal version before enabling the decision buttons. Only the configured owner can decide. Core consumes the approval once and requires a fresh proposal when the article version has changed. A revert is a new proposal for the previous reviewed text. [Teaching service](../../apps/support-core/src/services/teaching-service.ts)

Core keeps the configured KB root as the seed. On approval it builds an immutable release below `.teachable/releases/` that contains the full Markdown snapshot, the exact previous article and a semantic index. The rebuild uses official OpenAI embeddings for new inputs and reuses verified vectors for identical inputs. One atomic journal entry activates the Markdown and index together and records the teaching. Pending and declined proposals leave the published data and applied memory unchanged. A failed rebuild leaves the prior release available. The shadow runner reads the latest release through Core, and search and read results carry the original teaching date for the approved section. The teaching journal and previous versions survive a process restart. [Publication adapter](../../apps/support-core/src/adapters/file-teaching-corpus.ts) · [Shadow launcher](../../scripts/run-ticket-support.ts)

Proposal input is restricted to reviewed sections under `SUPPORT_KNOWLEDGE_ROOT`. The tool accepts the reviewed header `> Review: approved` and the existing owner-authored review metadata. It rejects traversal and symlink escapes, draft sections, customer transcripts, ticket-specific replies, golden references and eval sources. The management adapter rejects replies, forwards, bot messages and attachments as teachings. The trusted Discord event supplies provenance and actor context. The agent supplies the proposed edit. [Teaching policy](../../apps/support-core/src/domain/teaching-policy.ts) · [Section guard](../../apps/support-core/src/domain/teaching-section.ts)

The management adapter accepts `教學：<standing policy>` and `還原 <proposal-id>：<reason>` from authorized staff. It renders proposals as Discord Components V2 Containers with the teacher and time, teaching text, fenced diff, subtext, and **批准** and **拒絕** buttons. The decision edits the original message, disables both actions and shows the outcome with a new accent color. The preview shows the changed hunk within 4,000 combined Text Display characters. When it truncates the diff or teaching, the staff message attaches the full diff and exact teaching text. Optional GitHub links use `TEACHING_GITHUB_ARTICLE_BASE_URL` and `TEACHING_GITHUB_DIFF_URL_TEMPLATE`, with `{proposalId}` in the diff template. [Payload builders](../../scripts/lib/discord-management-payloads.ts) · [Discord adapter](../../scripts/lib/discord-management.ts)

The draft-only relay accepts a trusted ticket scope and a question. It posts the question to the management channel with an admin-role mention. **回答** opens a Label and Text Input modal for an authorized staff member. Core persists the answer, the polished review draft and the outcome entered by staff with `結果 <relay-id>：<outcome>`. The relay has a staff-review destination and no customer delivery port. [Relay service](../../apps/support-core/src/services/relay-service.ts) · [Discord setup](../../scripts/lib/discord-management-setup.ts) · [Shadow review](../testing-ticket-shadow.md)

## Verification

- `pnpm build`, `pnpm typecheck` and `pnpm lint` passed.
- `pnpm test` passed 434 script tests and 60 Support Core tests. The new cases cover wrong actor, wrong message and version, repeat and concurrent approval, staleness, rollback through approval, failed rebuild, symlink and source rejection, and retrieval dates after restart.
- `pnpm run eval:mock` passed 76 tests.
- Four offline Discord tests covered flag 32768, Containers, Buttons and the Label modal, combined Text Display budget and truncation, GitHub links, custom IDs within 100 characters, omission of legacy message fields, bound decisions and terminal edits, and durable relay records. Three launcher tests covered configuration validation before login, gateway intents and handler registration, and cleanup after a failed login. The tests used simulated events and login. [Discord tests](../../scripts/test/discord-management.test.ts)

## Paired measurements

The baseline was **FIX-4** with 72 articles, 570 passages and digest `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. The replay harness copied that verified corpus to a private temporary directory and proposed, bound and approved all four edits through Core using generated test identities. Each edit restated a ruling already on record. The cumulative follow-up had 72 articles, 570 passages and digest `21bb482b773ae65ede0a348330bc336797d25b14744fd4e795fb14c33ed2c2f4`. Every measured golden item ran once against each corpus. This is a paired observation with four combined edits and one sample per phase. [FIX-4 corpus record](kb-rerun25.md#corpus) · [Replay harness](../../scripts/apply-teaching-eval.ts)

Both runs used `GOLDEN_LIVE_MODEL=1`, `gpt-6-luna` with max reasoning, the existing 60-second answer limit and the `gpt-6.1-sol` semantic judge. Retrieval used official OpenAI `text-embedding-3-small`. The baseline read the FIX-4 seed index at `.kb-index/passages.json`. The follow-up read the index and Markdown published by Core. All eight item runs completed on their first attempt. The private checkpoints `eval-results/golden-2026-11-24T19-15-14-731Z-4.json` and `eval-results/golden-2026-11-24T19-21-30-747Z-4.json` match the reported corpus digests, verdicts, handoffs and attempt counts. [Golden evaluator](../../scripts/eval-golden.ts)

| Item | Recorded ruling replayed | Before | After | Observed delta |
| --- | --- | --- | --- | --- |
| GS-140 | Duplicate tickets do not speed up handling. Wait in the existing ticket and route product issues to after-sales. | Correct · delivered | Wrong · handoff | The follow-up draft was judged correct, with a passing citation gate. The handoff marker was retained. |
| GS-041 | Customers can switch the Docker image themselves when the panel offers the option. | Wrong · handoff | Wrong · handoff | The locked-field procedure and historical Java diagnosis remain open. |
| GS-096 | The Discord test-server announcement controls the current address and rules. | Wrong · handoff | Wrong · handoff | The judge continued to require historical details beyond the recorded ruling. |
| GS-138 | Velocity is permitted under the terms. Self-hosted Paper backends are allowed and backend connection quality is unguaranteed. | Wrong · handoff | Partial · delivered | The delivered answer covered the current policy. The historical network rationale remains open. |

Handoffs were 3 of 4 in both runs. The primary verdicts moved from 1 correct and 3 wrong to 1 partial and 3 wrong. Retention for GS-049 and GS-053 (14 vs 17 days), SFTP destinations and any separate thresholds for GS-166, and the five other section 5 convention candidates await owner teachings. The unresolved parts of the three partial rulings also await the owner. [Convention candidates](kb-conventions-report.md#5-conventions-versus-procedures) · [Earlier diagnosis](kb-rerun9-diagnosis.md#未決事項)

## Remaining Discord activation

| Setting | Required value |
| --- | --- |
| Destination | `TEACHING_DISCORD_GUILD_ID` and `TEACHING_DISCORD_CHANNEL_ID` for the staff-only Coffee-Host management text channel. |
| Owner | `TEACHING_OWNER_USER_ID` for the account that approves and declines proposals. |
| Admins | `TEACHING_DISCORD_ADMIN_ROLE_ID` authorizes and mentions the admin role. Optional `TEACHING_DISCORD_STAFF_USER_IDS` and `TEACHING_DISCORD_STAFF_ROLE_IDS` accept comma-separated IDs for additional staff. |
| Bot | Approved Discord application and guild installation with the `bot` OAuth2 scope. Provide `TEACHING_DISCORD_BOT_TOKEN` through a deployment secret or identify the approved deployment. |
| Gateway intents | `Guilds`, `GuildMessages` and `MessageContent`. Enable the privileged Message Content Intent on the approved application. |
| Channel permissions | View Channel, Read Message History, Send Messages and Attach Files for full previews. Make the designated admin role mentionable by the bot in the management channel. |

The owner's Discord configuration is the remaining activation blocker. With these settings in the deployment environment, run `pnpm start:discord-management` using the existing model and official embeddings settings. Use the same `SUPPORT_KNOWLEDGE_ROOT` and `KB_INDEX_PATH` as Support Core so later tickets can read published teachings. The trusted ticket host can call `escalate` from the management composition to post a staff review question. [Management launcher](../../scripts/run-discord-management.ts) · [Management composition](../../scripts/lib/discord-management-setup.ts)

Run the one-time render and interaction check in the staff-only channel. Verify `##` headings, `-#` subtext, bulleted lists and fenced diffs, then check owner approval and decline on separate proposals and confirm both buttons disable after each decision. Check the admin mention, answer modal and staff draft using a test escalation. The live check is pending the owner's configuration. [Ticket delivery acceptance criteria](../integrations/ticket-bot.md#驗收證據)
