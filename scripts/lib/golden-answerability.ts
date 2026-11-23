import { summarizeSemantic, type SemanticResult } from './semantic-judge.js';

const groups = ['docs-answerable', 'needs-account-state', 'kb-gap'] as const;
export type Answerability = typeof groups[number] | 'unclassified';

export function classifyGolden(
  manifest: { datasetSha256: string; groups: Record<typeof groups[number], number[]> },
  datasetSha256: string,
  total: number,
): Answerability[] {
  const labels = Array<Answerability>(total).fill('unclassified');
  if (manifest.datasetSha256 !== datasetSha256) return labels;
  for (const group of groups) {
    for (const position of manifest.groups[group]) {
      if (!Number.isInteger(position) || position < 1 || position > total || labels[position - 1] !== 'unclassified') {
        throw new Error('Invalid golden answerability manifest position');
      }
      labels[position - 1] = group;
    }
  }
  if (labels.includes('unclassified')) throw new Error('Incomplete golden answerability manifest');
  return labels;
}

export function summarizeAnswerability(rows: readonly { answerability: Answerability; semantic: SemanticResult }[]) {
  return Object.fromEntries(
    [...groups, 'unclassified'].map(group => [group, summarizeSemantic(rows.filter(row => row.answerability === group))]),
  );
}
