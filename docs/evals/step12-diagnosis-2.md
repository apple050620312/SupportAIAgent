# Step 12 diagnosis 2: delivered drafts remain wrong

Date: 2026-11-23
Checkpoint: `eval-results/golden-2026-11-23T13-06-46-542Z-13.json`
Scope: the 13 docs-answerable items in clean rerun 5

## Finding

The citation-gate change is no longer the primary bottleneck. Rerun 5 used OpenAI semantic retrieval, the same index digest as rerun 3, and the same eight recorded search passages for every item. It produced 0 correct, 0 partial, and 13 wrong, with 11 handoffs. The gate passed six items, compared with one in rerun 3, but the primary score did not move. Two answers were delivered without handoff, GS-023 and GS-163, and both were wrong.

The dominant problem is answer production and lifecycle control. The loop frequently has enough documentation to give a useful answer, then emits a generic handoff or lets an irrelevant or incomplete draft through. Counts below are overlapping diagnostic counts because one draft can have several defects.

## Item-level review

| Item | Observed failure | Evidence against the expected resolution |
| --- | --- | --- |
| GS-018 | Premature handoff after optional reads failed. The stored draft already gives the documented SFTP fallback, but the final answer is “我不知道…已轉交人工客服”. | Staff resolution is to use SFTP for the single-mod upload error. Tool errors were logs 404 and invoice 403. |
| GS-023 | Wrong procedure and irrelevant retrieval. The delivered answer discusses copying the panel address and DiscordSRV, while the reference requires DNS-cache refresh, Google DNS, and retrying. | No handoff, gate pass. The draft never gives the three expected DNS actions. |
| GS-030 | Wrong procedure and incomplete answer. It recommends `fast-line.tw` and `udp.cfh.tw`, while the staff resolution is DNS-cache refresh, automatic route switching, and Google DNS. | Handoff despite a gate pass. The answer omits the current KB route-switching guidance and the expected DNS steps. |
| GS-049 | Premature handoff after invoice/log reads failed. | Staff resolution says cancellation does not preserve files, so the customer must download before expiry, and cancellation prevents a new bill. |
| GS-053 | Contradictory or stale facts plus incomplete conclusion. It says the server is running, then gives the 7-day suspension rule, but does not answer the ticket’s expired-service recovery question and leaves the conclusion for staff. | Expected answer is that data is retained at most 14 days and cannot be restored after that. Tool errors were invoice 403 and logs 404. |
| GS-056 | Premature handoff. | The expected procedure is reinstall from Settings, then start the server to recreate the world. |
| GS-062 | Premature handoff. | The expected routing is an after-sales support ticket, with general tickets and repeated tickets not accelerating service. |
| GS-084 | KB contradiction and premature handoff. The answer cites the current login-recovery article saying human support is required, although this item’s expected resolution is the customer-center password-change path. | Gate passed and no tool error occurred, yet the answer gives no password-change steps. This is a reference/current-KB conflict that needs staff adjudication. |
| GS-094 | Premature handoff. | The expected procedure is enter the new Minecraft version in Startup Settings, then reinstall from Settings. |
| GS-108 | Premature handoff despite a substantively correct direction. The draft cites the missing-`server.jar` article but asks the customer to report back instead of giving the reinstall step. | Handoff-content judge marked this draft correct, while lifecycle scoring marked it wrong. |
| GS-140 | Wrong routing and incomplete answer. It investigates mod-loader state and does not tell the customer to stop duplicate tickets, use after-sales support, and wait. | The staff resolution is a support-process answer, not a Forge diagnosis. |
| GS-163 | Wrong procedure and missing prerequisite. It tells the customer to connect to a running server and describes panel navigation, but does not lead with the required service-opening prerequisite. | No handoff and gate pass. The expected point is that support must open the purchased service before use. |
| GS-166 | Premature handoff. | The expected answer is SFTP for files over 10 MB, with drag-and-drop folder support and the destination depending on file type. |

## Ranked failure modes

1. **Premature or unjustified handoff: 11/13 final answers.** GS-018, 049, 053, 056, 062, 084, 094, 108, 140, and 166 handed off, plus GS-030. Several had enough KB evidence to provide at least the documented first steps. GS-108 is the clearest control: the handoff-content judge found the draft correct, but the lifecycle result was still wrong.

2. **Missing required procedure or answer structure: 10/13.** The drafts commonly mention adjacent facts without completing the short staff procedure. Examples are GS-023, GS-030, GS-049, GS-053, GS-056, GS-062, GS-094, GS-140, GS-163, and GS-166. The expected answers are usually two or three concrete steps, while the drafts spend tokens on status uncertainty or unrelated documentation.

3. **Wrong or unsupported procedure: 4/13.** GS-023 and GS-030 substitute panel-address or anti-DDoS routing advice for DNS-cache and Google-DNS guidance. GS-140 substitutes Forge deployment diagnosis for after-sales ticket routing. GS-163 leads with connecting to a running server instead of service activation.

4. **Irrelevant or poorly controlled retrieval use: at least 3/13.** GS-023 cites panel start and DiscordSRV passages that do not answer the DNS incident. GS-030 selects the anti-DDoS route-switch passage and omits the current automatic-switching instruction. GS-163 uses general panel navigation but fails to apply the service-opening condition. The checkpoint proves search admission was stable, so this is evidence selection and answer use after retrieval, not a changed index.

5. **Contradictory or stale knowledge handling: 2/13 clear cases.** GS-084 follows the current login-recovery article and conflicts with the golden reference’s password-change resolution. GS-053 mixes the 7-day suspension article with an unresolved 14-day conclusion. These require explicit current-KB/reference adjudication before changing wording.

6. **Citation quality or gate behavior: not the primary cause.** Six gate passes did not improve the score. GS-023, GS-030, GS-053, GS-084, GS-140, and GS-163 passed the relaxed gate while remaining wrong or incomplete. A passing citation establishes only that a cited span exists, not that the answer’s main claim follows from it.

## What the evidence rules out

- **The citation gate as the main score bottleneck.** Gate passes rose from 1 to 6 with 0/13 primary-score improvement. GS-163 passed and was wrong. The gate can still affect handoff behavior, but it does not explain the delivered-draft errors.
- **A retrieval-index change between rerun 3 and rerun 5.** The checkpoint records OpenAI retrieval, the same index digest, and identical source/start/end/excerpt tuples for all 104 recorded search passages.
- **A general absence of evidence.** GS-018, GS-030, GS-049, GS-053, GS-084, GS-094, GS-108, GS-140, GS-163, and GS-166 contain either relevant admitted passages or drafts that quote relevant KB material. The failure is selecting, applying, or completing the answer.
- **The semantic judge alone.** The judge was bypassed for final handoffs, which explains why handoff drafts are scored wrong by lifecycle. The separate handoff-content verdict marked GS-108 correct and GS-018/049/053 partially useful. That disagreement demonstrates a lifecycle/answer-quality measurement problem, while GS-023 and GS-163 remain wrong even when delivered.
- **A model-provider switch in this checkpoint.** Rerun 5 used `gpt-6.1-sol` through sub2api as specified. The evidence does not isolate model capability from prompt, tool-error, and lifecycle behavior, so it does not justify blaming the model yet.

## Recommended fixes, in verification order

1. **Make documented first-step completion survive optional tool errors.** When logs or invoice reads fail, require the loop to answer every supported KB point before considering handoff. Verify with GS-018, GS-049, GS-056, GS-094, and GS-166 using the same checkpoint scoring.
2. **Add a short answer-completeness check against the retrieved task.** Before finalizing, require the draft to cover the concrete procedure and condition fields represented by the top relevant passages. Verify GS-023, GS-030, GS-094, and GS-163 separately.
3. **Improve evidence selection and contradiction handling.** Prefer passages that directly answer the customer’s symptom and apply current restriction/availability passages before adjacent tutorials. Resolve GS-084 and GS-053 with a staff decision before changing the KB. Verify each item independently.
4. **Separate content verdict from lifecycle handoff in evaluation output.** Score every handoff draft with the same semantic rubric and retain the lifecycle result. This makes useful handoffs visible and prevents a generic fallback from hiding the preceding draft’s quality.
5. **Tighten citation validation around claim support.** Keep the relaxed exact-pair gate as an instrumentation signal, then add a claim-to-citation support check for the main procedural sentence. Verify that this changes only grounding diagnostics on GS-023, GS-030, GS-053, GS-084, GS-140, and GS-163.
6. **Defer the gpt-6-luna comparison.** The checkpoint does not show that gpt-6.1-sol is the bottleneck. The dominant defects are handoff policy, answer completion, evidence selection, and unresolved KB/reference conflicts. A model comparison becomes informative after fixes 1–4 produce a stable delivered-draft baseline.

No live traces were needed. The checkpoint and golden-set references were sufficient to classify all 13 items. No agent, KB, or harness code was changed.
