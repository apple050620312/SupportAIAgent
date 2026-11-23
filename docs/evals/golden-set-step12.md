# Golden set step 12 — full semantic evaluation

The November 23, 2026 run recorded all 175 items. It scored 165 and left 10 permanently unscored. The headline semantic score was **14/165 (8.48%)**. Every correct verdict was a required handoff. None of the 154 tickets expected to resolve received a fully correct resolution.

The answer model and semantic judge both used gpt-6.1-sol through sub2api with the step 10 rubric. Retrieval used the existing OpenAI embedding index with 551 passages across 61 articles. Support Core used synthetic hosting state. The agent had a 10-step cap and a 60-second deadline. The SDK reported that the model ignores temperature. This run did not measure seven-day resolution.

## Semantic results

Percentages in the four verdict columns use all items in the row. The last column uses only scored items, following the harness convention.

| Group | Total | Scored | Correct | Partial | Wrong | Unscored | Correct among scored |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Overall | 175 | 165 | 14 (8.00%) | 11 (6.29%) | 140 (80.00%) | 10 (5.71%) | 14/165 (8.48%) |
| Docs-answerable | 13 | 12 | 0 (0.00%) | 2 (15.38%) | 10 (76.92%) | 1 (7.69%) | 0/12 (0.00%) |
| Needs-account-state | 102 | 99 | 13 (12.75%) | 6 (5.88%) | 80 (78.43%) | 3 (2.94%) | 13/99 (13.13%) |
| KB-gap | 60 | 54 | 1 (1.67%) | 3 (5.00%) | 50 (83.33%) | 6 (10.00%) | 1/54 (1.85%) |

The agent handed off **113/175 (64.57%)**. The reference called for a handoff on 21 items. Of those, 14 were handed off, six ended without a handoff, and one was unscored. The other 99 handoffs were on tickets labeled should-resolve. The rubric treats these as wrong even when the synthetic setup lacks the account state required to resolve them.

Strict lexical matching was **0/154 (0.00%)** for should-resolve items. The lexical diagnostic also counted 14 correct handoffs, zero partial matches, and 161 wrong rows. It includes agent errors in its wrong count.

## Failure patterns

- **Docs-answerable.** Eight of 13 went to handoff, accounting for eight of the ten wrong verdicts. Delivered answers missed required steps. GS-094 covered the version setting but omitted the reinstall after changing it. GS-049 recommended downloading backups but omitted the explicit warning that files are lost after cancellation.
- **Needs-account-state.** Fifty-six wrong verdicts came from handoffs on should-resolve tickets. Delivered answers also lacked backend facts or actionable next steps for staff. GS-061 explained the retention window but omitted the exact suspension time. GS-122 routed to Discord without addressing the backend power error or asking the customer to verify that service was restored. GS-158 incorrectly told the customer that support could not apply JVM flags, contrary to the staff resolution.
- **KB-gap.** Thirty-five wrong verdicts came from handoffs on should-resolve tickets. Generic guidance missed specific workarounds, such as the manual NeoForge upload after an installer error in GS-149 and the Java runtime setting in GS-142. The group also includes past policies that conflict with current guidance.

GS-005 was graded wrong against the historical E-series upgrade pause. Its availability claim agrees with the November 8 owner update in the indexed plan availability article, which says all plans can be upgraded. Its other omissions still matter. GS-166 followed the current upload guide's restriction on uploading folders through the web panel, while the historical reference allowed direct drag and drop. GS-153 recommended the documented end-of-term cancellation procedure and discouraged relying on nonpayment, which the reference accepted. These cases retain their original grades. They show why a judge-reported contradiction needs to be checked against the current KB before treating it as a policy violation.

## Unscored items and checkpoint

Nine items logged the 60-second agent deadline on all three attempts. They were **GS-011, GS-018, GS-020, GS-054, GS-055, GS-057, GS-058, GS-111, and GS-125**. **GS-043** was carried forward as a deadline failure from the earlier run. The stored row records an agent error after 59.6 seconds and contains no explicit timeout exception, so the checkpoint alone cannot confirm its cause.

The private checkpoint is `eval-results/golden-2026-11-23T07-13-56-915Z-175.json`. The resumed run took **31m 40s** and the checkpoint records **2h 15m 59s** of accumulated eval time across sessions. A temporary runner copy skipped all 121 recorded rows because the stock resume command retries rows with null verdicts. The harness wrote the final summaries and exited with code 1 while keeping the checkpoint marked `running` because unscored rows remain. The checkpoint contains each ID from GS-001 through GS-175, and the summary totals were independently recomputed from those rows.
