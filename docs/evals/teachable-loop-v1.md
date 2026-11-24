# Teachable loop v1

## Status and corpus

Implementation is blocked by missing Discord configuration for the Coffee-Host management group. The owner authorized that specific channel on 2026-11-24. The repository has an example test-ticket configuration and an optional test audit destination. The test launcher loads its Discord client from a separately supplied ticket-bot deployment. The repository, local runtime settings, project handover, and adjacent PteroAI checkout supply no management-group channel ID or approved bot installation for this integration. [Test configuration](../../.env.ticket-support.example) · [Shadow launcher](../../scripts/run-ticket-support.ts) · [Capability audit](pteroai-capability-audit.md)

The clean working tree on `feat/teachable-loop-v1` started at `7a9fcf7`, the same commit as `main`. The chosen starting corpus for both phases is **FIX-4**. The Markdown loader found 72 articles and 570 passages. The loaded Markdown, indexed passages, and index metadata all match `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. The index uses `text-embedding-3-small`. [FIX-4 corpus record](kb-rerun25.md#corpus)

## Required Discord configuration

| Setting | Required value |
| --- | --- |
| Destination | The real Coffee-Host Discord guild ID and private management-group channel ID, or a Discord channel link containing both. |
| Owner | The Discord user ID of the owner who can approve or decline each KB proposal. |
| Admins | The Discord admin role ID to mention for escalations and the role or user IDs authorized to teach and answer. The bot needs to be able to mention the designated role in the management channel. |
| Bot | An approved Discord application and bot installation in that guild using the `bot` OAuth2 scope. Supply the bot token through a deployment secret or identify the approved deployment that already provides it. |
| Gateway intents | `GUILDS`, `GUILD_MESSAGES`, and `MESSAGE_CONTENT` for staff messages and explicit replies. Enable the privileged Message Content Intent for the application. |
| Channel permissions | Grant the bot `View Channel`, `Read Message History`, and `Send Messages` in the management channel. Keep the channel staff-only and scope the integration to that guild and channel. |

The proposed approval mechanism uses a native Discord reply to the bot's proposal with `approve <proposal-id>` or `decline <proposal-id>`. This requires ordinary text and reply access. Channel type, bot permissions, mention behavior, and the owner account still need verification in the actual guild.

## Proposed teaching and relay flow

1. The management adapter authenticates the sender from the Discord event and accepts an explicit standing-policy teaching from an authorized admin. The agent calls a Support Core proposal tool. The preview identifies the article and section, shows the exact before/after diff, and includes the teacher, timestamp, and exact teaching message.
2. Support Core binds approval to the owner's Discord user ID, the proposal message, and the exact proposed version. Approval is single-use. A pending or declined proposal has no effect on the KB, semantic index, or active teaching memory. A stale article version requires a fresh preview and approval.
3. On approval, Core keeps the previous article version, rebuilds the semantic index with official OpenAI embeddings, and records the applied teaching in a private, durable file store. Publication needs a consistent Markdown/index version even if rebuilding fails. A revert follows the same approval flow. Later tickets retrieve the approved policy through Core and can cite its teaching date. The store needs to survive a restart.
4. The write tool accepts only reviewed Markdown sections under the configured KB root. Proposal generation receives the authenticated policy teaching and relevant KB sections. Customer transcripts, ticket-specific admin replies, golden references, and eval artifacts are ineligible as teaching sources. The write path must reject destinations outside the KB root, including symlink escapes.
5. For an escalation, the adapter posts a scoped question and mentions the designated admin role. The agent polishes the authenticated reply into a staff review draft. A durable record links the question, admin answer, draft, and staff-recorded ticket outcome. Draft review ends in the staff-only workflow. [Existing shadow review](../testing-ticket-shadow.md)

Live relay would require separate owner authorization, verified ticket and recipient binding, current ticket revision and takeover checks at delivery, staff approval of the customer reply, and delivery receipts. [Ticket integration acceptance criteria](../integrations/ticket-bot.md#驗收證據)

## Teaching cases and measurements

All paired measurements are pending. The owner-approved policies below are already present in FIX-4. Each measured comparison needs a baseline on that corpus and a follow-up after the owner approves an actual policy change through the management channel.

| Case | Owner input on record | Pending policy | Before | After |
| --- | --- | --- | --- | --- |
| Retention · GS-049 / GS-053 | An older owner ruling on nonpayment is documented. The 14- and 17-day figures have different reported contexts. | Reconcile the durations and confirm voluntary cancellation and nonpayment separately, including reuse and restoration eligibility. | Pending | Pending |
| SFTP · GS-166 | The web panel limit is 100 MB. The KB directs larger files and folders to SFTP. | Confirm destinations by file type and any separate thresholds. | Pending | Pending |
| Conventions · section 5 | The owner approved the duplicate-ticket and after-sales routing policy, which covers GS-140. | The five other candidates await approval for promotion. They cover transient retries, provider or complex escalations, boundaries on non-covered work, observation after changes, and backup, activation, billing, and refund guidance. | Pending | Pending |
| KB answers · GS-041 / GS-096 / GS-138 | Docker image switching is self-service when available. Test-server details come from Discord announcements. Velocity is allowed subject to the terms of service, with no guarantee for backend connectivity. | GS-041 needs the locked-field procedure and a ruling on the Java diagnosis. GS-096 needs adjudication of historical address, version, and plan expectations against the announcement policy. GS-138 needs adjudication of the historical network-handling rationale. | Pending | Pending |

Policy sources are the owner decisions recorded in the project handover and their articles in the local FIX-4 corpus. [Retention and upload](kb-conventions-report.md#3-contradictions-and-outdated-answers) · [Convention candidates](kb-conventions-report.md#5-conventions-versus-procedures) · [Deferred decisions](kb-rerun25-diagnosis.md#deferred-owner-decisions) · [GS-041 / GS-096 / GS-138](kb-rerun9-diagnosis.md)

Archived reference verdicts were GS-049, GS-053, and GS-166 wrong with handoff and GS-140 correct in rerun 25 on the clean corpus. Earlier runs scored GS-041 wrong with handoff, GS-096 wrong after delivery, and GS-138 partial after delivery. Those runs used different corpus or model settings from this comparison. [Rerun 25](kb-rerun25.md) · [GS-041 and GS-138](gs041-downgrade-inference-rerun.md#results) · [GS-096](golden-set-step12-kb-rerun-10.md)

The evaluation setup supplied by the owner uses `GOLDEN_LIVE_MODEL=1`, `EMBEDDING_PROVIDER=openai`, `EMBEDDING_MODEL=text-embedding-3-small`, and `KB_INDEX_PATH=.kb-index/passages.json`. The prescribed protected key file at `~/.config/support-ai-agent/openai-api-key` and the `~/workspace/run-with-sub2api-key.sh` runner are available locally. The paired run uses Luna max, the existing 60-second limit, and the `gpt-6.1-sol` judge. Record the verdict and handoff for each affected golden ID along with both passage digests, and use the harness retries for transient failures.
