# Golden set docs rerun 18 diagnosis

Rerun 18 does not meet the pass standard. The clean checkpoint scored **4 correct, 2 partial, 2 wrong, 5 unscored and 1 handoff**. It used code `7c03658`, `gpt-6.1-sol` through sub2api, temperature 0.2, a 60-second answer limit and the clean index `6b7b4b6d68e2`. The provider reported that it ignores the requested temperature. The checkpoint and report support several concrete observations, but they do not support attributing every movement to option A or to the focused-search changes.

## Per-item diagnosis

| Item | Rerun 17 → rerun 18 | Diagnosis |
|---|---|---|
| GS-018 | Partial, delivered → unscored | Three answer timeouts. There is no new durability evidence for the rerun-17 gain. |
| GS-023 | Wrong, handoff → correct, delivered | Ten verbatim citation matches, including connection and Google DNS material. Prompt and retrieval both changed, so the prompt effect is confounded. |
| GS-030 | Wrong, handoff → unscored | Three answer timeouts. The final attempt retrieved both focused passages, automatic failover 1–7 and Google DNS 1–12, but produced no completed admission or delivery trace. |
| GS-049 | Wrong, delivered → unscored | Agent error after two attempts, one of which timed out. Retention policy remains an owner decision. |
| GS-053 | Wrong, delivered → unscored | No scored answer. The retention and restoration ruling remains open. |
| GS-056 | Wrong, handoff → wrong, handoff | The clean settings passage ends at 1–14, so completeness withheld restart and world-reset claims. The separate fix-4 sample admitted 1–16 and scored correct. This is one sample per corpus and does not establish an effect size. |
| GS-062 | Wrong, handoff → partial, delivered | Routing 6–43 and duplicate-policy 6–17 were admitted. The answer included after-sales routing and no-speedup guidance, but the judge found no explicit distinction from general support. |
| GS-084 | Correct → correct | Stable. |
| GS-094 | Correct → correct | Stable after retries. |
| GS-108 | Correct, delivered → unscored | Three answer timeouts. There is no durability evidence for the rerun-17 gain. |
| GS-140 | Wrong, delivered → partial, delivered | Neither policy article was admitted. The judge credited routing and duplicate advice, but the answer omitted explicit advice to wait for staff. The score gain does not validate the routing change. |
| GS-163 | Correct → correct | Stable. |
| GS-166 | Partial, delivered → wrong, delivered | SFTP and folder transfer were covered. The destination by file type is absent. The judge also found the 100 MB panel advice conflicts with the staff reference's 10 MB threshold. The threshold question is an eval/reference conflict until the owner resolves it. |

## Timeout diagnosis

The checkpoint records item-level latency of 183,479 ms for GS-018, 183,030 ms for GS-030, 183,029 ms for GS-053 and 183,035 ms for GS-108. Each made three attempts and each recorded three `TimeoutError` model failures. GS-049 recorded 120,809 ms over two attempts, one timeout, followed by an agent error. GS-030's last attempt had 45 event-log entries and six steps, including successful searches and reads. GS-018 had 32 events over eight steps, GS-053 39 over nine steps and GS-108 36 over twelve steps. These figures are consistent with repeated 60-second answer limits and show that the failures happened during answer generation after tool work, but the checkpoint does not expose per-attempt provider durations.

The evidence cannot distinguish provider latency variance from model slowness. The focused searches add work for GS-030, and the other timed-out items show that timeouts were not limited to that new path. Nothing in the checkpoint demonstrates a deterministic regression in the new code. Repeat sampling with the same code, model, corpus, prompt and timeout, while retaining per-attempt timestamps and tool counts, is required. A control sample with the focused searches disabled and repeated runs of GS-018, GS-030, GS-108 and GS-053 would separate retrieval overhead from provider variance. The provider's ignored-temperature notice means temperature 0.2 cannot be treated as a controlled variable.

## Attribution and remaining gaps

GS-023 improved after option A and retrieval changes together. The run shows that the new draft can pass the citation gate with ten exact matches, including both core procedures. It does not isolate option A. Replay the old retrieval with the new prompt, and the new retrieval with the old prompt, or run controlled scratch prompts against identical retrieved passages. Score admission, exact matches and substantive coverage separately.

GS-030 reached the focused-search result but stopped before a completed answer. The checkpoint contains both target spans in `evidence` and no entries in `admittedEvidence`, with no citation-gate or semantic verdict. The missing transition is therefore admission and delivery under timeout, not retrieval recall. A completed repeat must record both spans admitted, the automatic-switch and DNS rationale in the answer, and a delivered verdict.

GS-062's remaining defect is coverage wording. Both relevant policy families were admitted and the answer carried routing and no-speedup meanings. The judge still required an explicit distinction from general support. Verify that prompt instructions and the coverage check require that distinction, while retaining the negative control that an existing-ticket-only answer is incomplete.

GS-166 has two independent gaps. Destination by file type remains a knowledge-base gap pending the owner's confirmation, so no destination should be invented. The 100 MB versus 10 MB conflict is an eval/reference or policy-version issue until the owner identifies the current threshold and scope. GS-140's gain occurred without admitted policy evidence, so it provides no validation of the routing change.

GS-018 and GS-108 need repeated clean samples before the rerun-17 gains can be called durable. GS-049 and GS-053 remain retention-policy conflicts. Owner rulings must reconcile cancellation and nonpayment timing, restoration eligibility, and the current rule before code or prompt attribution is meaningful. The conventions report section 5 also remains pending owner review.

## Ranked targets and verification criteria

1. **Timeout observability and repeat sampling.** Run at least three paired clean repetitions for GS-018, GS-030, GS-053 and GS-108, plus GS-049. Save per-attempt start/end times, model failures, tool counts, retrieved and admitted spans, draft, delivery and verdict. Repeat GS-030 with and without focused searches. Do not attribute a code change unless the confidence interval and failure pattern separate it from provider variance.
2. **GS-023/GS-030 prompt and admission isolation.** Hold corpus, model and judge fixed while crossing old/new prompt and old/new retrieval. Require GS-023's flush, Google DNS and conditional rejoin. Require GS-030's automatic failover and qualified DNS-update rationale, with exact admitted sources and no fabricated labels.
3. **GS-062 coverage contract.** Require admitted routing and duplicate-policy evidence, after-sales routing, explicit no-speedup guidance and the distinction from general support. Re-run GS-140 as a negative control and preserve handoff when the account blocker is real.
4. **Owner policy and KB decisions.** Obtain the retention ruling for GS-049/GS-053 and the GS-166 threshold and destination-by-file-type ruling. Rejudge identical saved drafts against the approved current references. Do not implement or evaluate a destination claim before the owner supplies it.
5. **GS-056 corpus pairing.** Repeat clean and fix-4 samples with identical code, model and judge settings. Confirm clean withholds unsupported restart/reset claims and fix-4 delivers both supported claims.

The unchanged controls GS-084, GS-094 and GS-163 should remain in the next clean comparison.
