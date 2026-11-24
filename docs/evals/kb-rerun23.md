# Golden set docs rerun 23

Rerun 22 scored **1 correct, 0 partial, 7 wrong and 5 unscored**, with **7 handoffs** and 20 timeout attempts. Rerun 23 uses `gpt-6-luna` through sub2api, requested max effort and Fast, and `gpt-6.1-sol` for draft verification and the independent `step10-v1` judge. Each answer attempt has at most 60 seconds. The live eval uses synthetic tickets and official OpenAI `text-embedding-3-small` retrieval. [Rerun 22](kb-rerun22.md) · [Rerun 22 diagnosis](kb-rerun22-diagnosis.md)

## Corpus

I copied the active settings article to `~/workspace/fix4-settings.md` and verified it contained 「世界已被重置」. I then restored `~/workspace/clean-settings.md` over the active article, verified the sentence was absent and rebuilt the clean index before the first live request.

| Corpus | Articles / passages | Digest |
|---|---:|---|
| Clean, verified after rebuild | 72 / 570 | `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5` |

## Authorized delivery and retrieval

The runner uses the earlier of capsule expiry and the 60-second answer deadline. It reserves 12 seconds for review and three for delivery. Prefetch has a six-second cap and Core requests run at a concurrency of three per attempt. The review input contains the cited passages and each citation is rendered from a separate admitted span ID. Fake-clock tests cover a slow draft, a slow reviewer, second-boundary issuance, cancellation, expiry, supersession, a stalled companion read and stalled search and admission embeddings.

The first live pilot used deduplication and the 4,096-token output request cap before the additional prompt compaction. All nine attempts hit the draft cutoff, so the pilot recorded no output usage. These attempts are outside the scheduled clean and durability groups.

| Pilot item | R22 prompt bytes | R23 pilot bytes | Companion reads per attempt | Completed first calls |
|---|---:|---:|---:|---:|
| GS-018 | 31,173 | 20,930 | 2 | 0/3 |
| GS-023 | 23,035 | 21,032 | 8 | 0/3 |
| GS-030 | 33,260 | 21,002 | 4 | 0/3 |

GS-030 had four distinct article windows, with one read each and both the automatic switching and Google DNS rationale admitted. R22 read those same four windows twice on average. The focused prompt revision strips image links and blank lines and limits companion excerpts before drafting. [Pilot logs](../../eval-results/rerun23/pilot-manifest.json)

## Fast route

A pinned Luna max request at 09:00:06 UTC reached `https://sub2api.coffeehost.net/v1/responses` with `service_tier=fast`. It returned HTTP 200, Luna max and `service_tier=default` in 5.03 s. The gateway returned request ID `8b865818-7f9c-46d2-b3b0-69763c450be5`. The effective rule, selected upstream account and egress tier remain unverified because the caller-facing trace contains none of those fields. The local gateway source at `01629d7ff` supports mapping `fast` to `priority` on pass and removing it on filter. This request counts as **zero confirmed Fast responses**. [Pinned request trace](../../eval-results/rerun23/fast-route.json) · [Gateway source evidence](kb-rerun22-diagnosis-evidence.md#fast-and-concurrency)
