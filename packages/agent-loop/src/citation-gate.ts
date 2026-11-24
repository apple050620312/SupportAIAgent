import type { KnowledgeSearchResponse } from "@support-ai-agent/contracts";

type Passage = Pick<KnowledgeSearchResponse["matches"][number], "source" | "startLine" | "endLine" | "excerpt">;

export function citation(match: Pick<Passage, "source" | "startLine" | "endLine">): string {
  return `[${match.source}:${match.startLine}-${match.endLine}]`;
}

type CitationFailure = {
  citation: string | null;
  reason: "wrong_lines" | "unknown_citation" | "missing_citation" | "no_admitted_evidence"
    | "unsupported_claim" | "incomplete_answer" | "verification_unavailable";
};

export type CitationGate = {
  status: "not_evaluated" | "passed" | "failed";
  grounded: boolean;
  matched: string[];
  failures: CitationFailure[];
  claimSupport?: boolean;
  complete?: boolean;
};

export type DraftVerifier = (input: {
  question: string;
  draft: string;
  passages: { label: string; excerpt: string }[];
  accountReads: Record<string, unknown>;
}, signal: AbortSignal) => Promise<{ claimsSupported: boolean; complete: boolean; references: string[] }>;

export async function evaluateCitationGate(input: {
  question: string;
  draft: string;
  evidence: readonly Passage[];
  accountReads?: Record<string, unknown>;
  scrub?: (text: string) => string;
}, verify: DraftVerifier, signal: AbortSignal): Promise<CitationGate> {
  const { question, draft, evidence, accountReads = {}, scrub = text => text } = input;
  const passages = new Map(evidence.filter(match => match.excerpt.trim()).map(match => [citation(match), scrub(match.excerpt)]));
  const labels = new Map([...draft.matchAll(/\[([^\[\]\r\n]+):\d+-\d+\]/g)].map(([label, source]) => [label, source]));
  const failures: CitationFailure[] = [];
  if (!passages.size) failures.push({ citation: null, reason: "no_admitted_evidence" });
  else if (!labels.size) failures.push({ citation: null, reason: "missing_citation" });
  for (const [label, source] of labels) {
    if (!passages.has(label)) failures.push({
      citation: scrub(label), reason: evidence.some(match => match.source === source) ? "wrong_lines" : "unknown_citation"
    });
  }
  if (failures.length) return { status: "failed", grounded: false, matched: [], failures };

  const failure = (reason: CitationFailure["reason"]): CitationGate => ({
    status: "failed", grounded: false, matched: [], failures: [{ citation: null, reason }]
  });
  try {
    const review = await verify({ question, draft, accountReads, passages: [...passages].map(([label, excerpt]) => ({ label, excerpt })) }, signal);
    signal.throwIfAborted();
    if (review.claimsSupported !== true || !review.references.length || review.references.some(label => !labels.has(label))) {
      return { ...failure("unsupported_claim"), claimSupport: false, complete: review.complete === true };
    }
    const complete = review.complete === true;
    return {
      status: complete ? "passed" : "failed", grounded: true, matched: [...new Set(review.references)].map(scrub),
      failures: complete ? [] : [{ citation: null, reason: "incomplete_answer" }], claimSupport: true, complete
    };
  } catch {
    return failure("verification_unavailable");
  }
}
