# Rerun 13 — full docs-answerable group

**4 correct / 4 partial / 5 wrong / 0 unscored, 2 handoffs.** All 13 docs-answerable items ran from main at `fc2fd8c` with `gpt-6.1-sol` via sub2api, the existing semantic index, and the 60-second per-question limit. Checkpoint: [`golden-2026-11-23T19-17-04-458Z-13.json`](../../eval-results/golden-2026-11-23T19-17-04-458Z-13.json). The command completed on its first run and every item recorded one attempt.

Retrieval verification: official OpenAI (`openai`), `text-embedding-3-small`, index digest `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`, 71 articles and 566 passages.

[Rerun 12](golden-set-step12-kb-rerun-12.md) measured only the six wrong items from rerun 11 and scored 1 correct / 2 partial / 3 wrong, with 0 handoffs. Rerun 13 measures those fixes across the entire group, including the seven items previously graded correct or partial.

**Two of those seven regressed vs rerun 11. GS-062 went from partial to wrong and was still delivered. GS-163 went from correct and delivered to wrong and handed off.**

## Per-item results

Gate and completeness values are the final checkpoint values. The passage shown is the highest recorded semantic score among admitted passages with a matching source and start line. Scores are rounded to six decimals.

| Item | Verdict | Delivery | Citation gate | Completeness | Top admitted passage and score | Note |
| --- | --- | --- | --- | --- | --- | --- |
| GS-018 | partial | Delivered | passed | true | `practice/install/mod.md:101-233` (0.535086) | SFTP fallback covered. The judge wanted the panel upload connection checked before the filename. |
| GS-023 | partial | Delivered | passed | true | `panel/start-server.md:15-38` (0.601275) | DNS flush and Google DNS covered. Omitted the expected reconnect outcome once DNS works. |
| GS-030 | partial | Delivered | passed | true | `debug/connection.md:23-32` (0.608419) | Covered DNS flush and Google DNS. Omitted automatic route switching and faster DNS updates. |
| GS-049 | correct | Delivered | passed | true | `store/services/cancel.md:1-18` (0.562479) | Explained eventual file deletion, downloading a backup, and avoiding new bills with end-of-term cancellation. |
| GS-053 | partial | Delivered | passed | true | `store/services/upgrade.md:13-53` (0.602915) | Explained the 14-day retention window. Did not say this customer was past it and restoration was unavailable. |
| GS-056 | wrong | Delivered | passed | true | `store/services/suspension-retention.md:14-17` (0.536398) | Warned about lost progress but omitted the full reset explanation and reinstall/start steps. |
| GS-062 | wrong | Delivered | passed | true | `debug/connection.md:9-13` (0.557531) | Directed the customer to the current ticket and omitted the after-sales and duplicate-ticket guidance. |
| GS-084 | correct | Delivered | passed | true | `store/account/login-recovery.md:12-19` (0.619416) | Explained the password change and gave the correct customer portal path. |
| GS-094 | correct | Delivered | passed | true | `panel/config/startup.md:10-13` (0.639749) | Gave Startup Settings version 26.3 and the reinstall step. |
| GS-108 | correct | Delivered | passed | true | `debug/nojar.md:31-38` (0.494292) | Recommended reinstalling for a missing JAR and requesting the full error if startup still fails. |
| GS-140 | wrong | Delivered | passed | true | `practice/install/neoforge-1211.md:1-11` (0.639755) | Omitted after-sales routing, avoiding duplicate tickets, and waiting for technical staff. |
| GS-163 | wrong | Handoff | failed | true | `panel/start-server.md:1-14` (0.706594) | Cited excerpts did not match. The draft also omitted the need to wait for support activation. |
| GS-166 | wrong | Handoff | failed | true | `store/description/palworld.md:8-18` (0.555973) | Cited excerpts did not match. The draft also omitted that the SFTP destination depends on file type. |

## Comparisons

| Run | Correct | Partial | Wrong | Unscored | Handoffs |
| --- | ---: | ---: | ---: | ---: | ---: |
| Rerun 13 | 4 | 4 | 5 | 0 | 2 |
| Rerun 11 | 1 | 6 | 6 | 0 | 4 |
| Rerun 13 minus rerun 11 | +3 | −2 | −1 | 0 | −2 |
| Step 12 baseline (docs group) | 0 | 2 | 10 | 1 | 8 |
| Rerun 13 minus baseline | +4 | +2 | −5 | −1 | −6 |

The comparisons use the [rerun 11 checkpoint](../../eval-results/golden-2026-11-23T17-40-32-806Z-13.json) ([report](golden-set-step12-docs-rerun-11.md)) and the baseline checkpoint `eval-results/golden-2026-11-23T07-13-56-915Z-175.json` named in the [step 12 report](golden-set-step12.md). GS-018 was the only baseline item unscored. It recorded an agent error after the deadline retries.

Compared with rerun 11, verdicts improved for GS-023, GS-049, GS-084, GS-094, and GS-108. Verdicts regressed for GS-062 and GS-163 and were unchanged for GS-018, GS-030, GS-053, GS-056, GS-140, and GS-166. GS-084, GS-108, and GS-140 switched from handoff to delivery. GS-163 switched from delivery to handoff. Delivery status was unchanged for the other nine items.

| Item | Step 12 baseline | Rerun 11 | Rerun 13 | Change vs rerun 11 |
| --- | --- | --- | --- | --- |
| GS-018 | unscored / Error | partial / Delivered | partial / Delivered | Verdict unchanged, delivery unchanged |
| GS-023 | wrong / Handoff | wrong / Delivered | partial / Delivered | Verdict improved, delivery unchanged |
| GS-030 | wrong / Handoff | partial / Delivered | partial / Delivered | Verdict unchanged, delivery unchanged |
| GS-049 | partial / Delivered | partial / Delivered | correct / Delivered | Verdict improved, delivery unchanged |
| GS-053 | wrong / Handoff | partial / Delivered | partial / Delivered | Verdict unchanged, delivery unchanged |
| GS-056 | wrong / Handoff | wrong / Delivered | wrong / Delivered | Verdict unchanged, delivery unchanged |
| GS-062 | wrong / Handoff | partial / Delivered | wrong / Delivered | Verdict regressed, delivery unchanged |
| GS-084 | wrong / Handoff | wrong / Handoff | correct / Delivered | Verdict improved, delivery improved |
| GS-094 | partial / Delivered | partial / Delivered | correct / Delivered | Verdict improved, delivery unchanged |
| GS-108 | wrong / Handoff | wrong / Handoff | correct / Delivered | Verdict improved, delivery improved |
| GS-140 | wrong / Handoff | wrong / Handoff | wrong / Delivered | Verdict unchanged, delivery improved |
| GS-163 | wrong / Delivered | correct / Delivered | wrong / Handoff | Verdict regressed, delivery regressed |
| GS-166 | wrong / Delivered | wrong / Handoff | wrong / Handoff | Verdict unchanged, delivery unchanged |

## Items still wrong

- **GS-056** omitted that deleting all server data resets the world and skipped the Settings reinstall and subsequent start.
- **GS-062** directed the customer to the current ticket and omitted the after-sales route and guidance against duplicate tickets.
- **GS-140** omitted after-sales routing, avoiding duplicate tickets, and waiting for technical staff.
- **GS-163** handed off after citation excerpts failed to match. The draft omitted that the customer must wait for support to activate the service.
- **GS-166** handed off after citation excerpts failed to match. The draft omitted that the SFTP destination depends on file type.
