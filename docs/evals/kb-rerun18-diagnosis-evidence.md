# Rerun 18 diagnosis evidence

The primary source is `eval-results/golden-2026-11-24T02-36-17-394Z-13.json`, the 13-item clean checkpoint. The targeted GS-056 source is `eval-results/golden-2026-11-24T02-36-17-395Z-1.json`. The clean corpus digest is `6b7b4b6d68e2e0e19f9d6977f6e9c3a6fd23dde28cba54e4283895edfae7bec5`; the targeted digest is `04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a`. Both contain 72 articles and 570 passages.

## Checkpoint counts and attempt traces

| Item | Latency | Attempts | Steps | Model failures | Answer | Admitted evidence | Semantic verdict |
|---|---:|---:|---:|---|---|---:|---|
| GS-018 | 183,479 ms | 3 | 8 | 3 TimeoutError | no | 0 | none |
| GS-023 | 67,189 ms | 1 | 2 | none | yes | 31 | correct |
| GS-030 | 183,030 ms | 3 | 6 | 3 TimeoutError | no | 0 | none |
| GS-049 | 120,809 ms | 2 | 4 | 1 TimeoutError | no | 0 | none |
| GS-053 | 183,029 ms | 3 | 9 | 3 TimeoutError | no | 0 | none |
| GS-062 | 47,791 ms | 1 | 2 | none | yes | 46 | partial |
| GS-108 | 183,035 ms | 3 | 12 | 3 TimeoutError | no | 0 | none |
| GS-140 | 68,129 ms | 1 | 3 | none | yes | 35 | partial |
| GS-166 | 32,789 ms | 1 | 2 | none | yes | 24 | wrong |

The three 183-second rows each consumed three approximately 60-second answer limits. GS-049 consumed two attempts and ended with an agent error. The event logs show tool calls completed before the failures. They do not provide per-attempt wall-clock measurements, so they cannot prove whether a focused search, a particular tool call or provider queueing caused the timeout.

## GS-030 retrieval versus delivery

The final GS-030 attempt's `evidence` includes `debug/automatic-route-switching.md:1-7` and `debug/googledns.md:1-12`, as well as the connection and WARP passages. Its `admittedEvidence` array is empty. It has no citation-gate result, completeness result or semantic judgment because all three attempts timed out. The record therefore establishes retrieval of both focused spans and failure to reach admission/delivery. It does not establish that the focused-search code rejected either span.

## GS-023 confound

The delivered GS-023 answer contains ten exact knowledge-base excerpts, including `debug/automatic-route-switching.md:1-7`, `debug/connection.md:23-32`, `debug/connection.md:33-47`, `debug/googledns.md:21-25`, `debug/googledns.md:26-32`, `debug/googledns.md:33-40`, `debug/googledns.md:41-52`, `debug/connection.md:48-54`, `debug/connection.md:9-13` and `debug/connection.md:55-66`. The rerun changed both the quote-fidelity instruction and retrieval admission. A single run can show the combined path worked. It cannot assign the improvement to option A alone.

## GS-062 and GS-140

GS-062 admitted both routing and duplicate-policy families, delivered an answer with after-sales routing and no-speedup language, and received a partial judgment because it did not distinguish that route from general support. This is a remaining coverage requirement after retrieval and admission succeeded.

GS-140 delivered a partial answer with 35 admitted spans, but neither policy article was admitted. The judge credited routing and duplicate advice and marked explicit wait-for-staff advice missing. Because policy evidence was absent, the score movement does not validate the rerun-18 routing change.

## GS-166 and owner decisions

GS-166 admitted `panel/manage/upload.md:6-30` and `panel/common/sftp.md:1-47`. The answer correctly covered SFTP and folder transfer, but it omitted destination by file type. It repeated the panel source's 100 MB limit. The judge compared that claim with the staff reference's 10 MB threshold and marked the answer wrong. The checkpoint labels `referenceConflict.status` as uncertain. The owner must resolve the threshold and provide destination rules before either can be treated as a code or prompt defect.

## GS-056 comparison

The clean GS-056 row remained a supported handoff because its admitted settings evidence stopped at 1–14 and completeness withheld restart and world-reset claims. The targeted checkpoint, using digest `04003b9b`, admitted settings 1–16 and delivered both claims with a correct verdict. This paired observation demonstrates corpus-dependent behavior for this sample. It is one sample per corpus and does not measure a stable lift.

## Retention items

GS-049 ended unscored after a timeout and an agent error. GS-053 ended unscored after three timeouts. These rows provide no new answer text to judge. The prior retention conflict therefore remains the applicable diagnosis. Owner decisions are required for cancellation versus nonpayment timing, the timer origin, deletion cutoffs, and restoration eligibility. The conventions report section 5 remains pending owner review.
