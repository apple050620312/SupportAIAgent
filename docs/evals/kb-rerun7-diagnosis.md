# KB rerun 7 diagnosis

Rerun 7 reproduced the earlier diagnosis's handoff pattern in part. Three drafts passed both checks and explicitly requested staff, while two failed validation. None of the five handoff drafts scored correct. Removing handoffs alone would leave substantial answer gaps.

The checkpoint is `eval-results/golden-2026-11-23T14-54-48-731Z-6.json`. Its dataset hash matches the external golden set. This review compares the last nonempty model draft, the recorded reply, tool events, validation results, and the staff reference for each item. The checkpoint records gpt-6.1-sol via sub2api, synthetic hosting state, and OpenAI semantic retrieval with text-embedding-3-small. The local index has the recorded digest prefix `898c35b5b203`, 71 articles and 566 passages. See [rerun 7 results](golden-set-step12-kb-rerun-7.md) and [the earlier docs diagnosis](step12-diagnosis-2.md).

| Measure | Result |
| --- | --- |
| Primary semantic, baseline → rerun | 0 correct / 0 partial / 6 wrong / 0 unscored → 1 / 0 / 5 / 0 |
| Lifecycle handoffs, baseline → rerun | 1/6 → 5/6 |
| Handoff draft semantic | 0 correct / 1 partial / 4 wrong / 0 unscored |
| Lexical correct | 0/6 |
| Citation gate | 4 passed / 2 failed / 0 unevaluated |
| Completeness check | 5 passed / 1 failed / 0 unevaluated |
| Target passage in search evidence and cited in a draft | 5/6, with 1/6 delivered without handoff |
| Execution | 6/6 first attempt, 0 retries, 0 runner errors, 0 recorded model failures, 6/6 final finish reason stop |

## Item traces

| Item | Delivery decision | Draft, evidence and reference gaps |
| --- | --- | --- |
| GS-041 | Model requested handoff. Citation and completeness passed. Synthetic status returned running and logs returned HTTP 404. Neither read was mandatory under the prompt matcher. The 404 limited diagnosis and did not independently trigger handoff. The reply kept the draft and appended a handoff notice. | The draft exactly cited the admitted `panel/config/docker-image-switching.md:1-11`, gave Startup Settings → Docker Image and Settings → Reinstall, and asked staff to confirm Java 8 availability and address the reported lock. The reference ties Java 25 to the Netty failure on Minecraft 1.8.3, says to use Java 8, and records staff enabling self-service. The draft left both points unresolved. The article establishes general self-service and version compatibility caution. It does not verify the field on this account, the exact runtime or the root cause. Draft verdict wrong. |
| GS-042 | Citation and completeness both failed. No marker or tool error. The blockquote prefixed each line of the target excerpt, so it did not match verbatim. All five citation occurrences were excerpt mismatches and zero pairs matched. The draft had actions and exceeded the length floor but lacked a recognized excerpt prefix for completeness. The final reply was generic. | The target `practice/install/modpack-world-preservation.md:1-12` was returned and cited in the draft only. The draft advised stopping, backing up the world, replacing the pack, generating a new world and testing. It missed archiving all server files, leaving the archive on the server without affecting the new pack, changing Java in Startup Settings, and interpreting Paper in the logs as a plugin server. The owner passage describes world backup, and the returned Java recovery section describes manual server-pack installation. The Java and Paper points came from later ticket context rather than the opening request. Draft verdict wrong. |
| GS-096 | Model requested handoff after both checks passed, with zero tool errors. One exact pair outweighed a mismatched repeat of the same citation. The reply kept the draft and appended a handoff notice. | The draft exactly cited admitted `practice/advanced/test-server.md:1-7` and gave the current Discord channel and retry procedure. It asked staff to verify the customer's old hostname and 26.3 support even though the owner article delegates address and rules to the announcement. The reference expects the historical address, 26.2 instead of 26.3, and L-series guidance for proxy versus multiplayer use. All three were missing. The target article supplies none of those specifics, and sizing was outside the opening request. Draft verdict wrong. |
| GS-105 | Citation failed despite one matched connection excerpt and a passing completeness check. Two WARP citations had wrong line ranges, which vetoed the match. The draft also requested handoff. Status returned running and the optional logs read returned HTTP 404. The final reply was generic. | The draft gave panel address and port guidance, then network blocking, DNS and WARP troubleshooting. It omitted asking whether Paper had recently been downgraded and the conditional world replacement and restart from the reference. The downgrade article adds backing up first and using a new or compatible backup world. It was neither returned as search evidence nor cited. Draft verdict wrong. |
| GS-138 | Model requested handoff after both checks passed, with zero tool errors. One exact pair passed despite an adjacent traffic excerpt mismatch. The reply kept the draft and appended a handoff notice. | The draft exactly cited admitted `practice/advanced/velocity.md:1-9`, confirmed hosted Velocity with external Paper subject to terms, and said backend connection quality was unguaranteed. It then escalated plan inventory and plan-specific restrictions after the owner article answered the architecture and policy question. The reference also attributes the lack of guarantee to special network processing, which the owner passage does not state. Draft verdict partial. |
| GS-084 (control) | Citation and completeness passed, with no marker, no tool error and a normal stop. The runner delivered the answer. | The draft exactly cited admitted `store/account/login-recovery.md:12-19` and gave both expected points, the password change and the Customer Center → Products & Services → select service → Change Password path. It told the customer to retry and framed staff help as a next step only if self-service failed. The rewritten article distinguishes panel credentials from Discord linking, so the answer had a complete action with no remaining blocker for the stated request. Primary verdict correct. |

## GS-105 retrieval ranking

The downgrade passage `practice/advanced/version-downgrade.md:1-12` exists in the unchanged index and was returned for GS-041. For GS-105 the checkpoint's eight search candidates, in recorded hybrid rank order, were:

| Rank | Passage | Raw cosine |
| --- | --- | --- |
| 1 | `debug/connection.md:72-78` | 0.5835 |
| 2 | `debug/connection.md:23-32` | 0.5606 |
| 3 | `debug/warp.md:102-112` | 0.5569 |
| 4 | `debug/connection.md:33-47` | 0.5415 |
| 5 | `debug/connection.md:48-54` | 0.5379 |
| 6 | `store/description/mc-guide.md:141-146` | 0.5393 |
| 7 | `debug/warp.md:129-140` | 0.5188 |
| 8 | `debug/warp.md:24-30` | 0.5363 |

The search ranks the original customer wording by cosine plus a reciprocal lexical bonus, then cuts to eight. The harness records those eight raw search responses and their cosine scores before the runner's 0.40 filter. All eight cleared it. Companion reads stay within articles already admitted. The target therefore missed at candidate selection, with hybrid rank at least nine. The checkpoint retains neither its exact rank nor its cosine. The opening prompt mentions Paper, encryption and the address, with no downgrade cue. That fits the observed network-heavy ranking, though the checkpoint cannot isolate the relative contributions of semantic similarity and lexical bonus. A second live answer would not recover the historical ranking. See [semantic search](../../apps/support-core/src/adapters/semantic-knowledge-provider.ts), [the runner](../../packages/agent-loop/src/index.ts), and [checkpoint instrumentation](../../scripts/eval-golden.ts).

## Ranked causes

1. **The model escalated unresolved details after giving supported guidance.** This directly triggered 3/5 handoffs with both checks passing. GS-138 most clearly escalated beyond the question, and GS-096 asked staff to verify details the owner directs customers to check in Discord. GS-041 had a legitimate unresolved account-specific lock and runtime question. The evidence does not support calling all three handoffs unnecessary.
2. **Draft coverage lagged behind the reference even with the target article.** All five drafts missed or only partially covered at least one expected point. Some missing points require account verification, current information outside the KB, or follow-up context, as GS-041, GS-042 and GS-096 illustrate. GS-138 is missing a historical rationale from the owner article. The completeness check tests length, an action word and a 24-character excerpt prefix. Its five passes cannot establish procedural coverage, and its GS-042 false result overlaps with the formatting defect.
3. **Citation formatting and line-range errors caused two validation blockers.** GS-042 had zero exact pairs. GS-105 had a pair but wrong line ranges vetoed it, and the model also requested handoff. The gate discarded actionable draft text in both cases. Neither draft was judged correct.
4. **One retrieval miss directed the draft toward the wrong troubleshooting branch.** GS-105's eight network-heavy candidates displaced the indexed downgrade guide. No other item missed its target passage.

## Causes the trace rules out

- **A general retrieval or index failure.** The target appeared in five searches, the sixth target was present in the index, and GS-105's eight candidates cleared admission. The checkpoint confirms semantic retrieval.
- **Optional read errors as the automatic handoff mechanism.** Only GS-041 and GS-105 had log 404s, and neither matched the required-read rules. Three handoffs had zero tool errors.
- **The citation gate as the sole cause.** Three handoffs passed it. The separate draft judgments found zero correct even before lifecycle penalties.
- **Deadline, provider outage or judge-triggered routing.** All six attempts finished normally with no recorded model failures. Handoff is decided before scoring. The primary scorer assigns a wrong result to unexpected handoffs, and the separate draft judge supplies the 0/1/4 content split. The same model and provider delivered the control, and this run does not isolate model capability.

## Ranked fix targets and verification

1. **Scope handoff to the unresolved part of the actual request.** Verify GS-138 delivers the policy and quality caveat without escalating unasked inventory questions, GS-096 gives the documented Discord check and retry before any staff request, and GS-041 still escalates a genuinely unresolved lock while preserving useful guidance. Keep GS-084 as the no-handoff control.
2. **Check coverage against the current passages and adjudicate historical expectations.** Verify GS-042 preserves the documented backup and migration steps and scores later Java and Paper questions on turns where they are asked. Review GS-041's account action, GS-096's live address/version versus Discord guidance, and GS-138's historical network rationale with the owner before treating them as promises or facts. Track the current-policy verdict alongside the historical one.
3. **Make verbatim citations reliable.** Replay GS-042 with an unmodified excerpt and confirm both gates pass for a supported procedure. Replay GS-105 with valid returned ranges and ensure wrong-line citations still fail. Record citation, completeness and marker decisions separately so an apparent improvement in delivery can be checked against draft quality.
4. **Recover the downgrade branch for symptom-only questions.** Verify GS-105 can admit the downgrade article through a bounded symptom-aware search or follow-up and explain the conditional backup, compatible/new world and restart sequence. Capture candidate rank and admission scores, and verify GS-084 still retrieves the password section. Keep the same index, provider and deadline for the comparison.

The saved trace establishes the delivery branches and the retrieval cutoff. No live run was needed.
