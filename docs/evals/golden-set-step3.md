# Golden set: Vercel loop, step 5

## Completed run

Full live run, 175/175 executed: **0/154 (0.0%) resolved-correct; 20/21 (95.2%) handoff-correct; 0 partial; 155/175 wrong**. Offline resolution proxy: 0. Smoke (10): 0/9 (0.0%) resolved-correct; 1/1 (100.0%) handoff-correct; 0 partial; 9/10 wrong. Scores measure **loop + published-docs KB (unreviewed as agent answers)**. The static set cannot establish seven-day true resolution, no reopen, or semantic correctness. Scoring still requires every normalized expected point as a whole substring; the KB was never populated from expected points, staff answers, or resolution summaries.

Default sub2api, gpt-6.1-sol, Responses API; all live commands used /home/hatch/workspace/run-with-sub2api-key.sh with GOLDEN_LIVE_MODEL=1 and pnpm eval:golden (--limit 10 for smoke). No key was copied or printed. The requested temperature is 0.2; the provider warns it is unsupported, so effective temperature is unknown. No provider/model/endpoint fallback, no hosting-provider network calls, and no writes were introduced.

Full wall time: 2032.791 seconds; mean item latency 11.608 seconds; mean generation attempts 1.406. Smoke wall time 116.055 seconds, mean item latency 11.604 seconds, mean attempts 1.300. Cost: **null** (no pricing instrumentation). These are measured request wall times, not seven-day customer outcomes.

## Per-category results

| Category | Executed | Resolved-correct/expected resolved | Handoff-correct/expected handoff | Partial | Wrong |
| --- | ---: | ---: | ---: | ---: | ---: |
| account_access | 8 | 0/8 | 0/0 | 0 | 8 |
| billing_other | 6 | 0/5 | 1/1 | 0 | 5 |
| billing_payment | 11 | 0/10 | 1/1 | 0 | 10 |
| billing_question | 3 | 0/3 | 0/0 | 0 | 3 |
| cannot_connect | 19 | 0/18 | 1/1 | 0 | 18 |
| custom_quote | 6 | 0/3 | 3/3 | 0 | 3 |
| files_panel | 6 | 0/6 | 0/0 | 0 | 6 |
| general_other | 9 | 0/8 | 1/1 | 0 | 8 |
| lag_performance | 11 | 0/10 | 1/1 | 0 | 10 |
| plan_cancel | 6 | 0/5 | 1/1 | 0 | 5 |
| plan_upgrade | 8 | 0/8 | 0/0 | 0 | 8 |
| plugin_mod | 13 | 0/12 | 1/1 | 0 | 12 |
| pre_sales | 6 | 0/6 | 0/0 | 0 | 6 |
| purchase_help | 5 | 0/4 | 1/1 | 0 | 4 |
| refund | 6 | 0/6 | 0/0 | 0 | 6 |
| server_other | 13 | 0/10 | 3/3 | 0 | 10 |
| server_start_crash | 22 | 0/18 | 3/4 | 0 | 19 |
| version_core | 9 | 0/7 | 2/2 | 0 | 7 |
| world_backup | 8 | 0/7 | 1/1 | 0 | 7 |

Zero denominators mean the category has no expected items of that outcome.

## Published-docs KB swap

Source: read-only local Coffee-Host-docs clone, content/docs/, commit 7223f222253d1d3d67875c9c0ae660f7a4d7e0be. Its README describes a Fumadocs/Next.js published documentation site. The reproducible scripts/import-docs-kb.ts script reads only that source (optional absolute source argument), scans for known credential formats before replacement, and replaces the ignored knowledge/ folder. No golden-set field enters the importer.

Before: **19 articles / 86 sections** (generic draft). After: **51 articles / 534 sections / 177363 UTF-8 bytes**, converted from **52 MDX files**. The only skipped file is legal/privacy.mdx: pure privacy notice, no relevant troubleshooting/refund/cancellation category. Company terms and VPS-provider terms are retained because they contain refund, termination and billing policy. The landing-page FAQ is retained for purchase/support questions. Every included article carries source attribution and the exact draft-v1 awaiting-staff-review marker. README.txt is not indexed. Published by the company does not mean reviewed as agent answers.

Conversion removes YAML frontmatter/imports and known JSX presentation wrappers; frontmatter and component titles become Markdown headings. It preserves prose, fenced code, placeholders, lists, links, and image references (Image JSX becomes Markdown). It neither executes code nor fetches images/links. Credential/account references were checked: instructional placeholders and public URLs, no live keys/passwords/internal credentials or customer records found in the imported text. Images are not copied or OCRed. The old generic drafts were deleted. knowledge:check passes. The source clone was not modified.

## Citation behavior and safety

Old prompt: vaguely ask for a relevant passage and source. New prompt: explicitly copy **one whole excerpt verbatim, including Markdown, punctuation and line breaks**, immediately followed by its exact [source:start-end], with a concrete example. Each admitted tool result now includes a ready-to-copy requiredQuote combining that excerpt and citation.

**The gate is unchanged:** fresh relevant retrieval is mandatory, and a final answer must contain both a whole returned excerpt and its exact citation. No passage, no citation, fabricated/wrong citation, irrelevant retrieval, failed tool/provider, invalid tool or exhaustion still hands off. An initially considered substring relaxation was removed before the final runs: traces did not justify weakening the gate. This is a lexical safeguard, not proof that every additional claim is semantically supported.

Tests cover a verbatim quote with citation delivered; absent and fabricated/wrong citations rejected; empty/irrelevant KB handoff; injected write/foreign-selector calls unable to dispatch; wrong-owner invoice and server requests releasing no record. Full tests (364), permission-matrix tests (26 within that suite), typecheck, build, lint, eval:mock (76) and knowledge:check pass. Core remains the authorization boundary; tools remain four T0 reads. No DB, Redis, queue, production provider wiring or approval bypass was introduced.

## Failure diagnosis

The earlier report attributed handoffs broadly to citation failure. New diagnostic fields record only allowlisted model error names, numeric HTTP status and finish reasons, without exception messages/bodies. This run distinguishes missing final generations from completed uncited answers; old uninstrumented results cannot prove their cause retrospectively.

Across all items, 46 turns recorded model failures and 52 recorded Core HTTP read errors. Model HTTP statuses: {"502":46}. Core read statuses: {"/v1/me/server-logs:HTTP_404":36,"/v1/me/invoice:HTTP_403":16}. These populations can overlap.

Among unsuccessful expected outcomes:

- Provider failures: **38** (GS-001, GS-005, GS-007, GS-019, GS-031, GS-032, GS-035, GS-037, GS-040, GS-041, GS-047, GS-049, GS-052, GS-055, GS-059, GS-069, GS-079, GS-082, GS-084, GS-086, GS-094, GS-095, GS-100, GS-107, GS-122, GS-129, GS-131, GS-136, GS-142, GS-147, GS-148, GS-162, GS-163, GS-165, GS-166, GS-169, GS-171, GS-173). Model calls failed before a final draft; these are not citation failures.
- Core/read-tool errors: **47** (GS-002, GS-003, GS-006, GS-010, GS-015, GS-021, GS-023, GS-027, GS-028, GS-029, GS-030, GS-033, GS-036, GS-038, GS-046, GS-048, GS-060, GS-066, GS-068, GS-072, GS-076, GS-090, GS-092, GS-098, GS-099, GS-101, GS-102, GS-103, GS-104, GS-105, GS-108, GS-110, GS-112, GS-115, GS-117, GS-123, GS-130, GS-132, GS-133, GS-137, GS-140, GS-146, GS-150, GS-152, GS-155, GS-158, GS-168). Synthetic account state is not real customer state.
- Retrieval/tool-validation early-stop with only tool-call finish reasons: **59** (GS-004, GS-009, GS-011, GS-012, GS-013, GS-014, GS-016, GS-017, GS-018, GS-020, GS-024, GS-026, GS-042, GS-043, GS-044, GS-050, GS-051, GS-053, GS-054, GS-056, GS-057, GS-058, GS-062, GS-063, GS-064, GS-067, GS-071, GS-073, GS-075, GS-078, GS-080, GS-083, GS-087, GS-088, GS-089, GS-091, GS-093, GS-096, GS-109, GS-116, GS-118, GS-119, GS-121, GS-124, GS-125, GS-126, GS-128, GS-138, GS-141, GS-143, GS-144, GS-151, GS-153, GS-156, GS-157, GS-170, GS-172, GS-174, GS-175). No final-answer generation was recorded. This can include retrieval rejection, tool-input/result validation or early-stop; the present trace cannot distinguish every cause. It is not evidence that a completed quote was rejected. Lexical Chinese bigrams and fixed thresholds can reject relevant paraphrases; relevance is not semantic confidence.
- Other handed-off final generations/citation candidates: **2** (GS-149, GS-160). Both drafts explicitly request staff because procedures are missing: GS-149 lacks a complete NeoForge 1.21.1 core-installation procedure; GS-160 lacks NetherNet/Geyser separate-port configuration. This is a KB/tool gap, not evidence that relaxing the citation gate would make a valid resolution.
- Expected-handoff items delivered without lifecycle handoff: **1** (GS-135). A cited explanation of unavailable installation is not a successful lifecycle handoff. This is a loop escalation gap, not a KB gap.
- Delivered expected-resolved answers failing strict whole-point scoring: **8** (GS-034, GS-061, GS-106, GS-114, GS-127, GS-134, GS-161, GS-164).
- Other errors: **0** (none).

No citation-gate violations were delivered: 0. Normal final-generation stops: 11; delivered answers: 9. Delivered answers demonstrate live exact-quote compliance, but this small subset cannot isolate the prompt improvement from the KB swap or establish overall resolution quality. Most provider/early-stop failures never reached final generation.

De-identified observed examples (customer problem/draft only; no staff answer copied):
- GS-001 (refund): draft “我先查核可提供的方案、權限與網路端口限制，再依查到的資料回答。”; model failure [{"name":"AI_APICallError","status":502}]; handed off true.
- GS-034 (custom_quote): draft “我先查詢模組包代裝的收費資料，確認是否有這款模組包的報價。 ”; finish reasons tool-calls, tool-calls, stop; handed off false.
- GS-061 (billing_question): draft “我先查閱付款逾期與訂單保留期間的相關說明，確認這段期間伺服器是否仍可使用。”; finish reasons tool-calls, stop; handed off false.

## Remaining failed items

Every unsuccessful expected outcome is listed below. Category membership is not itself proof of missing knowledge; provider/retrieval failures must be repaired before judging article sufficiency.

| Category | Failed golden-set items |
| --- | --- |
| account_access | GS-007, GS-009, GS-032, GS-084, GS-118, GS-133, GS-144, GS-164 |
| billing_other | GS-013, GS-088, GS-092, GS-150, GS-152 |
| billing_payment | GS-053, GS-072, GS-076, GS-089, GS-095, GS-098, GS-101, GS-102, GS-157, GS-168 |
| billing_question | GS-061, GS-126, GS-137 |
| cannot_connect | GS-003, GS-010, GS-014, GS-021, GS-023, GS-028, GS-029, GS-030, GS-040, GS-043, GS-044, GS-055, GS-060, GS-063, GS-069, GS-079, GS-083, GS-105 |
| custom_quote | GS-034, GS-078, GS-119 |
| files_panel | GS-019, GS-024, GS-067, GS-146, GS-158, GS-169 |
| general_other | GS-012, GS-035, GS-050, GS-107, GS-124, GS-130, GS-148, GS-166 |
| lag_performance | GS-002, GS-006, GS-042, GS-059, GS-066, GS-075, GS-091, GS-109, GS-129, GS-147 |
| plan_cancel | GS-049, GS-128, GS-153, GS-156, GS-174 |
| plan_upgrade | GS-005, GS-033, GS-036, GS-047, GS-057, GS-151, GS-161, GS-175 |
| plugin_mod | GS-015, GS-018, GS-020, GS-080, GS-087, GS-093, GS-099, GS-100, GS-140, GS-141, GS-142, GS-162 |
| pre_sales | GS-004, GS-011, GS-062, GS-082, GS-096, GS-121 |
| purchase_help | GS-037, GS-125, GS-163, GS-165 |
| refund | GS-001, GS-017, GS-116, GS-131, GS-170, GS-172 |
| server_other | GS-016, GS-056, GS-073, GS-106, GS-112, GS-114, GS-115, GS-122, GS-134, GS-160 |
| server_start_crash | GS-031, GS-038, GS-041, GS-046, GS-048, GS-058, GS-068, GS-071, GS-086, GS-090, GS-104, GS-108, GS-117, GS-123, GS-127, GS-135, GS-155, GS-171, GS-173 |
| version_core | GS-054, GS-094, GS-103, GS-132, GS-136, GS-138, GS-149 |
| world_backup | GS-026, GS-027, GS-051, GS-052, GS-064, GS-110, GS-143 |

## Gaps to address next

1. **Provider/loop:** investigate repeated sub2api continuation HTTP errors using safe gateway-side diagnostics. Do not infer missing KB or prompt failure from a turn that never reached final generation.
2. **Retrieval:** calibrate on customer problem text and published-docs passages, especially short colloquial Chinese and mismatched technical synonyms. Keep no-relevant-evidence handoff. A semantic retrieval evaluation is needed before changing lexical admission.
3. **KB/business policy requiring staff confirmation:** current plan availability/quotes, CPU/RAM/SSD recommendations, payment channels and reconciliation timelines, refund exceptions, upgrade/cancellation timing, account-link/login recovery and escalation contacts. The GS-034 draft explicitly found no custom-modpack installation price. GS-061 quoted the published renewal/termination terms; no expected-point string was matched and the cited passage does not state the precise suspension cutoff time. Staff should confirm operational suspension, grace-period and data-retention behavior before agent use. Also needed: the NeoForge core-installation procedure, NetherNet/Geyser port setup, Docker-image/startup modification prerequisites, and cancellation-withdrawal/next-term-only cancellation policy. Published docs are the only source here; confirm current policy before adding anything.
4. **Loop escalation:** GS-135 delivers cited Forge installation guidance while explaining it cannot perform the change, but does not invoke Core handoff. A structured, tested handoff-intent path is needed even after valid citation; adding a price/article cannot repair this lifecycle gap.
5. **Unavailable tools/state:** actual invoice/payment status, credit/refunds, service entitlements/plan changes, account linking, restore completion, and restart/reinstall verification cannot be established by this four-read synthetic loop. Documentation cannot replace authoritative own-account state or authorize writes. These need scoped ports and approved workflows, or handoff.
6. **Evaluation:** lexical whole-point scoring can miss valid paraphrases; independently review delivered answers semantically. Staff review of KB-as-agent-answers, shadow mode and seven-day outcomes remain pending. Do not tune the KB from golden expected answers.

Raw final results (ignored): eval-results/golden-2026-11-07T15-57-30-320Z-10.json and eval-results/golden-2026-11-07T16-00-20-001Z-175.json. Earlier smoke/interrupted full artifacts remain ignored and are not the headline run. Neither knowledge/ nor eval-results/ is committed. No GitHub push or merge was performed.

## Previous step-4 baseline

Step 4 (2026-11-07): 175/175; resolved-correct 0/154, handoff-correct 21/21, partial 0, wrong 154/175; 19 articles / 86 sections, mean 1.17 attempts and 9.95 seconds/item, wall time 1740.654 seconds, cost null. Its broad citation attribution was not supported by provider-failure/finish-reason diagnostics, which were absent then.
