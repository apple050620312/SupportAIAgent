import { mkdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { wrapLanguageModel } from 'ai';
import type { KnowledgeSearchResponse } from '@openclaw-hosting/contracts';
import { createLiveModel, createVercelTicketRunner, FileHistoryStore, SupportCoreClient } from '@openclaw-hosting/agent-loop';
import { MarkdownKnowledgeProvider } from '../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js';
import { createMockSupport, MOCK_SCOPE } from './lib/mock-support.js';
import { inputFor, score, summarize, type GoldenItem } from './lib/golden-eval.js';
import { supportKnowledgeRoot } from './lib/knowledge-setup.js';

// No environment files are loaded, and provider exceptions are never serialized.
const args = process.argv.slice(2);
const limit = args.length === 0 ? undefined : args.length === 2 && args[0] === '--limit' && /^[1-9]\d*$/.test(args[1] ?? '') ? Number(args[1]) : NaN;
if (Number.isNaN(limit)) throw new Error('Usage: pnpm eval:golden [--limit N]');
const source = await readFile(process.env.GOLDEN_SET_PATH ?? '/home/hatch/workspace/coffee-host-golden/golden_set.json', 'utf8');
const parsed: unknown = JSON.parse(source);
if (!Array.isArray(parsed) || !parsed.length || !parsed.every((item: GoldenItem) => item && typeof item.id === 'string' && typeof item.category === 'string' && typeof item.customer_problem === 'string' && Array.isArray(item.conversation) && item.conversation.every(m => m && typeof m.role === 'string' && typeof m.text === 'string') && Array.isArray(item.expected_points) && item.expected_points.length && item.expected_points.every(p => typeof p === 'string' && p.trim()) && ['resolved', 'handoff'].includes(item.outcome))) throw new Error('Invalid golden-set schema');
const items = (parsed as GoldenItem[]).slice(0, limit);
const outputDir = resolve('eval-results');
await mkdir(outputDir, { recursive: true, mode: 0o700 });
const output = join(outputDir, `golden-${new Date().toISOString().replace(/[:.]/g, '-')}-${items.length}.json`);
const provider = (process.env.MODEL_PROVIDER ?? 'sub2api').toLowerCase();
const endpoint = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://sub2api.coffeehost.net/v1';
const metadata = { model: process.env.AGENT_LIVE_MODEL_ID || 'gpt-6.1-sol', provider, endpoint, datasetSha256: createHash('sha256').update(source).digest('hex'), selected: items.length, total: parsed.length, temperature: 0.2, stepCap: 10, hosting: 'synthetic; not live customer state', scoring: 'NFKC lowercase punctuation/whitespace-stripped whole-point substring; no semantic judgement', trueResolution7d: null };
const blockers: string[] = [];
if (process.env.GOLDEN_LIVE_MODEL !== '1') blockers.push('GOLDEN_LIVE_MODEL=1 required; no model calls made');
if (!((provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.SUB2API_API_KEY) || '').trim()) blockers.push(`${provider === 'openai' ? 'OPENAI_API_KEY' : 'SUB2API_API_KEY'} absent`);
const knowledge = new MarkdownKnowledgeProvider(supportKnowledgeRoot(process.env));
let kbStats;
try { kbStats = await knowledge.stats(); if (!kbStats.articles) blockers.push('Reviewed KB has no articles'); }
catch { blockers.push('Reviewed KB absent or unreadable; supply SUPPORT_KNOWLEDGE_ROOT'); }
if (blockers.length) {
  await writeFile(output, JSON.stringify({ ...metadata, status: 'blocked', blockers, results: [] }, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ status: 'blocked', blockers, output }));
  process.exitCode = 1;
} else {
  const history = await mkdtemp(join(tmpdir(), 'golden-history-'));
  const results: (ReturnType<typeof score> & { id: string; category: string; outcome: GoldenItem["outcome"]; answer: string; drafts: string[]; handedOff: boolean; error: boolean; toolErrors: string[]; modelFailures: { name: string; status: number | null }[]; finishReasons: string[]; steps: number; latencyMs: number; citationGateViolation: boolean; evidence: { source: string; startLine: number; endLine: number; excerpt: string }[]; semanticSupport: string })[] = [];
  const started = Date.now();
  const baseModel = createLiveModel({ ...process.env, AGENT_LIVE_MODEL: '1' });
  if (typeof baseModel === 'string') throw new Error('Expected explicit provider model');
  try {
    for (const item of items) {
      const turnStart = Date.now();
      let steps = 0; let handedOff = false; let answer = ''; let error = false;
      const toolErrors: string[] = [];
      const modelFailures: { name: string; status: number | null }[] = [];
      const finishReasons: string[] = [];
      const drafts: string[] = [];
      const evidence: { source: string; startLine: number; endLine: number; excerpt: string }[] = [];
      const model = wrapLanguageModel({ model: baseModel, middleware: { specificationVersion: 'v4', wrapGenerate: async ({ doGenerate }) => {
        steps++;
        let result;
        try { result = await doGenerate(); }
        catch (error) {
          const e = error as { name?: unknown; statusCode?: unknown };
          modelFailures.push({ name: ['AI_APICallError', 'AbortError', 'TimeoutError', 'AI_NoOutputGeneratedError'].includes(String(e.name)) ? String(e.name) : 'OtherModelError', status: typeof e.statusCode === 'number' ? e.statusCode : null });
          throw error;
        }
        finishReasons.push(result.finishReason.unified);
        drafts.push(result.content.filter(c => c.type === 'text').map(c => c.text).join(''));
        return result;
      } } });
      const harness = createMockSupport(undefined, knowledge);
      const core = new SupportCoreClient('https://synthetic-core.example.invalid/', async (url, init) => {
        const path = new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).pathname;
        const response = await harness.app.inject({ method: init?.method === 'POST' ? 'POST' : 'GET', url: path, headers: Object.fromEntries(new Headers(init?.headers)), ...(typeof init?.body === 'string' ? { payload: init.body } : {}) });
        if (response.statusCode >= 400) toolErrors.push(`${path}:HTTP_${response.statusCode}`);
        if (path.endsWith('/handoff') && response.statusCode < 400) handedOff = true;
        if (path.endsWith('/knowledge/search') && response.statusCode < 400) evidence.push(...((JSON.parse(response.body) as KnowledgeSearchResponse).matches ?? []));
        return new Response(response.body, { status: response.statusCode, headers: { 'content-type': 'application/json' } });
      });
      const runner = createVercelTicketRunner({ model, core, history: new FileHistoryStore(join(history, item.id)), authenticate: async ({ sessionId, ticketToken }) => {
        const scope = harness.tokens.verify(ticketToken);
        if (sessionId !== scope.channelId || !await harness.bridge.read(scope)) throw new Error('Session mismatch');
        return { scope, selectedServiceRef: 'whmcs-service:1', assertCurrent: async () => {
          harness.tokens.verify(ticketToken);
          const snapshot = await harness.bridge.read(scope);
          if (!snapshot || !['AI_ACTIVE', 'WAITING_CUSTOMER'].includes(snapshot.state)) throw new Error('Retired session');
        } };
      } });
      try {
        answer = (await runner.run({ sessionId: MOCK_SCOPE.channelId, ticketToken: await harness.bridge.contextForCustomer(MOCK_SCOPE), prompt: inputFor(item) }, new AbortController().signal)).reply;
      } catch { error = true; }
      finally { await harness.app.close(); }
      const scrub = (text: string) => [process.env.SUB2API_API_KEY, process.env.OPENAI_API_KEY].reduce<string>((value, secret) => secret ? value.split(secret).join('[REDACTED]') : value, text);
      const hasGateEvidence = evidence.some(e => answer.includes(`[${e.source}:${e.startLine}-${e.endLine}]`) && answer.includes(e.excerpt));
      results.push({ id: item.id, category: item.category, outcome: item.outcome, answer: scrub(answer), drafts: drafts.map(scrub), handedOff, error, toolErrors, modelFailures, finishReasons, steps, latencyMs: Date.now() - turnStart,
        citationGateViolation: !error && !handedOff && !hasGateEvidence, evidence: evidence.map(e => ({ source: scrub(e.source), startLine: e.startLine, endLine: e.endLine, excerpt: scrub(e.excerpt) })), semanticSupport: 'not assessed', ...score(item, answer, handedOff, error) });
      await writeFile(output, JSON.stringify({ ...metadata, kbStats, status: 'running', results }, null, 2), { mode: 0o600 });
      console.log(`${item.id}: ${error ? 'error' : handedOff ? 'handoff' : 'answer'} (${steps} steps)`);
    }
    const summary = summarize(results);
    const perCategory = Object.fromEntries([...new Set(items.map(i => i.category))].sort().map(category => [category, summarize(results.filter(r => r.category === category))]));
    const report = { ...metadata, kbStats, status: 'completed', elapsedMs: Date.now() - started, summary, perCategory, averageSteps: results.reduce((n, r) => n + r.steps, 0) / results.length, cost: null, results };
    await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
    console.log(JSON.stringify({ ...report, results: undefined, output }, null, 2));
    if (results.some(r => r.error)) process.exitCode = 1;
  } finally { await rm(history, { recursive: true, force: true }); }
}
