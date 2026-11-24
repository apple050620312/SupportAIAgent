import type { KnowledgeSearchResponse } from "@support-ai-agent/contracts";

type Passage = Pick<KnowledgeSearchResponse["matches"][number], "source" | "startLine" | "endLine" | "excerpt">;

export function citation(match: Pick<Passage, "source" | "startLine" | "endLine">): string {
  return `[${match.source}:${match.startLine}-${match.endLine}]`;
}

const STARTUP_SOURCE = "panel/config/startup.md";
const REINSTALL_STEP = /重新安[裝装]|重[裝装]|\bre-?install\b/giu;

export function asksToChangeVersion(question: string): boolean {
  const text = question.normalize("NFKC");
  return /版本[^。！？\n]{0,24}(?:改[為为成]|[換换]成)|(?:更[改換换]|變更|变更|修改|切[換换]|調整|调整|改[為为成]|[升降][級级])[^。！？\n]{0,24}版本/iu.test(text)
    || /\b(?:change|set|select|switch|upgrade|downgrade)\b[^.?!\n]{0,56}\bversion\b/iu.test(text);
}

export function hasStartupReinstallStep(match: Passage): boolean {
  return match.source === STARTUP_SOURCE && match.excerpt.split("\n").some(line =>
    /設定|设置|\bsettings\b/iu.test(line) && /重新安[裝装]|重[裝装]|\bre-?install\b/iu.test(line));
}

export function missingVersionReinstall(question: string, draft: string, evidence: readonly Passage[]): boolean {
  if (!asksToChangeVersion(question) || !evidence.some(match => match.source === STARTUP_SOURCE)) return false;
  const text = draft.normalize("NFKC").replace(/\[[^\]\n]+:\d+-\d+\]/gu, "").replace(/[*`]/g, "");
  const includesReinstall = [...text.matchAll(REINSTALL_STEP)].some(({ index }) => {
    const before = text.slice(Math.max(0, index - 18), index).split(/[。！？.!?\n]/u).at(-1) ?? "";
    return !/不用|不必|無[須需]|无[须需]|先別|先别|不要|免|\b(?:do not|don.t|does not need to|no need to|without)\b/iu.test(before);
  });
  return !includesReinstall || !evidence.some(match => hasStartupReinstallStep(match) && draft.includes(citation(match)));
}

type CitationFailure = {
  citation: string | null;
  reason: "wrong_lines" | "unknown_citation" | "missing_citation" | "no_admitted_evidence"
    | "unsupported_claim" | "invalid_verifier_reference" | "incomplete_answer" | "verification_unavailable";
  detail?: string;
};

export function renderPassageIds(draft: string, labels: ReadonlyMap<string, string>): string {
  return draft.replace(/\[P[1-9]\d*\]/g, id => labels.get(id) ?? id);
}

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
}, signal: AbortSignal) => Promise<{ claimsSupported: boolean; complete: boolean; references: string[]; issue?: string | null }>;

export async function evaluateCitationGate(input: {
  question: string;
  draft: string;
  evidence: readonly Passage[];
  accountReads?: Record<string, unknown>;
  scrub?: (text: string) => string;
}, verify: DraftVerifier, signal: AbortSignal): Promise<CitationGate> {
  const { question, draft, evidence, accountReads = {}, scrub = text => text } = input;
  const passages = new Map(evidence.filter(match => match.excerpt.trim()).map(match => [citation(match), scrub(match.excerpt)]));
  const labels = new Map([...draft.matchAll(/\[([^[\]\r\n]+):\d+-\d+\]/g)].map(([label, source]) => [label, source]));
  const failures: CitationFailure[] = [];
  for (const [id] of draft.matchAll(/\[P\d+\]/g)) failures.push({ citation: id, reason: "unknown_citation" });
  if (!passages.size) failures.push({ citation: null, reason: "no_admitted_evidence" });
  else if (!labels.size) failures.push({ citation: null, reason: "missing_citation" });
  for (const [label, source] of labels) {
    if (!passages.has(label)) failures.push({
      citation: scrub(label), reason: evidence.some(match => match.source === source) ? "wrong_lines" : "unknown_citation"
    });
  }
  if (failures.length) return { status: "failed", grounded: false, matched: [], failures };

  const failure = (reason: CitationFailure["reason"], citation: string | null = null, detail?: string): CitationGate => ({
    status: "failed", grounded: false, matched: [], failures: [{ citation, reason, ...(detail ? { detail } : {}) }]
  });
  try {
    const review = await verify({
      question, draft, accountReads, passages: [...labels.keys()].map(label => ({ label, excerpt: passages.get(label)! }))
    }, signal);
    signal.throwIfAborted();
    const invalid = review.references.find(label => !labels.has(label));
    if (invalid !== undefined) return failure("invalid_verifier_reference", scrub(invalid).slice(0, 400));
    const issue = review.issue ? scrub(review.issue).slice(0, 400) : undefined;
    if (review.claimsSupported !== true) {
      return { ...failure("unsupported_claim", null, issue), claimSupport: false, complete: review.complete === true };
    }
    if (!review.references.length) return failure("invalid_verifier_reference", null, "No cited references returned");
    const missingReinstall = missingVersionReinstall(question, draft, evidence);
    const complete = review.complete === true && !missingReinstall;
    const incompleteDetail = missingReinstall ? "Cite and include the Settings → Reinstall step after changing the version." : issue;
    return {
      status: complete ? "passed" : "failed", grounded: true, matched: [...new Set(review.references)].map(scrub),
      failures: complete ? [] : [{ citation: null, reason: "incomplete_answer", ...(incompleteDetail ? { detail: incompleteDetail } : {}) }], claimSupport: true, complete
    };
  } catch {
    return failure("verification_unavailable");
  }
}
