import type { KnowledgeSearchResponse } from "@support-ai-agent/contracts";

type Passage = KnowledgeSearchResponse["matches"][number];

export function citation(match: Passage): string {
  return "[" + match.source + ":" + match.startLine + "-" + match.endLine + "]";
}

type CitationFailure = {
  citation: string | null;
  reason: "wrong_lines" | "unknown_citation" | "missing_citation" | "missing_excerpt"
    | "truncated" | "excerpt_mismatch" | "no_admitted_evidence";
};

export type CitationGate = {
  status: "not_evaluated" | "passed" | "failed";
  /** At least one grounded excerpt/citation pair exists, even if another pair failed. */
  grounded: boolean;
  matched: string[];
  failures: CitationFailure[];
  claimSupport?: boolean;
};

export function hasBlockingCitationFailure(gate: Pick<CitationGate, "matched" | "failures">): boolean {
  return gate.failures.some(failure => isBlockingCitationFailure(failure, gate.matched.length > 0));
}

function isBlockingCitationFailure(failure: CitationFailure, grounded: boolean): boolean {
  return failure.reason === "unknown_citation" || (failure.reason === "wrong_lines" && !grounded)
    || failure.reason === "missing_citation" || failure.reason === "no_admitted_evidence";
}

const citationPattern = /\[([^[\]\r\n]+):\d+-\d+\]/g;
const normalizeLineEndings = (text: string) => text.replaceAll("\r\n", "\n");

/** Remove Markdown code-fence delimiter lines before locating verbatim quotes. */
export function normalizeFencedDraft(text: string): string {
  const unfenced = text.replace(/^\s*```(?:[A-Za-z0-9_-]+)?\s*$/gmu, "");
  return unfenced.replace(/^> >(Source:)/gmu, "> $1").replace(/^> (?!> Source:)/gmu, "");
}

function quoteStart(before: string, excerpt: string): number {
  const exactStart = before.lastIndexOf(excerpt);
  if (exactStart >= 0 && /^\s+$/.test(before.slice(exactStart + excerpt.length))) return exactStart;

  // Match literal text while allowing each whitespace run to change layout.
  // Keep the original draft offset for references embedded in the quote.
  const literalParts = excerpt.trim().split(/\s+/).map(part => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp("(?<!\\S)" + literalParts.join("\\s+") + "\\s+$");
  return pattern.exec(before)?.index ?? -1;
}

function quoteFailure(before: string, excerpt: string): CitationFailure["reason"] {
  const preceding = before.trimEnd();
  if (!preceding) return "missing_excerpt";
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
  return inspectCitationGate(rawDraft, evidence, scrub).gate;
}

export function inspectCitationGate(rawDraft: string, evidence: Passage[], scrub: (text: string) => string): {
  gate: CitationGate;
  missingCitationDraft: string | null;
} {
  const draft = normalizeFencedDraft(normalizeLineEndings(rawDraft));
  const matched = new Set<string>();
  const failures: CitationFailure[] = [];
  const passages = new Map(evidence.filter(match => match.excerpt.trim()).map(match => [
    citation(match), normalizeLineEndings(match.excerpt)
  ]));
  const tokens = [...draft.matchAll(citationPattern)].map(token => {
    const label = token[0];
    const before = draft.slice(0, token.index);
    const excerpt = passages.get(label);
    const start = excerpt ? quoteStart(before, excerpt) : -1;
    return { label, source: token[1], index: token.index, before, excerpt, start };
  });
  const quotes = tokens.filter(token => token.start >= 0);
  for (const token of tokens) {
    // Bracketed references copied as part of a matched excerpt are evidence text.
    if (quotes.some(quote => token.index >= quote.start && token.index < quote.index)) continue;
    if (token.start >= 0) matched.add(scrub(token.label));
    else failures.push({
      citation: scrub(token.label),
      reason: token.excerpt ? quoteFailure(token.before, token.excerpt)
        : evidence.some(match => match.source === token.source) ? "wrong_lines" : "unknown_citation"
    });
  }

  // An unused retrieved passage is allowed. A standalone exact quote in the
  // draft needs its own citation unless it is part of a larger exact quote.
  const insertions = new Map<number, string>();
  for (const [label, excerpt] of passages) {
    let missing = false;
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
        missing = true;
        // Identical excerpts may have multiple labels. Any admitted label grounds the quote.
        if (!insertions.has(end)) insertions.set(end, label);
      }
      start = draft.indexOf(excerpt, end);
    }
    if (missing) failures.push({ citation: scrub(label), reason: "missing_citation" });
  }

  if (!matched.size && !failures.length) {
    failures.push({ citation: null, reason: passages.size ? "missing_citation" : "no_admitted_evidence" });
  }
  const gate = { matched: [...matched], failures };
  const grounded = matched.size > 0;
  // Wrong lines and quote mismatches remain diagnostics when a matched pair grounds the draft.
  const status = grounded && !hasBlockingCitationFailure(gate) ? "passed" : "failed";
  const firstSentence = draft.split(/[.!?。！？]/u)[0] ?? "";
  const claimSupport = grounded && firstSentence.length >= 12;
  const canAppend = status === "failed" && insertions.size > 0 && failures.every(failure =>
    failure.reason === "missing_citation" || !isBlockingCitationFailure(failure, grounded)
  );
  return {
    gate: { ...gate, status, grounded, claimSupport },
    missingCitationDraft: canAppend ? appendCitations(rawDraft, insertions) : null
  };
}

function appendCitations(rawDraft: string, insertions: Map<number, string>): string {
  const lineEndings = rawDraft.matchAll(/\r\n/g);
  let lineEnding = lineEndings.next();
  let extra = 0;
  let cursor = 0;
  let result = "";
  for (const [end, label] of [...insertions].sort(([a], [b]) => a - b)) {
    // Translate offsets back to the original draft to preserve its line endings.
    while (!lineEnding.done && lineEnding.value.index - extra < end) {
      extra++;
      lineEnding = lineEndings.next();
    }
    const rawEnd = end + extra;
    result += rawDraft.slice(cursor, rawEnd) + " " + label;
    cursor = rawEnd;
  }
  return result + rawDraft.slice(cursor);
}
