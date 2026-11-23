# Golden set: Vercel loop, step 5

For the current harness metric and answerability rules, see
[Golden eval semantic scoring](golden-semantic-scoring.md). The results below
are historical. Step 10 reviewed 38 delivered answers, so its counts use a
different denominator from the current overall metric.


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

## Step 6 — gpt-6-luna (2026-11-08)

The model selector is now shared through `MODEL_ID` (default `gpt-6.1-sol`; the prior `AGENT_LIVE_MODEL_ID` remains a compatibility fallback). Sub2api accepted `gpt-6-luna`: the 10-item smoke completed successfully, then the full 175-item run completed without endpoint rejection or model-request errors that aborted an item. Commands used the required `/home/hatch/workspace/run-with-sub2api-key.sh` wrapper, `MODEL_ID=gpt-6-luna`, `GOLDEN_LIVE_MODEL=1`, and the default `MODEL_PROVIDER=sub2api`. The provider emitted the existing warning that temperature is unsupported for reasoning models; effective temperature is unknown.

Full run: **0/154 (0.0%) resolved-correct; 21/21 (100.0%) handoff-correct; 0 partial; 154/175 wrong**. Offline resolution proxy: 0. Smoke: **0/9 resolved-correct; 1/1 handoff-correct; 0 partial; 9/10 wrong**. Cost: **null** (no pricing instrumentation). Full wall time was 1360.600 seconds; mean item latency was 7.775 seconds (wall time / 175); mean generation attempts were 1.411. These are loop measurements over synthetic Core state, not seven-day customer outcomes.

### Per-category results

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
| server_start_crash | 22 | 0/18 | 4/4 | 0 | 18 |
| version_core | 9 | 0/7 | 2/2 | 0 | 7 |
| world_backup | 8 | 0/7 | 1/1 | 0 | 7 |

### Failure-pattern breakdown

- Provider failures: **43**, all recorded as sub2api HTTP **502** model failures. The 502 problem therefore followed the provider path, not a gpt-6.1-sol-only behavior; gpt-6-luna still saw 43 such failures (step 5 saw 38).
- Core/read-tool errors: **32** (synthetic harness HTTP errors, principally the same unavailable log/invoice state). This is lower than step 5's 47 but remains a harness limitation.
- Retrieval/tool-validation early-stop: **0 distinct items**. The runner produced a deterministic handoff reply for failed/unsupported turns; traces were tool-call-only, but they did not remain unresolved without a final reply as in step 5's early-stop bucket.
- Delivered-but-scored-wrong: **6** resolved answers (GS-035, GS-086, GS-099, GS-103, GS-105, GS-127); strict whole-point scoring rejected each.
- Missing procedures: **3** of those delivered answers explicitly lacked enough procedure or required staff confirmation (GS-035, GS-086, GS-127). These are KB/operational gaps, not evidence that relaxing scoring would resolve them.
- Escalation gaps: **0** expected-handoff items lacked lifecycle handoff; all 21 expected handoffs were handed off.
- Citation-gate violations: **0** delivered answers.

### Step-5 comparison

| Measure | Step 5 gpt-6.1-sol | Step 6 gpt-6-luna | Change |
| --- | ---: | ---: | ---: |
| Resolved-correct | 0/154 (0.0%) | 0/154 (0.0%) | unchanged |
| Handoff-correct | 20/21 (95.2%) | 21/21 (100.0%) | +1 item |
| Provider 502 failures | 38 | 43 | +5 |
| Core/read-tool errors | 47 | 32 | -15 |
| Early-stop bucket | 59 | 0 distinct items | lower; final deterministic handoff recorded |
| Delivered-but-scored-wrong | 8 | 6 | -2 |
| Missing procedures | 2 | 3 | +1 |
| Escalation gaps | 1 | 0 | -1 |
| Full mean item latency | 11.608 s | 7.775 s | -3.833 s |
| Cost | null | null | not measured |

The model change did not improve lexical resolution: both runs scored 0/154. It improved expected-handoff correctness and reduced Core errors and delivered wrong answers, while increasing 502s by five. Because the 502s remained on the same sub2api provider and increased with luna, this run does not support attributing them solely to gpt-6.1-sol; it demonstrates provider/model-path instability affecting both models. Raw results are ignored at `eval-results/golden-2026-11-07T16-45-22-873Z-175.json` (smoke: `golden-2026-11-07T16-43-31-399Z-10.json`).

## Step 7 — gpt-6-luna, Responses continuation fix and retries (2026-11-08)

The store error was caused by the Responses continuation path at the provider boundary. AI SDK `@ai-sdk/openai@4.0.110` carries Responses item IDs from prior tool-loop steps when storage is enabled; sub2api does not reliably persist those `rs_*` items (its error explicitly says items created with `store:false` are not persisted). Our model factory did not set `previousResponseId` or `store:false`, and the loop itself did not add a server continuation ID. The safe reproduction evidence was the multi-step Responses request shape and the gateway's non-persistence error; after forcing `providerOptions: { openai: { store: false } }`, the same two-step tool-call/final-citation path completed and no continuation error appeared. This keeps the loop self-contained by sending the full local message/tool history each step. No provider key, body, or full exception was logged.

The regression test is mocked (`scripts/test/vercel-agent.test.ts`) and verifies every Responses-model step receives `store:false` and no `previousResponseId`. The live smoke and full run used `MODEL_ID=gpt-6-luna`, `MODEL_PROVIDER=sub2api`, `GOLDEN_LIVE_MODEL=1`, and `/home/hatch/workspace/run-with-sub2api-key.sh`. Per-item retries allow at most three attempts only for HTTP 502/503/504 or the allowlisted store/previous-response error, with 1s then 2s backoff. Deterministic handoffs, Core 404/403, and scoring failures are never retried. Attempt counts are stored in every raw result and report.

Smoke (10): **0/9 (0.0%) resolved-correct; 1/1 (100.0%) handoff-correct; 0 partial; 9 wrong**. No retries were needed. Full (175/175): **0/154 (0.0%) resolved-correct; 18/21 (85.7%) handoff-correct; 0 partial; 157 wrong**. No item needed a retry and no item ended with `error:true`; the run recorded no provider failures (the store/continuation 502 class fell from step 6's 43 to 0). Full wall time was 1822.128 seconds; mean item latency was 10.412 seconds (wall time / 175); mean generation attempts was 1.423. Cost: **null**. Scores measure **loop + published-docs KB (unreviewed as agent answers)**; a static set cannot establish seven-day true resolution.

### Per-category results

| Category | Executed | Resolved-correct/expected resolved | Handoff-correct/expected handoff | Partial | Wrong |
| --- | ---: | ---: | ---: | ---: | ---: |
| account_access | 8 | 0/8 | 0/0 | 0 | 8 |
| billing_other | 6 | 0/5 | 1/1 | 0 | 5 |
| billing_payment | 11 | 0/10 | 1/1 | 0 | 10 |
| billing_question | 3 | 0/3 | 0/0 | 0 | 3 |
| cannot_connect | 19 | 0/18 | 1/1 | 0 | 18 |
| custom_quote | 6 | 0/3 | 3/3 | 0 | 3 |
| files_panel | 6 | 0/6 | 0/0 | 0 | 6 |
| general_other | 9 | 0/8 | 0/1 | 0 | 9 |
| lag_performance | 11 | 0/10 | 0/1 | 0 | 11 |
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

### Failure-pattern breakdown and comparison with step 6

The full run recorded 0 provider failures, 42 Core/read-tool errors (26 synthetic log 404s and 16 synthetic invoice 403s), 0 citation-gate violations, and 6 delivered answers that failed strict expected-point scoring. Tool-call finish reasons occurred on 124 items and normal `stop` on 51; deterministic handoff behavior completed all turns. No item recovered on retry because no transient failure occurred.

| Measure | Step 6 gpt-6-luna | Step 7 gpt-6-luna | Change |
| --- | ---: | ---: | ---: |
| Resolved-correct | 0/154 (0.0%) | 0/154 (0.0%) | unchanged |
| Handoff-correct | 21/21 (100.0%) | 18/21 (85.7%) | -3 items |
| Provider 502 failures | 43 | 0 | -43 |
| Core/read-tool errors | 32 | 42 | +10 |
| Full mean item latency | 7.775 s | 10.412 s | +2.637 s |
| Mean generation attempts | 1.411 | 1.423 | +0.012 |
| Items needing retries | not instrumented | 0 | — |
| Recovered on retry | not instrumented | 0 | — |
| Cost | null | null | unchanged |

The lower handoff score reflects model/run variance and synthetic tool-state outcomes; it is not evidence that the continuation fix weakened the safety gate. The store fix removed the observed provider failure class. These scores remain a loop plus published-docs KB measurement, not reviewed customer answers or a seven-day resolution outcome.

## Step 8 (2026-11-08): post-tool continuation diagnosis and fix

Step 7's 124 tool-call-only outcomes were classified from the saved allowlisted traces. The dominant class was **retrieval/read gate early-stop: 59/124**, followed by synthetic Core read errors (42: 26 log 404 and 16 invoice 403) and provider/other failures in the remainder. In the dominant class, the final generation was absent because `stopWhen` included `handoff || failed`; retrieval rejection or a read exception set that flag during tool execution, so the loop terminated with `tool-calls` before the model could state the handoff. Representative de-identified cases included a refund question whose last call was knowledge search, a connectivity question whose last call was redacted logs, and a pre-sales question whose last call was knowledge search. Arguments were selector-free/allowlisted; no malformed selector or unauthorized dispatch was observed.

| Classification of step-7 tool-call-only items | Count |
| --- | ---: |
| Retrieval gate rejected (no admitted evidence) | 59 |
| Tool result error (synthetic Core: logs HTTP 404 / invoice HTTP 403) | 42 |
| Tool-input validation failure | 0 observed |
| Step cap reached | 0 observed |
| Model/provider failure before final text | 23 |
| Other/overlap | 0 |

The single dominant cause was the application stop condition, supported by one-step traces with a tool-call finish reason immediately after `handoff`/`failed` became true and no final generation. The fix removes `handoff || failed` from `stopWhen` while retaining the ten-step cap. Gated tools return an explicit unavailable/handoff instruction; the model receives one continuation to emit final text, and the application still performs deterministic Core handoff and rejects every answer lacking fresh evidence and an exact citation. No retrieval threshold, citation rule, authorization rule, model, provider, or KB changed. Focused tests and the full safety suite remain green.

Smoke and full-run results are recorded below after completion. Cost is null; latency is measured wall time only. Scores measure loop + published-docs KB (unreviewed as agent answers); the static set cannot establish 7-day true resolution.

### Full run (2026-11-08, restarted by Muse after Codex's session ended at 69/175)

Full live run, 175/175 completed, `MODEL_ID=gpt-6-luna`, `MODEL_PROVIDER=sub2api`, via `/home/hatch/workspace/run-with-sub2api-key.sh`: **0/154 (0.0%) resolved-correct; 18/21 (85.7%) handoff-correct; 0 partial; 157 wrong**. Raw results: `eval-results/golden-2026-11-07T19-55-19-182Z-175.json` (status completed). Smoke (10, completed by Codex): 0/9 resolved-correct, 1/1 handoff-correct, 0 citation violations.

The continuation fix worked mechanically: **all 175 items now end with a normal `stop` and a delivered final answer** (finish reasons: tool-calls 209, stop 175; delivered answers 175/175; citation-gate violations 0). Mean steps rose 1.42 → 2.19 (mostly 2 steps; 25 items at 3, 3 at 4, 1 at 5), mean latency 13.61s/item, wall time 2381.9s. **Provider failures: 0** (the step-7 store fix held); no item needed a retry (attempts: all 1). Synthetic Core errors remained: 29 log HTTP 404s and 14 invoice HTTP 403s.

But resolution did not move: the loop now completes as a handoff instead of dying at the tool call, so the score is unchanged. Handoff-correct stayed 18/21 (same 3 items as step 7 did not recover). The remaining dominant failure is still the retrieval gate rejecting relevant passages (59 items in step 7's classification) plus synthetic account state the harness cannot provide. The next lever is retrieval quality (lexical matching on colloquial Chinese questions), not the loop's continuation behaviour.

## Step 9 — official OpenAI embeddings, hybrid retrieval (2026-11-08)

### Design and calibration

The official OpenAI embeddings probe accepted **text-embedding-3-small** (HTTP 200,
1,536 dimensions), so no fallback model was probed. Chat remains
**gpt-6-luna / sub2api / Responses**, with `store:false` and the existing retry
policy. Every live chat invocation used `/home/hatch/workspace/run-with-sub2api-key.sh`.
Embeddings use only the fixed `https://api.openai.com/v1/embeddings` endpoint with
`EMBEDDING_PROVIDER=openai`, `EMBEDDING_MODEL=text-embedding-3-small`, and **the
official OpenAI key from the environment**. Future runs require `OPENAI_API_KEY`
in the environment; no key is stored in source, configuration, index, or results.

The new Core knowledge adapter implements the existing domain port and combines
**cosine similarity + 0.02 / (lexical rank + 1)** for passages in the lexical top
eight (zero lexical bonus otherwise). Semantic similarity determines the ranking;
the small lexical bonus breaks close topical ties. The independent agent gate
admits only returned passages with **cosine >= 0.40 against the original customer
prompt**. Lexical overlap cannot override a semantic rejection. Without explicit
semantic configuration, offline/default lexical behavior remains available; a
failed semantic request fails closed rather than falling back to lexical admission.

Semantic search uses the first 300 characters of the original customer prompt
(the existing query contract bound), requesting eight candidates; gate scoring
uses the full original prompt. This avoids model query drift. The initial smoke
exposed that drift on GS-006: the customer question had a relevant TPS passage at
0.405, but model-reworded search omitted it. After the fix that passage is admitted;
the item still hands off when synthetic logs return 404. The whole-excerpt plus
exact-citation gate, only four T0 tools, trusted ownership selection, lifecycle
checks, no writes, and prompt-injection constraints remain enforced.

`node --import tsx scripts/build-kb-index.ts` (after `pnpm build`, with embedding
configuration above) embeds all **534** canonical returned passages from the
**51-article** corpus in batches of 32. Input is title + heading + the same bounded
excerpt returned by search, not hidden article text. The ignored
`.kb-index/passages.json` records model, content digest, passages and vectors;
loading rejects a stale corpus/model or invalid vectors. Rebuild after any
`knowledge/` change. `KB_INDEX_PATH` overrides the index path. The measured build
took **13.948 seconds**. Indexing cost, query-embedding cost and chat cost are
**null** (not instrumented). No knowledge files, vectors, or raw eval results are
committed.

`node --import tsx scripts/calibrate-kb-retrieval.ts` projects golden input to
**IDs and customer problems only**, then compares those problems with KB passages
and six unrelated control questions. **Threshold calibration never used expected
points or staff answers.** The largest unrelated-control cosine was **0.376176**
(a dentist appointment question); others ranged 0.156689–0.284002. A 0.35 threshold
would incorrectly admit that control. We selected 0.40 to leave a margin above the
controls while retaining colloquial relevant pairs such as the TPS question at
0.405. At 0.40, **172/175** customer problems have an admissible top passage, versus
175 at 0.35 and 165 at 0.45. These are relevance diagnostics, not correct-answer
scores. The three excluded problems score 0.372 (specific plan switch), 0.386
(account charge dispute), and 0.399 (unspecified "what do I need to do"). This is a
conservative tradeoff that still misses a relevant upgrade passage. It is not a
universal OOD guarantee: vague/in-domain questions can match generic documentation,
and cosine does not prove every answer claim.

Safety tests cover colloquial retrieval over a lexical distractor, unrelated
question handoff, original-question scoring, exact/missing/fabricated citations,
write/foreign-selector injection after semantic admission, corrupt vectors/index,
query caching, fixed official embedding endpoint, sanitized provider failures,
and embedding-specific credentials/configuration. Four old test assertions were
updated to expect step 8's final-answer continuation rather than immediate stop.

### Smoke and full-run status

Initial smoke (model-query search): 10/10 completed, **0/9 resolved-correct,
1/1 handoff-correct**, zero provider failures, 189.741 seconds. After the
original-question search fix, final smoke: 10/10 completed, **0/9 resolved-correct,
1/1 handoff-correct**, zero partial, nine wrong; **10/10** admitted evidence,
two non-handoff answers, six synthetic Core read errors, zero delivered
citation violations. All ten items used one attempt; mean 2.7 generation steps,
17.298 seconds/item, wall time 172.977 seconds. These separate retrieval admission
from delivered answers and strict expected-point resolution.

Raw smoke files (ignored): `eval-results/golden-2026-11-08T00-29-19-828Z-10.json`
and `eval-results/golden-2026-11-08T00-32-50-320Z-10.json` (final smoke).

The full 175-item run was first started by Codex and killed by a runtime restart at 168/175 results (partial file `eval-results/golden-2026-11-08T00-37-22-254Z-175.json`, status running; partial headline 0 resolved, 16 handoff-correct). Muse re-ran the complete run with the same configuration. Final full run, 175/175 completed (`eval-results/golden-2026-11-08T01-30-48-210Z-175.json`): **0/154 (0.0%) resolved-correct; 18/21 (85.7%) handoff-correct; 0 partial; 157 wrong**. Mean steps 2.26, mean latency 20.83s/item, wall time 3645.0s, cost null. Provider failures **0**; no item needed a retry (all attempts 1). Delivered answers 175/175, citation-gate violations 0. Synthetic Core errors rose to 52 log HTTP 404s and 23 invoice HTTP 403s (75 total, vs 43 in step 8): with retrieval admitting more items, more turns reach the log/invoice tools and hit the fake account state.

### Per-category results (final full run)

| Category | Executed | Resolved-correct/expected resolved | Handoff-correct/expected handoff | Partial | Wrong |
| --- | ---: | ---: | ---: | ---: | ---: |
| account_access | 8 | 0/8 | 0/0 | 0 | 8 |
| billing_other | 6 | 0/5 | 1/1 | 0 | 5 |
| billing_payment | 11 | 0/10 | 1/1 | 0 | 10 |
| billing_question | 3 | 0/3 | 0/0 | 0 | 3 |
| cannot_connect | 19 | 0/18 | 1/1 | 0 | 18 |
| custom_quote | 6 | 0/3 | 1/3 | 0 | 5 |
| files_panel | 6 | 0/6 | 0/0 | 0 | 6 |
| general_other | 9 | 0/8 | 0/1 | 0 | 9 |
| lag_performance | 11 | 0/10 | 1/1 | 0 | 10 |
| plan_cancel | 6 | 0/5 | 1/1 | 0 | 5 |
| plan_upgrade | 8 | 0/8 | 0/0 | 0 | 8 |
| plugin_mod | 13 | 0/12 | 1/1 | 0 | 12 |
| pre_sales | 6 | 0/6 | 0/0 | 0 | 6 |
| purchase_help | 5 | 0/4 | 1/1 | 0 | 4 |
| refund | 6 | 0/6 | 0/0 | 0 | 6 |
| server_other | 13 | 0/10 | 3/3 | 0 | 10 |
| server_start_crash | 22 | 0/18 | 4/4 | 0 | 18 |
| version_core | 9 | 0/7 | 2/2 | 0 | 7 |
| world_backup | 8 | 0/7 | 1/1 | 0 | 7 |

### Step-8 comparison and diagnosis

| Measure | Step 8 (lexical) | Step 9 (semantic) | Change |
| --- | ---: | ---: | ---: |
| Resolved-correct | 0/154 (0.0%) | 0/154 (0.0%) | unchanged |
| Handoff-correct | 18/21 (85.7%) | 18/21 (85.7%) | unchanged |
| Provider failures | 0 | 0 | unchanged |
| Core/read-tool errors | 43 | 75 | +32 (more turns reach the tools) |
| Mean item latency | 13.61s | 20.83s | +7.22s (embedding calls) |
| Mean steps | 2.19 | 2.26 | +0.07 |
| Cost | null | null | not measured |

Semantic retrieval fixed admission but not resolution. On the step-5 early-stop cohort (59 items), **58/59 now have retrieved evidence** (only GS-088 without), yet 46 of the 59 still hand off and 0 resolve. Across the full run the loop handed off 137/175 times and produced 38 non-handoff answers, none of which matched the strict expected points. The bottleneck has moved from finding the passage to what happens after it: admitted passages are topically relevant but often do not contain the specific answer (procedure, price, account state), the synthetic Core state blocks the follow-up check (75 errors), and strict whole-point lexical scoring rejects paraphrases. The next levers are (a) a semantic review of the 38 delivered answers to see whether any are actually correct under a looser judgement, (b) production adapters for real account state, and (c) the user's answers for the remaining policy/procedure gaps. Retrieval admission is no longer the constraint; more KB text alone will not move this score.

Cohort caveat: the step-7/8 narrative reports 59 retrieval rejects but does not
identify those 59 IDs. The only explicitly named 59-item cohort in this report is
the earlier step-5 early-stop list; its causes were originally acknowledged to be
mixed. We will report recovery on that reproducible published cohort separately,
without calling it an exact reconstruction of step 7. Calibration admits **56/59**
of that named cohort; GS-089, GS-151 and GS-175 remain below threshold. Actual
full-run admissions, non-handoff answers and strict resolutions must be counted
from the live run. The historical aggregate alone cannot establish an exact
59-item step-7 recovery rate.

Scores measure **loop + published-docs KB (unreviewed as agent answers)**. The
static set cannot establish **7-day true resolution**, no reopen, or reviewed
semantic correctness. Better retrieval does not supply missing authoritative
account state, staff approval, or verified write/restore outcomes.


## Step 10 — semantic review of step-9 delivered answers (2026-11-08)

### Judge design and defaults

`scripts/judge-semantic.ts` selects exactly `handedOff === false` from
`eval-results/golden-2026-11-08T01-30-48-210Z-175.json`: **38 items**,
listed exhaustively in the table below (35 expected-resolved, three
expected-handoff). It verifies the completed 175-item source, unique selected
IDs, one golden match per ID, and the original dataset SHA-256. The external
reference remains `/home/hatch/workspace/coffee-host-golden/golden_set.json`;
it is not copied into this repository.

The judge is **gpt-6.1-sol via sub2api Responses**, temperature **0.1**,
`store:false`, deliberately different from the answering model gpt-6-luna.
Each item request contains only **customer_problem, answer (the delivered final
answer), expected_points, and staff_resolution**. No conversation, draft,
retrieved evidence, tool trace, category, ID, outcome, or lexical score is sent.
The rubric and evaluation instructions are the only additional model context.
The harness applies the expected-handoff override locally, retaining the
content judgment and whether its content was reasonable in the private reason.

Rubric (verbatim):

- **correct** — every expected point is substantively present in the delivered answer (paraphrase allowed, exact wording NOT required) AND no statement in the answer contradicts the staff resolution.
- **partial** — at least one expected point substantively present, but at least one missing.
- **wrong** — no expected point substantively present, or any statement contradicting the staff resolution.
- Items whose golden-set outcome is should-hand-off but which received an answer: verdict is **wrong (should have handed off)** regardless of content; still record whether the content itself was reasonable in the reason field.
- The judge must output, per item: per-point verdicts (covered/partial/missing), overall verdict, and a 1–2 sentence reason. No other claims.

Defaults: a point is `covered` only when substantively complete; incomplete
support is `partial`, absent support is `missing`. With no fully covered point,
the overall verdict is wrong; any contradiction overrides coverage. Advice to
perform an operation does not establish that it was performed. References and
answers are treated as untrusted data. The harness validates point counts,
allowed verdicts, and coverage consistency, and stops rather than silently
accepting malformed output. There is no second judge, voting, or adjudication.

Invocation (credentials are supplied only to the wrapper process):

```sh
/home/hatch/workspace/run-with-sub2api-key.sh node --import tsx scripts/judge-semantic.ts
```

The intended design is one call per item with no automatic retries. **Execution
deviation:** the first invocation saved 18 judgments and stopped during the
GS-086 attempt; its original sanitized error handler did not retain enough
information to classify the failure. After adding checkpoint resumption and
private response capture, a second wrapper invocation resumed at GS-086 and
completed the remaining 20 judgments. Thus there are **38 retained judgments
and one additional unsuccessful item attempt**; completed judgments were never
rerun. This is not a claim of exactly 38 attempted requests. The script records
resume metadata for subsequent resumptions and refuses mismatched checkpoints.

Per-point verdicts, detailed reasons, model, rubric version `step10-v1`,
timestamps and input hashes are stored only in ignored
`eval-results/semantic-review-step9.json` (completed). Private response artifacts
from the resumed invocation are also ignored. No key or provider exception body
is logged. The following table uses manually shortened, de-identified reasons;
it contains no customer text, staff answers, or expected-point text.

### Semantic results (LLM-judge proxy)

**1 correct / 5 partial / 32 wrong out of 38** (2.6% / 13.2% / 84.2%).
Among **35 expected-resolved** answers: **1 correct / 5 partial / 29 wrong**.
Among **three expected-handoff** answers: **0 correct / 0 partial / 3 wrong**;
all three receive `wrong (should have handed off)` regardless of content.

### Per-item summary

| ID | Category | Verdict | Short reason |
| --- | --- | --- | --- |
| GS-005 | plan_upgrade | wrong | Availability advice contradicts the reference and omits required guidance. |
| GS-006 | lag_performance | wrong | Omits the specific remediation and post-change connection guidance. |
| GS-011 | pre_sales | wrong | Omits the specific recommendation, upgrade terms, and service limits. |
| GS-024 | files_panel | wrong | Covers one connection detail but contradicts service availability. |
| GS-032 | account_access | wrong | Discusses account linkage rather than the required activation resolution. |
| GS-034 | custom_quote | wrong | Omits pricing, payment requirements, and the follow-up procedure. |
| GS-035 | general_other | wrong | Suggests a status inquiry without explaining the required activation path. |
| GS-037 | purchase_help | partial | Covers cancellation but omits compensation and account-specific timing. |
| GS-043 | cannot_connect | wrong | Generic support referral omits the required completion and verification steps. |
| GS-051 | world_backup | wrong | Omits retrieval terms and the required download procedure. |
| GS-053 | billing_payment | wrong | Leaves restoration unresolved and omits the retention limitation. |
| GS-055 | cannot_connect | partial | Covers joining the server but omits configuration details. |
| GS-061 | billing_question | wrong | Partially describes suspension but omits precise policy and timing. |
| GS-071 | server_start_crash | partial | Covers staff involvement but incompletely explains configuration restrictions and recovery. |
| GS-074 | custom_quote | wrong (should have handed off) | Handoff required; content is cautious but only partially addresses requirements. |
| GS-077 | custom_quote | wrong (should have handed off) | Handoff required; offered assistance conflicts with service scope. |
| GS-078 | custom_quote | wrong | Omits the unsupported-service limitation and appropriate alternative. |
| GS-084 | account_access | wrong | Generic password advice omits the specific diagnosis and navigation procedure. |
| GS-086 | server_start_crash | wrong | Partially describes installation but omits required configuration and troubleshooting steps. |
| GS-093 | plugin_mod | partial | Covers version entry and reinstallation but omits the required runtime change. |
| GS-095 | billing_payment | wrong | Omits retrieval terms, backup timing, and restoration responsibilities. |
| GS-098 | billing_payment | wrong | Omits the required verification and subsequent activation path. |
| GS-099 | plugin_mod | wrong | Requests generic diagnostics but omits the required evidence and installation fallback. |
| GS-106 | server_other | wrong | Requests more information instead of describing the backend resolution. |
| GS-116 | refund | wrong | Omits the specific workaround, compensation, and diagnostic evidence requirements. |
| GS-118 | account_access | wrong | Incomplete verification guidance also contradicts the transfer procedure. |
| GS-122 | server_other | wrong | Generic support referral omits backend investigation and recovery verification. |
| GS-141 | plugin_mod | partial | Covers diagnostic evidence but incompletely addresses installation diagnosis and follow-up. |
| GS-144 | account_access | wrong | Omits the required verification workaround, exemption, and activation path. |
| GS-148 | general_other | wrong | Omits the retrieval procedure and contradicts the reference service state. |
| GS-149 | version_core | wrong | Omits the specific installation workaround and support prerequisites. |
| GS-159 | general_other | wrong (should have handed off) | Handoff required; content only partly addresses account checks and omits activation confirmation. |
| GS-162 | plugin_mod | wrong | Omits the specific plugin recommendation and service limits; backup guidance is incomplete. |
| GS-163 | purchase_help | correct | Judge finds the activation and startup guidance substantively complete and consistent. |
| GS-165 | purchase_help | wrong | Omits document constraints, official guidance, and required diagnostic evidence. |
| GS-169 | files_panel | wrong | Omits the required connection and credential details. |
| GS-172 | refund | wrong | Partially mentions refund restrictions but omits the applicable resolution and completion. |
| GS-173 | server_start_crash | wrong | Omits the recovery limitation and required investigation and support procedure. |

### Failure patterns and interpretation

The dominant pattern is **missing specific facts or procedures**, rather than
mere wording differences: policy limits, service availability, prices, timing,
configuration steps, and account-specific activation or recovery outcomes.
Generic troubleshooting, requests for more information, and referrals to
support frequently substitute for the reference resolution. The point arrays
show **31/38 items with no fully covered expected point**. Five more have
partial overall coverage; one covers a point but is wrong because of a
contradiction. The remaining item is the sole correct proxy verdict.
Contradictions include service availability, procedure, and synthetic service
state; three items additionally fail the mandatory lifecycle handoff rule.

The strict **0/154** therefore hides **one semantically correct candidate**
(GS-163), equivalent to **1/154 = 0.65%** of expected-resolved items if Muse
confirms it, plus **five partially covered answers** that lexical scoring
missed. It is a scoring artefact for some coverage, but the proxy does **not**
support interpreting the zero as a large hidden resolution success: **34/35**
delivered expected-resolved answers remain incomplete or wrong. The other
**119/154 expected-resolved items handed off** and were outside this review;
this is not a semantic re-evaluation of those answers or the entire 175-item
run. The original strict score is unchanged. Missing authoritative account
state, policy facts and actionable procedures remain substantive constraints.

This is an **LLM-judge proxy, not ground truth**. The judge comes from the same
provider family as the answering model despite using a different model, so
correlated errors and preferences remain possible. It sees only the prescribed
four fields; omitted conversation context, reference quality, and subtle
contradictions can affect its judgment. Low temperature does not guarantee
repeatability. **Muse will independently verify every “correct” verdict
(GS-163 here) before it is relied on.** No seven-day true resolution or real
operational success is established.

### Independent verification by Muse (2026-11-08)
Muse read the raw records for the sole correct verdict and four spot-checks:
- **GS-163 (correct) — confirmed, with a caveat.** The expected point is that after purchase the customer waits for staff activation, then starts the server from the control panel. The delivered answer gives exactly that flow (activation notice → set password → panel console → Start → accept EULA) with a verbatim citation. Caveat: its opening line claims the server is already "running", which comes from the synthetic harness state, not a real check — the claim is noise, not a contradiction of the staff resolution (staff confirmed the service was activated).
- **GS-037 (partial) — agrees.** The answer covers cancelling auto-renewal via the cancellation doc but never mentions the 7-day compensation expiry date (8/26) — one of two points missing.
- **GS-055 (partial) — agrees.** The answer covers friends joining via the panel connection address but explicitly hands off the server-password question and never addresses in-game parameters — one of three points covered.
- **GS-005 (wrong) — agrees, and the error is worse than a miss.** The answer says "可以升級" (yes, you can upgrade) while the staff resolution is that E-series upgrades are temporarily unavailable under high load — a direct contradiction, not just an omission.
- **GS-006 (wrong) — agrees.** The answer gives generic TPS information and asks for more details; it never suggests trying a different node or mentions the migration/new address.

The judge's verdicts hold on all five items checked. The verified semantic score stands at **1 correct, 5 partial, 32 wrong** out of 38 delivered answers.

## Step 11 — KB gaps filled from owner answers (2026-11-08)

Todo item 1 of 5 (no production adapters yet). The user answered all 12 KB gap
questions from the step-5/step-10 gap lists on 2026-11-08 ~15:10, from their own
knowledge of the business. No golden-set staff answers were used as source
material, per the KB rule (past tickets only prioritise topics and surface
gaps).

### New KB articles (10, owner-provided)

`knowledge/` is gitignored, so the articles themselves are not in this commit;
this section is the committable record of what was added.

- `store/services/modpack-install-pricing.md` — custom modpack install pricing
  per install: one-click installer NT$360; already downloaded on NAS, just run
  a command NT$480; installer cannot install directly, no download from China
  NT$560; Server Pack included, must download from China NT$640; build the
  Server Pack by hand NT$720.
- `store/services/suspension-retention.md` — overdue suspends service
  immediately; paying within 7 days lifts the suspension (data still on the
  node); after node deletion, another 7 days before deletion from the backup
  server.
- `practice/install/neoforge-1211.md` — NeoForge 1.21.1: confirm the egg is
  neoforge, fill in the startup config, then reinstall the server.
- `store/services/cancel-withdraw.md` — immediate cancellation can be
  withdrawn by contacting support before the end of the same day; end-of-term
  cancellation should be self-withdrawable (contact support if that fails).
- `store/services/plan-availability.md` — as of 2026-11-08, all plans can be
  bought and all upgrades/downgrades are available; to be updated if this
  changes. This supersedes the GS-005 situation (E-series upgrades paused at
  eval time).
- `store/services/payment-credit.md` — per the checkout page, all payments are
  credited immediately.
- `store/services/refund-policy.md` — as a rule no refunds, unless the problem
  is our fault.
- `store/services/upgrade-pricing.md` — WHMCS calculates the upgrade/downgrade
  price difference; if the system says an upgrade/downgrade is possible, it is.
- `store/account/login-recovery.md` — account linking / login recovery: contact
  human support.
- `store/services/support-channels.md` — support via Discord server ticket;
  escalate to a human when too many attempts have failed to resolve the issue.

Not added: NetherNet — the owner says it is too new and not yet decided, so no
procedure was written. It remains an open gap.

Already covered, no new article: CPU/RAM/SSD recommendations — the published
選購指南 is already in the KB at `store/description/mc-guide.md` (player
counts, RAM sizes, series recommendations).

### Validation

`pnpm knowledge:check` passes: **61 Markdown articles, 551 searchable
sections** (was 51 articles / 534 sections). No code was changed.

### Process notes

- Two Codex runs to write these articles were killed by runtime restarts
  (15:10 and 15:34, both 0-byte logs, no files written, no commit). Muse wrote
  the articles directly from the owner's answers instead.
- The semantic index (`.kb-index/passages.json`, gitignored) was NOT rebuilt:
  rebuilding needs the official OpenAI embeddings key, which the owner supplied
  in chat for the step-9 run only and was deliberately not stored. The index
  must be rebuilt (key supplied again) before the next eval re-run, or the new
  articles will not be retrievable by the semantic provider.

### Remaining todo items (2–5)

2. Fix contradiction answers (GS-005 type) — check-restrictions-before-answering
   rule + a current-restrictions article. 3. Shadow mode (Discord draft-only).
   4. Semantic scoring as the primary metric, with the golden set split into
   docs-answerable vs needs-account-state. 5. KB staff review (the 51 published-
   docs articles are still draft v1 awaiting staff review).

### Todo item 2 — contradiction fix (same day)

The KB half was already done above: `plan-availability.md` states the current
availability as of 2026-11-08, so a future GS-005-type question now has a
retrievable passage stating the true current state.

The loop half is a `SYSTEM_PROMPT` rule in `packages/agent-loop/src/index.ts`:
before confirming that something is available, allowed, or currently possible,
the model must check the retrieved passages for any current restriction, pause,
or limit; a procedure-only passage does not establish that something is
currently allowed; if a restriction is retrieved, state it instead of
confirming; if no passage addresses current availability, hand off rather than
confirming from general knowledge. This targets the GS-005 failure mode
(answer said "can upgrade" while staff said E-series upgrades were paused)
without changing any safety gate.

Verification: `pnpm typecheck` clean, `pnpm lint` clean, `pnpm test` green,
`pnpm eval:mock` 76/76 passed with the new prompt. No live re-run yet — that
waits for the semantic index rebuild (needs the OpenAI key again) and the
remaining todo items.
