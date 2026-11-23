/** Deterministic, deliberately strict offline scoring; no semantic judge. */
export interface GoldenItem {
  id: string; category: string; customer_problem: string;
  conversation: { role: string; text: string }[];
  expected_points: string[]; staff_resolution: string; outcome: 'resolved' | 'handoff';
}
export const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[\p{P}\p{Z}\s]/gu, '');
export function inputFor(item: GoldenItem): string {
  const prefix: string[] = [];
  for (const message of item.conversation) {
    if (message.role !== 'customer') break;
    if (message.text !== item.customer_problem) prefix.push(message.text);
  }
  return [item.customer_problem, ...prefix].join('\n');
}
export function score(item: GoldenItem, answer: string, handedOff: boolean, error: boolean) {
  const covered = item.expected_points.map(point => normalize(answer).includes(normalize(point)));
  const coverage = covered.filter(Boolean).length / covered.length;
  const resolvedCorrect = !error && item.outcome === 'resolved' && !handedOff && coverage === 1;
  const handoffCorrect = !error && item.outcome === 'handoff' && handedOff;
  const partial = !error && item.outcome === 'resolved' && !handedOff && coverage > 0 && coverage < 1;
  return { covered, coverage, resolvedCorrect, handoffCorrect, partial, wrong: !resolvedCorrect && !handoffCorrect && !partial };
}
export interface ScoredRow {
  category: string; outcome: 'resolved' | 'handoff'; resolvedCorrect: boolean; handoffCorrect: boolean; partial: boolean; wrong: boolean;
}
export function summarize(rows: ScoredRow[]) {
  const count = (key: 'resolvedCorrect' | 'handoffCorrect' | 'partial' | 'wrong') => rows.filter(row => row[key]).length;
  const resolved = rows.filter(row => row.outcome === 'resolved').length;
  const handoff = rows.length - resolved;
  return { n: rows.length, resolved, handoff, resolvedCorrect: count('resolvedCorrect'), handoffCorrect: count('handoffCorrect'), partial: count('partial'), wrong: count('wrong'),
    resolvedCorrectRate: resolved ? count('resolvedCorrect') / resolved : null,
    handoffCorrectRate: handoff ? count('handoffCorrect') / handoff : null,
    partialRate: resolved ? count('partial') / resolved : null,
    offlineResolutionProxy: rows.length ? count('resolvedCorrect') / rows.length : null,
    trueResolution7d: null };
}
