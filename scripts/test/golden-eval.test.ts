import { describe, expect, it } from 'vitest';
import { inputFor, score, summarize, type GoldenItem } from '../lib/golden-eval.js';
const item: GoldenItem = { id: 'test', category: 'test', customer_problem: 'question', conversation: [{ role: 'customer', text: 'question' }, { role: 'customer', text: 'context' }, { role: 'staff', text: 'SECRET SOLUTION' }, { role: 'customer', text: 'later' }], expected_points: ['ＡＢＣ。', '第二點'], outcome: 'resolved' };
describe('golden measurement', () => {
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
