# PteroAI capability audit

Scope and sources — PteroAI live clone at 79b07f0, SupportAIAgent main at fc2fd8c, and [docs/evals/pteroai-capability-audit-evidence.md](pteroai-capability-audit-evidence.md).
Method — static source audit with targeted code checks. No bot, model, or provider invoked.
Verification — [pteroai.md](../integrations/pteroai.md) is mostly confirmed. Its supersession claims describe the old OpenClaw prototype. Current shadow composes a Vercel runner with private draft review.
The file/startup “currently absent” description overstates the code gap. Core has scoped read ports and T2 mutation scaffolding.
PteroAI’s WHMCS identity, product selection, and external-ID mapping flow is dead behind the hybrid command’s immediate return.

## Capability comparison

Counts in parentheses refer to individual inventory capabilities. Each group assigns one verdict to all its members. 已取代 means equivalent support capability is present in code. 部分取代 means usable behavior covers part of the group’s purpose or an actual Core path exists but is unavailable to shadow. 未取代 means the end-user operation has no complete equivalent path, even if building blocks exist.

| Capability | PteroAI status | SupportAIAgent status | Verdict |
| --- | --- | --- | --- |
| Discord lifecycle and command error reporting (2) | Enabled | Test-ticket launcher waits for readiness, attaches ticket events and reports failures. Generic command registration and fallback replies are outside the support launcher. | 部分取代 |
| Minecraft and MTR staff context menus (2) | Enabled | Menus only return a paused notice in PteroAI. Shadow uses private review threads. The disabled analysis bodies are counted separately. | 有意不取代 |
| General ticket buying guide (1) | Enabled | KB can answer a purchase question in a shadow draft. No automatic guide on creation. | 部分取代 |
| Ticket mention warning (1) | Enabled | No equivalent warning in the support runner. Any replacement belongs to Discord moderation. | 有意不取代 |
| After-sales keyword replies, cooldown and deletion cleanup (2) | Enabled | KB covers common questions and bridge handles lifecycle. No keyword responder or corresponding cooldown. | 部分取代 |
| Ticket metadata, problem menu and dispatch (2) | Enabled | Bridge uses authoritative ticket records and current state. Shadow lacks the three-choice dispatcher and trusted service selection. | 部分取代 |
| UUID lookup, server details and node lookup (2) | Enabled | Core resolves an owned service to a server. Shadow lacks trusted selection and does not expose node-name posting. | 部分取代 |
| Installation recovery suspend and unsuspend (2) | Enabled | T2 schemas and dispatch exist for both. No verified recovery workflow. | 未取代 |
| Startup diagnosis and console capture (2) | Enabled | Status and redacted log tools are declared, but unavailable in shadow. No equivalent live console capture and diagnosis. | 部分取代 |
| Custom problem modal and AI disclaimer controls (2) | Enabled | Free-text ticket input and private staff review exist. No paired actor-bound intake and consent flow. | 部分取代 |
| Per-server AI activity tracking (1) | Enabled | Ticket-level lifecycle and delivery guards exist. No cross-ticket reservation by verified server. | 部分取代 |
| Model tool loop (1) | Enabled | Vercel ToolLoopAgent replaces orchestration with a 10-step cap and Core-mediated tools. Repair authority is counted in the operation rows. | 已取代 |
| Chat history and Discord pagination (1) | Enabled | Bounded file-backed ticket dialogue and private staff review. No tool trace pagination. | 部分取代 |
| Mutation permission controls (1) | Enabled | Core can propose and consume scoped approvals. No durable provider or integrated per-operation staff UI. | 部分取代 |
| Independent server stop and start (2) | Enabled | T2 power actions exist. T1 restart is separately gated and is unavailable in shadow. Neither independent operation is exposed. | 未取代 |
| File listing and reading (2) | Enabled | Scoped Core T0 routes and Pterodactyl adapter exist. Shadow omits the file port and neither operation is a Vercel tool. | 部分取代 |
| File writing and moving/renaming (2) | Enabled | Typed T2 actions and provider dispatch exist. No integrated approval, preview and verified result flow. | 未取代 |
| Startup settings read (1) | Enabled | Core and adapter have bounded startup read support. No shadow port or Vercel tool. | 部分取代 |
| Startup variable and Docker image changes (2) | Enabled | Typed T2 actions and provider dispatch exist. No integrated safe settings update flow. | 未取代 |
| Reinstall and console follow-up (1) | Enabled | T2 reinstall exists in Core and the adapter. No integrated approval and verified completion flow. | 未取代 |
| PayUNi transaction fee lookup (1) | Enabled | Outside customer support scope. Own-invoice read has a different purpose. | 有意不取代 |
| Owner Python execution and extension load, unload, reload and slash sync (5) | Enabled | General bot administration stays outside agent tools. | 有意不取代 |
| Shared HTTP session cache, Gemini initialization and JSON tool-schema reads with locks (3) | Enabled | Provider transports, Vercel model setup and typed tool schemas serve the functional purpose. The specific process plumbing is outside replacement scope. | 有意不取代 |
| Hybrid AI command, WHMCS identity/product/service selector and external-ID mapping (5) | Disabled | Dead behind immediate return. Core’s verified identity and ownership path is independently required for active account tools. | 無需取代-已停用 |
| Minecraft text analysis, MTR image analysis and JSON atomic save helper (3) | Disabled | Analysis callbacks return before processing attachments. The save helper has no call site. | 無需取代-已停用 |

**Totals across 49 inventoried capabilities:** 已取代 1/41, 部分取代 19/41, 未取代 9/41, 有意不取代 12/41. The 41 enabled capabilities form the comparison denominator. 無需取代-已停用 accounts for 8 additional capabilities, excluded from that denominator.

## Gaps and conditions for closure

The five conditions in [pteroai.md](../integrations/pteroai.md#supersession-判定) apply to provider writes: (1) a narrow Core mutation port, (2) an operation policy bound to the verified customer and selected owned service, (3) exact per-operation staff or customer approval as policy requires, bound to a non-replayable ticket revision and single-use nonce, (4) a dry-run with input and path limits, verified readback, and handoff on failed or uncertain results, and (5) bounded receipts aligned with Discord handoff, audit, restart limits, and uncertain delivery. Read-only or Discord-only gaps use the applicable scope, bounds, verification and receipt controls. A read does not confer permission to write. Provider behavior must stay behind Core ports and use verified adapter contracts.

Core already defines power, file, startup, reinstall and suspension actions (packages/contracts/src/mutation.ts:19–54), a mutation approval store interface (apps/support-core/src/services/mutation-approval-store.ts:24), a mutation port (apps/support-core/src/ports/index.ts:50–75), and grants and tiers (apps/support-core/src/services/permission-matrix.ts:3–49). Proposal binds digest, ticket revision and owned customer/server. Execution consumes scoped approval, checks selection and ownership again, requires a separate durable exact-transaction approval consumer, and records an attempt before dispatch (apps/support-core/src/delivery/read-only-routes.ts:248–285). The process-local staff approval is insufficient by itself. Missing pieces include the durable approval provider, shadow and production composition, dry-run, operation-specific result verification, and surfacing receipts to staff and customer.

Vercel exposes exactly four T0 tools: KB search, own-server status, redacted logs and own-invoice read (packages/agent-loop/src/index.ts:23,337–375). Shadow can search local Markdown. Status lacks both the runner’s selected service and the Core selector. Logs lack a wired log provider and trusted service selection. Invoice lacks its read provider and trusted invoice selection. The launcher runs in draft mode with history, read grants and an explicitly closed restart gate (scripts/run-ticket-support.ts:33–38,69–101). Setup wires WHMCS identity and service reads plus Pterodactyl server reads, omitting file and mutation ports in shadow (scripts/lib/ticket-support-setup.ts:60–71).

Core T1 restart requires the restart grant, a verified owned selection and authenticated customer confirmation or an operator-reviewed recovery exception. It reserves one attempt per guild/channel/server in process, requires a running server, enforces a 120-second server cooldown, and reads back known status through the ownership path. Its receipt says requested. An unknown result must never turn into a blind retry or a resolved claim (apps/support-core/src/delivery/read-only-routes.ts:135–157,233–237 and apps/support-core/src/services/hosting-support-service.ts:207–228). No restart tool is exposed in Vercel shadow.

### Discord lifecycle and command error reporting

Close the support-specific gap with bounded error notices for admitted tickets and staff diagnostics for listener failures. Use authenticated ticket state and current revision at delivery, strip raw errors, and record one delivery outcome. Generic command administration remains outside the support launcher.

### General ticket buying guide

A proactive guide would need authoritative classification of the new ticket, a current approved KB article, and one bounded delivery per ticket revision. Check takeover and closure before sending. Keep a delivery receipt and suppress duplicate sends when delivery is uncertain.

### After-sales keyword replies, cooldown and deletion cleanup

Preserve the documentation coverage through KB retrieval and test the relevant password, SFTP, EULA, startup-log and MTR queries. If proactive replies are required, scope them to eligible after-sales tickets, use an expiring per-ticket cooldown and clean it up on close. Verify the policy citation before delivery and hand off questions that need account state. The owner ruled on 2026-11-24 that the panel limit is **100MB** and the historical 10MB staff answer was wrong. The local knowledge/panel/manage/upload.md explicitly states 100MB and directs larger files and folders to SFTP.

### Ticket metadata, problem menu and dispatch

Add a trusted service picker sourced from Core’s owned-service reads. Bind the actor, ticket revision and selection to a server-side interaction reference and reject stale or mismatched clicks. A problem choice can request diagnosis or an operation preview. A provider write still requires the five conditions and a separate operation approval.

### UUID lookup, server details and node lookup

Wire service-to-server resolution through Core and verify identity and ownership again for each read. If support needs node data, project only the minimum approved operational detail to the right audience, with a read audit and handoff for missing or ambiguous mappings. A Discord embed or UUID cannot establish ownership.

### Installation recovery suspend and unsuspend

Add an explicit Core recovery workflow using the existing typed actions and T2 port. Restrict the operation policy to a verified installation state and approved recovery case. Preview both effects and obtain exact single-use approval for each action. Verify suspension before proceeding and verify the final installation and suspension states. Hand off uncertain or partial outcomes, especially a server left suspended, with a separate receipt for each action.

### Startup diagnosis and console capture

Wire Core status and redacted logs first. If more console context is required, use a separate observation-only port with verified selection, elapsed time and byte bounds, redaction and explicit timeout or partial-result status. Route unavailable evidence to staff. Any power change is a separately approved operation with its own verification and receipt.

### Custom problem modal and AI disclaimer controls

If structured intake and consent are required, authenticate the responding actor, bind the question and consent decision to the active ticket revision, cap input and expire pending interactions. Record consent, decline or timeout without exposing the submission. Consent to diagnosis cannot authorize a mutation.

### Per-server AI activity tracking

Add scoped reservation by verified server across tickets, with expiry, release on failure, and a revision check before any side effect. Record busy and uncertain outcomes. A lost reservation or lease is a handoff signal for unverified operations, and never extends an approval.

### Chat history and Discord pagination

If staff need a browsable tool trace, show a bounded, redacted view tied to ticket scope and current staff access. Prefer audit and result summaries to raw provider responses. Separate model dialogue from operation receipts and verify the delivery state before displaying completion.

### Mutation permission controls

Connect a durable exact-transaction approval provider and authenticated staff UI to Core’s proposal and execution policy. Display the bounded dry-run for the verified target and operation, consume revision-bound approval once, and invalidate it on changed input or takeover. Surface pending, denied, verified and uncertain outcomes with receipts and handoff. Approval alone proves no provider result.

### Independent server stop and start

Use the existing T2 power port with distinct start and stop policies and approvals. Preview current and intended state with a verified service binding. Match approved inputs and recheck preconditions at execution, verify the resulting power state, and hand off on timeout or mismatch. Surface separate receipts for start and stop. T1 restart does not grant either action.

### File listing and reading

Wire scoped Core read ports and allowlisted tools only where justified. Normalize and confine paths to the approved server workspace, cap depth, file size and returned text, and redact sensitive content. Record a minimal read outcome and hand off unsupported or sensitive reads.

### File writing and moving/renaming

Use the T2 mutation port with a policy for approved paths and file types. Preview the diff or move and its destination effects with size bounds and collision checks. Bind exact input and source revision to single-use approval, reject drift, and verify the written content or both move endpoints. Surface a minimal receipt and hand off ambiguous results without repeating the write.

### Startup settings read

Wire the scoped Core read and return only the settings needed for diagnosis. Bound and redact command text and values, distinguish unavailable or hidden settings, and hand off when readback cannot support the answer. Record the outcome without sensitive values.

### Startup variable and Docker image changes

Use the T2 startup port with provider-confirmed editable variables, approved image choices and bounded values. Preview the exact change, require single-use approval bound to the current revision and observed settings, and verify the effective value or image after dispatch. A required restart is separately gated. Hand off mismatches with a receipt that omits sensitive values.

### Reinstall and console follow-up

Use the Core reinstall port with explicit data-loss policy and a preview of the target and impact. Require exact single-use approval, verifying prerequisites such as backup status when policy requires them. Separate request acceptance from independently verified installation completion. A console message alone cannot prove completion. Report uncertain state to staff and expose a bounded receipt.

## Three most critical gaps

1. **Trusted account reads in shadow.** The three unavailable account tools prevent grounded status, log and invoice answers and leave diagnosis without the verified state that any subsequent repair needs.
2. **Verified mutation workflows.** Restart is inaccessible and nine enabled PteroAI capabilities remain unreplaced, including repair through file, startup, power and reinstall operations. Durable approval, dry-run, readback and receipts determine whether these can safely close tickets.
3. **Document answer quality.** The measured reruns still rarely reach a fully correct answer, so better access to account state alone cannot deliver the owner’s 40% document-answer target.

## Owner operating-model assessment

### (a) Admins teach and correct the KB in the admin-group agent channel

The process-local ReviewedLearningLoop validates structured deidentified feedback and allows staff/operator review with evaluation and safety flags. It holds proposals and promotion digests. Shadow logs staff accept/edit/reject verdict metadata separately. Neither path writes KB, and the launcher does not wire the learning loop. There is no admin-channel ingestion or KB write tool. **Medium** for authenticated admin intake, review, and wiring feedback into proposals. **Large** for a versioned KB change tool with provenance, previews, staff approval, evaluation, publication and rollback. Promotion in the registry has no effect on the corpus by itself. (packages/learning/src/index.ts:18–59, scripts/lib/shadow-verdict-log.ts, scripts/run-ticket-support.ts:83–97.)

### (b) Escalate with @管理 and relay a polished staff answer

Outside draft mode the runner can request Core handoff. The bridge transitions the ticket to HUMAN_NEEDED and sends bounded, mention-free summaries with revision-bound receipts. In shadow the runner produces staff-review wording and sends drafts to a private review thread. Accept/edit/reject does not relay the result to the customer. There is no admin-group mention, authenticated answer intake, or AI-polished reply delivery path. **Medium** for one controlled @管理 notification through the bridge, scoped to an admin channel with deduplication. **Large** for linking the authorized staff reply to the current ticket, preserving its meaning during polishing, staff review where required, and guardrails and receipts for customer delivery through takeover or close. The owner-approved 2026-11-24 repeat-ticket policy exists locally at knowledge/store/services/duplicate-tickets.md. It advises waiting for staff, avoiding repeat tickets, and using the after-sales category for product issues. (packages/agent-loop/src/index.ts:428–451, apps/support-core/src/delivery/read-only-routes.ts:287–292, packages/ticket-bridge/src/index.ts:58–86,113–134, packages/ticket-bridge/src/discord-ticket.ts:78–225.)

### (c) Apply teaching immediately and remember it later

The runner can use bounded file-backed user/assistant dialogue within a trusted ticket scope and search local Markdown. History is keyed by trusted guild, ticket channel and actor. It provides conversational continuity and does not store staff teaching for reuse across tickets. There is no curated memory store wired into the runner. The learning registry and shadow verdict log do not feed retrieval. **Small** to verify same-ticket continuity using the existing history and keep staff drafts separate. **Medium** to make reviewed KB updates visible through controlled refresh and verify their retrieval. **Large** if the owner needs separate durable cross-ticket memory, which would require scoped provenance, review, conflict handling, expiry and revocation. Approved content needs to take precedence over older guidance. (packages/agent-loop/src/history.ts:5–42, packages/agent-loop/src/index.ts:192–224,449–452, apps/support-core/src/adapters/markdown-knowledge-provider.ts:76–145, scripts/run-ticket-support.ts:33–38,69–97.)

The owner’s target mix is roughly **40% autonomous tool/API resolution, 40% document answers, 20% escalation to @管理**. The autonomous portion includes Pterodactyl operation logic, Minecraft troubleshooting and general setup. Its main blockers are unreplaced mutation capabilities and the shadow account wiring gaps. Approved actions must still retain the required human gate, and the 40% target needs a clear definition of how approval-assisted fixes are counted.

Document answer quality is still the binding constraint for the 40% document share. Rerun 12’s six questions scored **1 correct / 2 partial / 3 wrong, 0 handoff**. Rerun 11’s 13 doc questions scored **1 correct / 6 partial / 6 wrong, 4 handoff**. Handoff is a separate delivery count, and the subsets differ in size. These runs do not estimate the target shares. The owner’s upload ruling changes the historical 10MB premise for scoring, and the repeat-ticket article fills a prior content gap. Rerun 13 is pending. Semantic index rebuild and targeted remeasurement wait until it finishes. ([Rerun 12](golden-set-step12-kb-rerun-12.md), [rerun 11](golden-set-step12-docs-rerun-11.md).)

## What this audit does not claim

This is a static audit. It does not verify live providers, Discord delivery, production configuration, model behavior, or completion of any write. PteroAI’s disabled paths could be re-enabled upstream. Supersession here describes code capability, not production deployment.
