import { describe, expect, it, vi } from 'vitest';
import { inputFor, score, summarize, type GoldenItem } from '../lib/golden-eval.js';
import { scoreSemantic, summarizeSemantic } from "../lib/semantic-judge.js";
const item: GoldenItem = { id: 'test', category: 'test', customer_problem: 'question', conversation: [{ role: 'customer', text: 'question' }, { role: 'customer', text: 'context' }, { role: 'staff', text: 'SECRET SOLUTION' }, { role: 'customer', text: 'later' }], expected_points: ['ＡＢＣ。', '第二點'], staff_resolution: 'reference', outcome: 'resolved' };
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
});
