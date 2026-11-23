import type { KnowledgeSearchResponse } from "@support-ai-agent/contracts";

type Passage = KnowledgeSearchResponse["matches"][number];

export function citation(match: Passage): string {
  return "[" + match.source + ":" + match.startLine + "-" + match.endLine + "]";
}

type CitationFailure = {
  citation: string | null;
  reason: "wrong_lines" | "unknown_citation" | "missing_citation" | "missing_excerpt"
    | "truncated" | "whitespace_mismatch" | "excerpt_mismatch" | "no_admitted_evidence";
};

export type CitationGate = {
  status: "not_evaluated" | "passed" | "failed";
  /** At least one exact excerpt/citation pair exists, even if another pair failed. */
  grounded: boolean;
  matched: string[];
  failures: CitationFailure[];
};

const citationPattern = /\[([^[\]\r\n]+):\d+-\d+\]/g;
const normalizeLineEndings = (text: string) => text.replaceAll("\r\n", "\n");
const collapseWhitespace = (text: string) => text.replace(/\s+/g, " ").trim();

function quoteFailure(before: string, excerpt: string): CitationFailure["reason"] {
  const preceding = before.trimEnd();
  if (!preceding) return "missing_excerpt";
  if (collapseWhitespace(preceding).endsWith(collapseWhitespace(excerpt))) return "whitespace_mismatch";
  const withoutEllipsis = preceding.replace(/(?:…|\.{3})$/, "").trimEnd();
  const prefix = excerpt.slice(0, Math.min(32, excerpt.indexOf("\n") > 0 ? excerpt.indexOf("\n") : excerpt.length));
  const start = withoutEllipsis.lastIndexOf(prefix);
  if (start >= 0) {
    const quoted = withoutEllipsis.slice(start);
    if (quoted.length < excerpt.length && excerpt.startsWith(quoted)) return "truncated";
  }
  return "excerpt_mismatch";
}

export function evaluateCitationGate(rawDraft: string, evidence: Passage[], scrub: (text: string) => string): CitationGate {
  const draft = normalizeLineEndings(rawDraft);
  const matched = new Set<string>();
  const failures: CitationFailure[] = [];
  const passages = new Map(evidence.filter(match => match.excerpt.trim()).map(match => [
    citation(match), normalizeLineEndings(match.excerpt)
  ]));
  const tokens = [...draft.matchAll(citationPattern)].map(token => {
    const label = token[0];
    const before = draft.slice(0, token.index);
    const excerpt = passages.get(label);
    const start = excerpt ? before.lastIndexOf(excerpt) : -1;
    const exact = excerpt !== undefined && start >= 0 && /^\s+$/.test(before.slice(start + excerpt.length));
    return { label, source: token[1], index: token.index, before, excerpt, start, exact };
  });
  const quotes = tokens.filter(token => token.exact);
  for (const token of tokens) {
    // Bracketed references copied as part of an exact excerpt are evidence text.
    if (quotes.some(quote => token.index >= quote.start && token.index < quote.index)) continue;
    if (token.exact) matched.add(scrub(token.label));
    else failures.push({
      citation: scrub(token.label),
      reason: token.excerpt ? quoteFailure(token.before, token.excerpt)
        : evidence.some(match => match.source === token.source) ? "wrong_lines" : "unknown_citation"
    });
  }

  // An unused retrieved passage is allowed. A standalone exact quote in the
  // draft needs its own citation unless it is part of a larger exact quote.
  for (const [label, excerpt] of passages) {
    let start = draft.indexOf(excerpt);
    while (start >= 0) {
      const end = start + excerpt.length;
      const before = draft.slice(0, start);
      const after = draft.slice(end);
      const standalone = (!before.trim() || /\n[ \t]*\n[ \t]*$/.test(before))
        && (!after.trim() || /^[ \t]*\n[ \t]*\n/.test(after));
      const insideQuote = quotes.some(quote => start >= quote.start && end <= quote.index);
      const followedByCitation = tokens.some(token => token.index >= end && /^\s+$/.test(draft.slice(end, token.index)));
      if (standalone && !insideQuote && !followedByCitation) {
        failures.push({ citation: scrub(label), reason: "missing_citation" });
        break;
      }
      start = draft.indexOf(excerpt, end);
    }
  }

  if (!matched.size && !failures.length) {
    failures.push({ citation: null, reason: passages.size ? "missing_citation" : "no_admitted_evidence" });
  }
  return { status: failures.length ? "failed" : "passed", grounded: matched.size > 0, matched: [...matched], failures };
}
