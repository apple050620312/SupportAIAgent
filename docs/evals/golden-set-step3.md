# Golden set: Vercel loop, step 3

## Run status — 2026-11-07

**Measured with loop + draft KB v1 (unreviewed).** This is not a staff-reviewed KB score.

Full run: 175/175 executed. Resolved-correct **0/154 (0.0%)**, handoff-correct **21/21 (100.0%)**, partial **0/154 (0.0%)**, wrong **154/175 (88.0%)**. Offline resolution proxy: **0/175 (0.0%)**. Average model generation attempts: **1.00**; wall time 1,824.936 seconds; average item latency 10.43 seconds. Cost: **null** (endpoint instrumentation provides no price).

Smoke (10): resolved-correct 0/9 (0.0%), handoff-correct 1/1 (100.0%), partial 0/9, wrong 9/10 (90.0%); average 1.00 step and 8.85 seconds/item.

**Caveat:** scores measure “loop + draft KB v1 (unreviewed)”. They do not measure a staff-reviewed KB. A static set cannot establish seven-day true resolution or no reopen.


## Per-category coverage (full run)

| Category | N | Resolved | Handoff | R | H | P | Wrong |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| account_access | 8 | 0/8 | 0/0 | 0 | N/A | 0 | 8 |
| billing_other | 6 | 0/5 | 1/1 | 0 | 1 | 0 | 5 |
| billing_payment | 11 | 0/10 | 1/1 | 0 | 1 | 0 | 10 |
| billing_question | 3 | 0/3 | 0/0 | 0 | N/A | 0 | 3 |
| cannot_connect | 19 | 0/18 | 1/1 | 0 | 1 | 0 | 18 |
| custom_quote | 6 | 0/3 | 3/3 | 0 | 1 | 0 | 3 |
| files_panel | 6 | 0/6 | 0/0 | 0 | N/A | 0 | 6 |
| general_other | 9 | 0/8 | 1/1 | 0 | 1 | 0 | 8 |
| lag_performance | 11 | 0/10 | 1/1 | 0 | 1 | 0 | 10 |
| plan_cancel | 6 | 0/5 | 1/1 | 0 | 1 | 0 | 5 |
| plan_upgrade | 8 | 0/8 | 0/0 | 0 | N/A | 0 | 8 |
| plugin_mod | 13 | 0/12 | 1/1 | 0 | 1 | 0 | 12 |
| pre_sales | 6 | 0/6 | 0/0 | 0 | N/A | 0 | 6 |
| purchase_help | 5 | 0/4 | 1/1 | 0 | 1 | 0 | 4 |
| refund | 6 | 0/6 | 0/0 | 0 | N/A | 0 | 6 |
| server_other | 13 | 0/10 | 3/3 | 0 | 1 | 0 | 10 |
| server_start_crash | 22 | 0/18 | 4/4 | 0 | 1 | 0 | 18 |
| version_core | 9 | 0/7 | 2/2 | 0 | 1 | 0 | 7 |
| world_backup | 8 | 0/7 | 1/1 | 0 | 1 | 0 | 7 |

## Failure patterns observed

- The dominant pattern was low-confidence retrieval: the loop retrieved KB passages but none of the 175 items met its existing 0.5 lexical overlap gate; it therefore delivered the fixed Traditional Chinese or English handoff. This produced 154 unexpected handoffs on historically resolved items.
- Two billing items (GS-089 and GS-102) attempted the read-only invoice tool and recorded `/v1/me/invoice:HTTP_403`; they were handed off without runner errors.
- Representative model drafts (diagnostic only; not delivered answers): “我先查詢目前可引用的主機方案與網路埠限制資料，再依查到的內容回答；帳戶或特定節點的可用性需要由客服以內部系統確認。” and “我先查看這張工單所對應主機的狀態與近期日誌，並查閱連線問題的支援文件。” Delivered replies were the fixed handoff, e.g. “我不知道，現有資料不足以確認答案，已轉交人工客服。”
- These are de-identified synthetic-harness outputs. Lexical scoring does not assess semantic correctness, negation, or factual truth.


## Deferred work

Staff KB review, corpus improvement, shadow mode, tracing, semantic claim review, and a durable staff approval queue remain deferred. The synthetic harness still has no live provider/account state; no production integrations were added.


## Validation

`pnpm knowledge:check`, `pnpm build`, `pnpm typecheck`, `pnpm test`, `pnpm lint`, and `pnpm eval:mock` passed. Raw full and smoke results are in ignored `eval-results/`; `knowledge/` is ignored and was not committed.
