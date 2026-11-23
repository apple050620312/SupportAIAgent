import { judgeModel as model, judgeEndpoint as endpoint, rubricVersion, rubric, requestJudgment, parseJudgment, type Verdict } from './lib/semantic-judge.js';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

// Invoke only through /home/hatch/workspace/run-with-sub2api-key.sh.
// No env-file loading, provider exception logging, retries, or reference text in logs.
const input = 'eval-results/golden-2026-11-08T01-30-48-210Z-175.json';
const output = 'eval-results/semantic-review-step9.json';
const goldenPath = '/home/hatch/workspace/coffee-host-golden/golden_set.json';
type Golden = { id: string; category: string; outcome: 'resolved' | 'handoff'; customer_problem: string; expected_points: string[]; staff_resolution: string };
async function main() {
  const source = await readFile(input, 'utf8');
  const goldenSource = await readFile(goldenPath, 'utf8');
  const run = JSON.parse(source) as { status: string; datasetSha256: string; results: { id: string; handedOff: boolean; answer: string }[] };
  const golden = JSON.parse(goldenSource) as Golden[];
  const selected = run.results.filter(item => item.handedOff === false);
  console.log(JSON.stringify({ count: selected.length, ids: selected.map(item => item.id) }));
  if (selected.length !== 38) throw new Error('Expected exactly 38 non-handoff items; stopped');
  if (run.status !== 'completed' || run.results.length !== 175 || new Set(selected.map(item => item.id)).size !== 38 || createHash('sha256').update(goldenSource).digest('hex') !== run.datasetSha256) throw new Error('Input integrity check failed');
  for (const item of selected) {
    const matches = golden.filter(g => g.id === item.id);
    if (matches.length !== 1 || typeof item.answer !== 'string' || !matches[0]?.expected_points.length || typeof matches[0]?.staff_resolution !== 'string') throw new Error('Invalid matched input');
  }
  if (!process.env.SUB2API_API_KEY?.trim()) throw new Error('Wrapper-provided SUB2API_API_KEY required');
  // Resume only a matching private checkpoint; completed items are never called again.
  const results: { id: string; category: string; outcome: string; contentJudgment: Verdict; verdict: string; reason: string }[] = [];
  const metadata = { model, provider: 'sub2api', endpoint, temperature: 0.1, rubricVersion, rubric, timestamp: new Date().toISOString(), input, inputSha256: createHash('sha256').update(source).digest('hex'), datasetSha256: run.datasetSha256, selectedIds: selected.map(item => item.id) };
  let prior;
  try { prior = JSON.parse(await readFile(output, 'utf8')) as { inputSha256: string; rubricVersion: string; timestamp: string; resumes?: { timestamp: string; completedItems: number }[]; results: typeof results }; }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw new Error('Invalid checkpoint'); }
  if (prior) {
    if (prior.inputSha256 !== metadata.inputSha256 || prior.rubricVersion !== metadata.rubricVersion || !prior.results.every((row, index) => row.id === selected[index]?.id)) throw new Error('Checkpoint mismatch');
    results.push(...prior.results);
    Object.assign(metadata, { timestamp: prior.timestamp, resumes: [...(prior.resumes ?? []), { timestamp: new Date().toISOString(), completedItems: results.length }] });
  } else {
    await writeFile(output, JSON.stringify({ ...metadata, status: 'running', results }, null, 2), { mode: 0o600, flag: 'wx' });
  }
  for (const item of selected.slice(results.length)) {
    const reference = golden.find(g => g.id === item.id)!;
    const body = await requestJudgment(reference, item.answer, process.env.SUB2API_API_KEY);
    await writeFile(`eval-results/semantic-review-step9-${item.id}-response.json`, JSON.stringify(body, null, 2), { mode: 0o600 });
    const judgment = parseJudgment(body, reference.expected_points.length);
    results.push({ id: item.id, category: reference.category, outcome: reference.outcome, contentJudgment: judgment, verdict: reference.outcome === 'handoff' ? 'wrong (should have handed off)' : judgment.verdict, reason: reference.outcome === 'handoff' ? `Content judged ${judgment.verdict}; lifecycle handoff was required. ${judgment.reason}` : judgment.reason });
    await writeFile(output, JSON.stringify({ ...metadata, status: 'running', results }, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ id: item.id, completed: results.length }));
  }
  await writeFile(output, JSON.stringify({ ...metadata, status: 'completed', completedAt: new Date().toISOString(), results }, null, 2), { mode: 0o600 });
}
main().catch(error => {
  const message = error instanceof Error ? error.message : '';
  const safe = /^(Expected exactly|Input integrity|Invalid matched|Wrapper-provided|Invalid checkpoint|Checkpoint mismatch|Judge HTTP|Invalid judge output)/.test(message) ? message : 'Transport, parsing, or file failure';
  console.error(`Semantic review stopped: ${safe}. No provider body or exception logged.`);
  process.exitCode = 1;
});
