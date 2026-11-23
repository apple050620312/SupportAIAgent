# Step 12 docs-answerable subset rerun 11

Checkpoint `golden-2026-11-23T17-40-32-806Z-13.json` completed 13 selected docs-answerable items with `gpt-6.1-sol`. The semantic headline is **1 correct / 6 partial / 6 wrong / 0 unscored**, with **4 handoffs**.

| Item | Verdict | Delivery | Citation gate | Completeness | Top admitted passage and score | Note |
| --- | --- | --- | --- | --- | --- | --- |
| GS-018 | Partial | Delivered | Pass | Pass | `practice/install/mod.md:101-183` (0.5351) | Suggested renaming before SFTP, but did not focus on checking whether the panel upload connection was the cause. |
| GS-023 | Wrong | Delivered | Pass | Pass | `practice/advanced/automation.md:228-235` (0.5978) | Focused on alternate addresses and upstream routing, omitting DNS flush, Google DNS, and normal rejoin guidance. |
| GS-030 | Partial | Delivered | Pass | Pass | `debug/warp.md:129-140` (0.5785) | Included DNS flush and Google DNS, but omitted automatic route switching and the faster DNS update explanation. |
| GS-049 | Partial | Delivered | Pass | Pass | `store/services/end-of-term-cancellation-retention.md:1-11` (0.5445) | Covered backup and retention risk, but omitted that end-of-term cancellation prevents a new bill. |
| GS-053 | Partial | Delivered | Pass | Pass | `store/services/upgrade.md:13-53` (0.6029) | Implied a 14-day maximum retention window but did not state that older data cannot be restored. |
| GS-056 | Wrong | Delivered | Pass | Pass | `store/services/suspension-retention.md:14-17` (0.5364) | Failed to confirm the world reset and omitted reinstall and restart steps, while advising against them. |
| GS-062 | Partial | Delivered | Pass | Pass | `debug/connection.md:23-32` (0.5575) | Directed the customer to after-sales support but omitted the general-ticket and duplicate-ticket guidance. |
| GS-084 | Wrong | Handoff | Fail | Pass | `store/account/login-recovery.md:12-19` (0.6194) | Lifecycle handoff occurred without resolving the documented login-recovery request. |
| GS-094 | Partial | Delivered | Pass | Pass | `practice/install/modpack-world-preservation.md:1-12` (0.5391) | Explained setting version 26.3 but omitted selecting Reinstall Server in Settings. |
| GS-108 | Wrong | Handoff | Pass | Pass | `debug/nojar.md:57-67` (0.4943) | Handoff lifecycle ended before delivering the required no-jar recovery procedure. |
| GS-140 | Wrong | Handoff | Fail | Pass | `practice/install/neoforge-1211.md:1-11` (0.6397) | Handoff lifecycle ended without resolving the modpack installer issue. |
| GS-163 | Correct | Delivered | Pass | Pass | `panel/start-server.md:1-14` (0.7067) | Provided the account setup, server start, and connection steps and correctly recognized the running state. |
| GS-166 | Wrong | Handoff | Fail | Fail | `index.md:18-19` (0.5288) | Handoff followed a failed citation and incomplete folder-upload answer. |

## Comparison with rerun 6

Rerun 6 scored 0 correct / 1 partial / 12 wrong / 0 unscored with 10 handoffs. This run improved the headline by +1 correct, +5 partial, −6 wrong, and −6 handoffs. Per item, GS-018 improved wrong to partial, GS-023 remained wrong, GS-030 improved wrong to partial, GS-049 remained partial, GS-053 improved wrong to partial, GS-056 remained wrong, GS-062 improved wrong to partial, GS-084 remained wrong, GS-094 remained partial, GS-108 remained wrong, GS-140 remained wrong, GS-163 improved wrong to correct, and GS-166 regressed partial to wrong. Handoff status changed from yes to no for GS-018, GS-030, GS-049, GS-053, GS-056, GS-062, GS-094, and GS-166. GS-084, GS-108, and GS-140 remained handoffs. GS-023 and GS-163 remained delivered.

## Comparison with the step-12 baseline

The baseline docs group scored 0 correct / 2 partial / 10 wrong / 1 unscored with 8 handoffs. This run improved to 1 correct / 6 partial / 6 wrong / 0 unscored with 4 handoffs. Per item, GS-018 improved wrong to partial and no longer handed off, GS-023 remained wrong and delivered, GS-030 improved wrong to partial and no longer handed off, GS-049 remained partial and no longer handed off, GS-053 improved wrong to partial and no longer handed off, GS-056 remained wrong and no longer handed off, GS-062 improved wrong to partial and no longer handed off, GS-084 remained wrong and handed off, GS-094 remained partial and no longer handed off, GS-108 remained wrong and handed off, GS-140 remained wrong and handed off, and GS-163 remained correct and delivered. GS-166 was the baseline’s unscored item, so no verdict comparison is available. The report therefore has no item-level semantic regression against the baseline.

## Items still wrong

- **GS-023** missed DNS cache flushing, Google DNS, and normal rejoin behavior.
- **GS-056** omitted the required reinstall and restart path and contradicted it.
- **GS-084** ended in an unsupported lifecycle handoff.
- **GS-108** ended in a lifecycle handoff before the no-jar fix was delivered.
- **GS-140** ended in a lifecycle handoff before resolving the installer issue.
- **GS-166** failed citation and completeness gates, then handed off instead of completing the folder-upload guidance.

Retrieval verification: provider `openai`, digest `898c35b5b203eb50ae18371e6c5154c8e47bd7c8bcdc33cd93a26f37ae031623`, 71 articles, 566 passages.
