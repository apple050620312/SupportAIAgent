import { describe, expect, it, vi } from 'vitest';
import { inputFor, score, selectGoldenItems, summarize, type GoldenItem } from '../lib/golden-eval.js';
import { scoreSemantic, scoreHandoffContent, reconcileReference, summarizeSemantic, type Verdict } from "../lib/semantic-judge.js";
import { answerabilityForItem, classifyGolden } from '../lib/golden-answerability.js';
const item: GoldenItem = { id: 'test', category: 'test', customer_problem: 'question', conversation: [{ role: 'customer', text: 'question' }, { role: 'customer', text: 'context' }, { role: 'staff', text: 'SECRET SOLUTION' }, { role: 'customer', text: 'later' }], expected_points: ['ＡＢＣ。', '第二點'], staff_resolution: 'reference', outcome: 'resolved' };
describe('golden measurement', () => {
  it('selects requested IDs and rejects unknown IDs', () => {
    const items = [{ ...item, id: 'GS-002' }, { ...item, id: 'GS-001' }];
    expect(selectGoldenItems(items, { ids: ['GS-001'] }).map(row => row.id)).toEqual(['GS-001']);
    expect(() => selectGoldenItems(items, { ids: ['GS-999'] })).toThrow('Unknown golden ID(s): GS-999');
  });
  it('uses dataset positions for answerability in a reordered ID subset', () => {
    const dataset = ['GS-001', 'GS-002', 'GS-003'].map(id => ({ ...item, id }));
    const labels = classifyGolden({
      datasetSha256: 'test-dataset',
      groups: { 'docs-answerable': [2], 'needs-account-state': [1], 'kb-gap': [3] },
    }, 'test-dataset', dataset.length);
    const selected = selectGoldenItems(dataset, { ids: ['GS-003', 'GS-002'] });
    expect(selected.map(item => [item.id, answerabilityForItem(item, dataset, labels)])).toEqual([
      ['GS-003', 'kb-gap'],
      ['GS-002', 'docs-answerable'],
    ]);
  });
  it('never feeds staff answers or post-staff turns', () => expect(inputFor(item)).toBe('question\ncontext'));
  it('requires every whole point and refuses to credit handoff/error as resolution', () => {
    expect(score(item, 'abc 第二點', false, false).resolvedCorrect).toBe(true);
    expect(score(item, 'abc', false, false).partial).toBe(true);
    expect(score(item, 'abc 第二點', true, false).resolvedCorrect).toBe(false);
    expect(score(item, 'abc 第二點', false, true).resolvedCorrect).toBe(false);
  });
  it('credits only successful lifecycle handoff on handoff items', () => {
    expect(score({ ...item, outcome: 'handoff' }, '', true, false).handoffCorrect).toBe(true);
    expect(score({ ...item, outcome: 'handoff' }, '', true, true).handoffCorrect).toBe(false);
  });
  it('does not invent seven-day outcomes or zero-denominator rates', () => expect(summarize([])).toMatchObject({ trueResolution7d: null, resolvedCorrectRate: null, handoffCorrectRate: null, offlineResolutionProxy: null }));
});

describe('semantic measurement', () => {
  it('credits a judged paraphrase while retaining the strict lexical diagnostic', async () => {
    const answer = 'a paraphrase';
    const semantic = await scoreSemantic(item, { answer, handedOff: false, error: false }, () => Promise.resolve({
      verdict: 'correct', points: ['covered', 'covered'], reason: 'Both points are paraphrased.',
    }));
    expect(semantic.verdict).toBe('correct');
    expect(score(item, answer, false, false).resolvedCorrect).toBe(false);
  });

  it('enforces the handoff outcome and reports unavailable judgments separately', async () => {
    const attempt = { answer: 'answer', handedOff: false, error: false };
    const unavailable = vi.fn(() => Promise.reject(new Error('provider unavailable')));
    const failed = await scoreSemantic(item, attempt, unavailable);
    expect(unavailable).toHaveBeenCalledTimes(3);
    const neededHandoff = { ...item, outcome: 'handoff' } as const;
    const missed = await scoreSemantic(neededHandoff, attempt, unavailable);
    const handedOff = await scoreSemantic(neededHandoff, { ...attempt, handedOff: true }, unavailable);
    expect(summarizeSemantic([failed, missed, handedOff].map(semantic => ({ semantic })))).toEqual({
      n: 3, scored: 2, unscored: 1, correct: 1, wrong: 1, partial: 0, correctRate: 0.5,
    });
  });
  it('scores handoff draft content separately while lifecycle remains primary', async () => {
    const neededHandoff = { ...item, outcome: 'handoff' } as const;
    const judge = vi.fn((): Promise<Verdict> => Promise.resolve({ verdict: 'correct', points: ['covered', 'covered'], reason: 'Complete draft.' }));
    const primary = await scoreSemantic(neededHandoff, { answer: 'draft', handedOff: true, error: false }, judge);
    const content = await scoreHandoffContent(neededHandoff, 'draft', judge);
    expect(primary).toMatchObject({ verdict: 'correct', basis: 'lifecycle' });
    expect(content).toMatchObject({ verdict: 'correct', basis: 'judge' });
    expect(judge).toHaveBeenCalledTimes(1);
    await expect(scoreHandoffContent(neededHandoff, '', judge)).resolves.toMatchObject({ verdict: null, basis: 'empty-draft' });
  });
  it('flags historical claims that conflict with current owner-confirmed KB', () => {
    expect(reconcileReference('The service is available', '', [{ source: 'policy.md', startLine: 4, excerpt: 'The service is not available.', policyProvenance: 'owner_confirmed' }])).toMatchObject({ status: 'conflict' });
    expect(reconcileReference('The service is available', '', [])).toMatchObject({ status: 'uncertain' });
  });
});
