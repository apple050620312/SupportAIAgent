# Customer-service conventions report

## 1. Method and scope

This review covers 837 de-identified tickets from 2026-08 through 2026-11. Categories come from `categorised.jsonl`. Frequencies labelled **computed** are exact counts over the full category. Frequencies labelled **sampled** are estimates from the deterministic samples described in the source pattern reports. Each ticket counts once for a pattern. A pattern is repeated handling that can inform a policy or repeatable response. A one-off detail, isolated wording, or unsupported inference is excluded. `server_other` and `general_other` are mixed buckets, so their sampled patterns have limited meaning. Many tickets have no staff reply, which limits what can be learned.

## 2. Per-category conventions

Each item retains its source label and frequency. `N` is the category size.

### Technical categories

#### server_start_crash (N=46)

- [procedure] Request console or log evidence before diagnosis — ≈4/15, sampled.
- [procedure] Correct core/version or reinstall, then restart — ≈6/15, sampled.
- [convention] Route complex or mod-related failures to after-sales support — ≈2/15, sampled.

#### cannot_connect (N=80)

- [procedure] Ask for network evidence or a screenshot, then test reachability — ≈5/15, sampled.
- [convention] Ask the customer to retry after a transient upstream or routing issue — ≈5/15, sampled.
- [convention] Escalate or route when the issue is provider-side — ≈3/15, sampled.

#### plugin_mod (N=44)

- [procedure] Identify whether the artifact is a plugin, mod, or modpack and check the matching core — ≈7/15, sampled.
- [procedure] Upload the server pack/plugin through SFTP or the panel and install the matching version — ≈6/15, sampled.
- [convention] Set boundaries or route non-covered installation work to support/billing channels — ≈3/15, sampled.

#### lag_performance (N=40)

- [procedure] Request performance or network diagnostics such as spark or MTR — ≈6/15, sampled.
- [procedure] Apply or suggest node/route migration when the node is implicated — ≈4/15, sampled.
- [convention] Ask the customer to retry or observe after a change — ≈4/15, sampled.

#### version_core (N=18)

- [procedure] Set the requested version/core in startup settings and run panel reinstall — ≈10/18, computed.
- [procedure] Verify the resulting core, startup file, or Java compatibility — ≈5/18, computed.
- [convention] State when the requested version or route is unsupported and redirect — ≈3/18, computed.

#### world_backup (N=22)

- [procedure] Ask what action failed and request a screenshot or recording — ≈5/22, computed.
- [procedure] Provide a panel download/restore path and confirm completion — ≈8/22, computed.
- [convention] Explain backup availability or paid/manual-retrieval limits — ≈5/22, computed.

#### files_panel (N=15)

- [procedure] Give a direct panel/SFTP instruction or documentation link — ≈7/15, computed.
- [procedure] Request a screenshot or exact panel error — ≈4/15, computed.
- [convention] Route account, backup, or unavailable-node cases to after-sales/support — ≈4/15, computed.

#### server_other (N=224, mixed bucket)

- [procedure] Give a short direct instruction or link for the concrete task — ≈8/30, sampled.
- [convention] Ask for a screenshot, link, or clarification before acting — ≈5/30, sampled.
- [convention] Say wait/retry while checking, or escalate to the appropriate channel — ≈5/30, sampled.
- [convention] Leave the ticket without a substantive staff response — ≈12/30, sampled. This is an observation, not a handling policy.

### Billing, account, sales, and general categories

#### billing_other (N=34)

- [convention] Correct duplicate or incorrect billing and identify the single bill to pay — ≈8/15, sampled.
- [convention] Answer compensation questions briefly or defer to the compensation run — ≈4/15, sampled.
- [procedure] Point to upgrade/cancellation documentation or a new ticket for a service change — 1/34 URL signal and 1/34 after-sales signal, computed.

#### billing_payment (N=30)

- [procedure] Explain which invoice covers the service and issue or reference the bill — 6/30, computed.
- [convention] Check payment/activation against account state, then confirm activation or request a recheck — ≈8/15, sampled.
- [convention] Explain why different payment periods did not merge and restore files after payment when applicable — ≈3/15, sampled.

#### billing_question (N=5)

- [convention] Give a direct rule about expiry, suspension, or duplicate bills — 3/5, computed.
- [procedure] Cancel or reduce duplicate or failed bills to one payable bill — ≈2/5, sampled.

#### plan_upgrade (N=26)

- [procedure] Create or reference an upgrade invoice — 12/26, computed.
- [procedure] For plan/node migration, ask the customer to shut down, migrate, and provide the new address — ≈8/15, sampled.
- [convention] Recommend a plan based on workload and route to a new support ticket when needed — ≈4/15, sampled.

#### plan_cancel (N=22)

- [procedure] Point customers to the cancellation document — 5/22, computed.
- [convention] Explain that cancellation stops renewal and files must be downloaded before expiry — ≈3/15, sampled.
- [convention] Mark duplicate or already-closed cancellation requests cancelled — ≈3/15, sampled.

#### refund (N=12)

- [convention] Check the transaction and explain the refund route or method — ≈5/12, sampled.
- [convention] Quote or verify the amount before processing — ≈3/12, sampled.
- [convention] Use human/admin follow-up for exceptions or account-state checks — ≈2/12, sampled.

#### account_access (N=41)

- [procedure] Request identity/account verification or corrected legal/account information — 4/41 KYC signal and 3/41 account-info signal, computed.
- [procedure] Ask for complete address or other account fields, then recheck and open the service — ≈9/15, sampled.
- [convention] Check status and confirm activation when access or verification is pending — ≈7/15, sampled.

#### purchase_help (N=24)

- [procedure] Direct the customer to a purchase/after-sales path or supply a bill — 1/24 each for computed after-sales, URL, and invoice signals.
- [convention] Answer eligibility/setup briefly, request needed details, or route installation to after-sales — ≈6/15, sampled.
- [convention] Answer pending purchase/activation with a status check or activation confirmation — ≈4/15, sampled.

#### pre_sales (N=64)

- [convention] Answer suitability and capacity questions with a short recommendation or product page — ≈8/15, sampled.
- [procedure] For custom installation or a completed purchase, request a modpack/product link and route paid work through billing or after-sales — 1/64 each for URL, invoice, and after-sales signals, computed.
- [convention] Quote prices when the request is concrete — sampled, frequency not reliable from the first-reply signal.

#### custom_quote (N=15)

- [convention] Quote a concrete service price after clarifying the requested game/modpack — ≈7/15, sampled.
- [procedure] Request a modpack or product URL before pricing or opening the bill — ≈4/15, sampled.
- [procedure] After payment, route the customer to an after-sales ticket — ≈4/15, sampled.

#### general_other (N=75, mixed bucket)

- [convention] Check the account/order and confirm activation for purchase or activation requests — ≈15/30, sampled.
- [convention] Request missing account information, especially a complete address — ≈6/30, sampled.
- [convention] Discourage duplicate tickets and direct the customer to the existing/after-sales ticket — ≈4/30, sampled.

## 3. Contradictions and outdated answers

The current KB was checked in `/home/hatch/workspace/OpenClawHostingSupport/knowledge/`.

1. **Upload limit** — older staff answers state 10 MB. Current KB `knowledge/panel/manage/upload.md` states 100 MB and sends larger files to SFTP. **Current side known:** 100 MB, owner-adjudicated 2026-11-24. The old 10 MB answer is outdated.
2. **Overdue retention** — staff answers include 14 days. `knowledge/store/services/end-of-term-cancellation-retention.md` describes end-of-term retention as 17 days. **Unresolved — needs owner:** owner adjudication is pending, so neither duration is a convention.
3. **Backup retention wording** — sampled staff answers describe one backup per day and paid/manual retrieval limits. Current `knowledge/index.md` says daily node backups are retained at least three days. The operational scope and any fee conditions are not stated consistently. **Unresolved — needs owner.**
4. **Cancellation and file availability** — sampled answers say files are not retained after expiry, while `knowledge/legal/tos.md` reserves the right to refuse post-expiry data and allows termination within three days or less. These are compatible only after the retention window is explicitly defined. **Unresolved — needs owner.**

No other staff-versus-KB conflict was promoted to a convention. Items above remain excluded from the convention list until resolved.

## 4. No usable answer

The exact aggregate counts are 218 tickets with zero staff messages and 127 tickets with only bot messages. Bot-only tickets are a subset of zero-staff tickets, so their union is 218. The combined no-usable-answer total, counting each ticket once, is **227 of 837**, which is the sum of the per-category counts below. Per-category no-usable-answer counts are: server_start_crash 7/46; cannot_connect 8/80; plugin_mod 7/44; lag_performance 3/40; version_core 1/18; world_backup 3/22; files_panel 2/15; server_other 111/224; billing_other 9/34; billing_payment 5/30; billing_question 2/5; plan_upgrade 2/26; plan_cancel 9/22; refund 0/12; account_access 7/41; purchase_help 5/24; pre_sales 13/64; custom_quote 5/15; general_other 28/75. These tickets teach nothing reliable about handling and must not become patterns.

## 5. Conventions versus procedures

| [convention] owner-review candidates | [procedure] factual how-to |
|---|---|
| Retry after transient upstream/routing issue | Request logs, console, screenshots, MTR, or spark |
| Escalate provider-side or complex/mod-related cases | Set version/core, reinstall, and restart |
| Set boundaries for non-covered work | Upload/install through SFTP or the panel |
| Ask the customer to observe after a change | Verify core, startup file, Java, or reachability |
| Explain backup limits, activation status, billing rules, and refund route | Provide backup restore/download, panel/SFTP, cancellation, migration, invoice, and account-field instructions |
| Discourage duplicate tickets and route to the correct channel | Request identity/account fields, product links, or modpack links |

Procedures are factual how-to material already suited to documentation or existing KB coverage. Conventions are the policy candidates requiring owner approval.

## 6. What this report is not

This is a review artifact, not KB content. No ticket answers were copied into the KB. The next step is owner review and approval of individual convention items, with contradictions resolved before any article is written.
