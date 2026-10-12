# ADR 0007: Local Markdown support knowledge through Core ports

- Status: Accepted for the single-process prototype
- Date: 2026-10-12

## Context

The operator will maintain a folder of Markdown support procedures. OpenClaw should search the procedures and use existing Core tools to attempt resolution, with verifiable results and staff handoff. Documents must not become another authorization path or expose an arbitrary filesystem tool.

## Decision

Add `SupportKnowledgeProvider` and `SupportKnowledgeService`, with a read-only local Markdown adapter. Expose `search_support_knowledge` and `read_support_article` through Core's signed-ticket routes and the native OpenClaw tool factory. Only the operator configures the root. The model reads content-versioned opaque article references, relative citations and bounded pages, never arbitrary paths.

Use in-memory lexical ranking for English terms/error codes and Han characters/bigrams, without a database or embedding service. Refresh atomically on the first query after a 30-second interval. Failed refreshes fail closed; deleted/changed references require a new search. Bound file bytes, lines, traversal, chunk count and tool output.

Include a reviewed knowledge workflow in every support turn and update the plugin Skill. The agent searches, reads, checks applicability, diagnoses through owned-service ports, attempts supported remediation, verifies results and hands off unresolved work. Prompt instructions are guidance, not a replacement for deterministic authorization.

## Alternatives considered

- Give the model shell or filesystem search: rejected because it would expand access beyond the chosen corpus.
- Include every Markdown file in each prompt: rejected due to context cost, stale documents and poor source selection.
- Embedding/host memory search: deferred; it introduces services or unverified host APIs before lexical quality is measured. A later adapter can implement the same port.
- Search directly in OpenClaw: not selected; Core already enforces ticket access, privacy and bounded tool output.

## Security implications

The corpus is shared support documentation for authorized tickets, never customer-specific storage. Review its content for secrets and customer data before mounting it; Git exclusion does not prevent disclosure through model prompts or transcripts. The adapter ignores symlinks/junctions and rejects root escapes, binary/invalid UTF-8 and oversized files. Only a trusted operator may update the directory; checks do not promise protection against an attacker concurrently changing filesystem topology.

Every response is `reference_only`. Documents cannot confer actor identity, ownership or mutation approval, and indexing does not execute code, fetch links or grant new tools. Query/contents are not audit fields. Signed context and takeover checks apply before requests and again before releasing knowledge results.

## Consequences

Documentation updates improve available evidence without training model weights. Search has citation and pagination support but no guarantee of synonym recall, correctness of procedures or complete tool coverage. Real resolution rates, model resistance to document injection, actual corpus retrieval quality and provider changes need reviewed operational evaluations. Unavailable evidence, unsupported operations or unverifiable results still require handoff.

The manual launcher requires a nonempty valid corpus before importing the live bot. Default dev/start remain health-only. Existing provider activation and staff-approval deployment gates remain independent.
