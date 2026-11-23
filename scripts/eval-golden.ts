import { mkdir, readFile, writeFile, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import { wrapLanguageModel } from 'ai';
import type { KnowledgeSearchResponse } from '@support-ai-agent/contracts';
import { createLiveModel, createVercelTicketRunner, FileHistoryStore, SupportCoreClient } from '@support-ai-agent/agent-loop';
import { MarkdownKnowledgeProvider } from '../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js';
import { OpenAIEmbeddings, SemanticKnowledgeProvider } from '../apps/support-core/dist/src/adapters/semantic-knowledge-provider.js';
import { createMockSupport, MOCK_SCOPE } from './lib/mock-support.js';
import { inputFor, score, summarize, type GoldenItem } from './lib/golden-eval.js';
import { judgeModel, judgeEndpoint, rubricVersion, requestJudgment, parseJudgment, scoreSemantic, summarizeSemantic, type SemanticResult } from './lib/semantic-judge.js';
import { classifyGolden, summarizeAnswerability, type Answerability } from './lib/golden-answerability.js';
import { supportKnowledgeRoot } from './lib/knowledge-setup.js';

type GoldenResult = { lexical: ReturnType<typeof score>; semantic: SemanticResult; answerability: Answerability; id: string; category: string; outcome: GoldenItem["outcome"]; answer: string; drafts: string[]; handedOff: boolean; error: boolean; toolErrors: string[]; modelFailures: { name: string; status: number | null }[]; finishReasons: string[]; steps: number; attempts: number; latencyMs: number; citationGateViolation: boolean; evidence: { source: string; startLine: number; endLine: number; excerpt: string }[]; semanticSupport: string; semanticScores: { source: string; startLine: number; score: number }[] };
type GoldenCheckpoint = Record<string, unknown> & {
  status: string;
  selected: number;
  elapsedMs?: number;
  results: GoldenResult[];
};

// No environment files are loaded, and provider exceptions are never serialized.
const { values: args } = parseArgs({ options: { limit: { type: 'string' }, resume: { type: 'string' } } });
if (args.limit !== undefined && (!/^[1-9]\d*$/.test(args.limit) || !Number.isSafeInteger(Number(args.limit)))) {
  throw new Error('Usage: pnpm eval:golden [--limit N] [--resume <result-file>]');
}
const checkpoint = args.resume === undefined ? undefined : JSON.parse(await readFile(resolve(args.resume), 'utf8')) as GoldenCheckpoint | null;
if (args.resume !== undefined && (
  checkpoint?.status !== 'running' || !Number.isSafeInteger(checkpoint.selected) ||
  checkpoint.selected < 1 || !Array.isArray(checkpoint.results)
)) throw new Error('Expected a running golden eval checkpoint');

const source = await readFile(process.env.GOLDEN_SET_PATH ?? '/home/hatch/workspace/coffee-host-golden/golden_set.json', 'utf8');
const parsed: unknown = JSON.parse(source);
if (!Array.isArray(parsed) || !parsed.length || !parsed.every((item: GoldenItem) => item && typeof item.id === 'string' && typeof item.category === 'string' && typeof item.customer_problem === 'string' && Array.isArray(item.conversation) && item.conversation.every(m => m && typeof m.role === 'string' && typeof m.text === 'string') && typeof item.staff_resolution === 'string' && item.staff_resolution.trim() && Array.isArray(item.expected_points) && item.expected_points.length && item.expected_points.every(p => typeof p === 'string' && p.trim()) && ['resolved', 'handoff'].includes(item.outcome))) throw new Error('Invalid golden-set schema');
const items = (parsed as GoldenItem[]).slice(0, args.limit === undefined ? checkpoint?.selected : Number(args.limit));
const datasetSha256 = createHash('sha256').update(source).digest('hex');
const manifestSource = await readFile(process.env.GOLDEN_ANSWERABILITY_PATH ?? new URL('./lib/golden-answerability.json', import.meta.url), 'utf8');
const answerability = classifyGolden(JSON.parse(manifestSource) as Parameters<typeof classifyGolden>[0], datasetSha256, parsed.length);
const outputDir = resolve('eval-results');
await mkdir(outputDir, { recursive: true, mode: 0o700 });
const output = args.resume !== undefined ? resolve(args.resume) : join(outputDir, `golden-${new Date().toISOString().replace(/[:.]/g, '-')}-${items.length}.json`);
const provider = (process.env.MODEL_PROVIDER ?? 'sub2api').toLowerCase();
const endpoint = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://sub2api.coffeehost.net/v1';
const modelId = process.env.MODEL_ID || process.env.AGENT_LIVE_MODEL_ID || 'gpt-6.1-sol';
const metadata = { model: modelId, provider, endpoint, datasetSha256, answerabilityManifestSha256: createHash('sha256').update(manifestSource).digest('hex'), selected: items.length, total: parsed.length, temperature: 0.2, stepCap: 10, hosting: 'synthetic; not live customer state', scoring: { primary: 'semantic', judgeModel, judgeEndpoint, rubricVersion, lexical: 'NFKC lowercase punctuation/whitespace-stripped whole-point substring' }, trueResolution7d: null };
async function writeCheckpoint(report: object) {
  const temporary = `${output}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, JSON.stringify(report, null, 2), { mode: 0o600, flag: 'wx' });
    await rename(temporary, output);
  } finally {
    await rm(temporary, { force: true });
  }
}

const blockers: string[] = [];
if (process.env.EMBEDDING_PROVIDER && process.env.EMBEDDING_PROVIDER !== 'openai') blockers.push('EMBEDDING_PROVIDER must be openai or unset');
if (process.env.GOLDEN_LIVE_MODEL !== '1') blockers.push('GOLDEN_LIVE_MODEL=1 required; no model calls made');
if (!((provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.SUB2API_API_KEY) || '').trim()) blockers.push(`${provider === 'openai' ? 'OPENAI_API_KEY' : 'SUB2API_API_KEY'} absent`);
const judgeKey = process.env.SUB2API_API_KEY?.trim();
if (!judgeKey && provider === 'openai') blockers.push('SUB2API_API_KEY absent for semantic judge');
const knowledge = new MarkdownKnowledgeProvider(supportKnowledgeRoot(process.env));
let kbStats;
try { kbStats = await knowledge.stats(); if (!kbStats.articles) blockers.push('Reviewed KB has no articles'); }
catch { blockers.push('Reviewed KB absent or unreadable; supply SUPPORT_KNOWLEDGE_ROOT'); }
if (blockers.length) {
  if (!checkpoint) await writeCheckpoint({ ...metadata, status: 'blocked', blockers, results: [] });
  console.log(JSON.stringify({ status: 'blocked', blockers, output }));
  process.exitCode = 1;
} else {
  const semanticSearch = process.env.EMBEDDING_PROVIDER === 'openai'
    ? await SemanticKnowledgeProvider.load(knowledge, new OpenAIEmbeddings(), resolve(process.env.KB_INDEX_PATH || '.kb-index/passages.json')) : undefined;
  const retrieval = semanticSearch ? { provider: 'openai', model: semanticSearch.index.model, threshold: 0.4, hybrid: 'cosine + 0.02/(lexical rank + 1)', digest: semanticSearch.index.digest } : { provider: 'lexical' };
  Object.assign(metadata, { retrieval });
  if (checkpoint && (
    !Object.entries({ ...metadata, kbStats }).every(([key, value]) => isDeepStrictEqual(checkpoint[key], value)) ||
    checkpoint.results.length > items.length ||
    !checkpoint.results.every((row: { id?: string } | null, index: number) => row?.id === items[index]?.id)
  )) throw new Error('Checkpoint does not match this eval configuration or the selected item order');

  const history = await mkdtemp(join(tmpdir(), 'golden-history-'));
  const results: GoldenResult[] = checkpoint?.results ?? [];
  const previousElapsedMs = checkpoint?.elapsedMs ?? results.reduce((total, row) => total + row.latencyMs, 0);
  const started = Date.now();
  const baseModel = createLiveModel({ ...process.env, AGENT_LIVE_MODEL: '1' });
  if (typeof baseModel === 'string') throw new Error('Expected explicit provider model');
  try {
    for (const [index, item] of items.entries()) {
      if (index < results.length) continue;
      const turnStart = Date.now();
      let steps = 0; let handedOff = false; let answer = ''; let error = false; let attempts = 0; let transientFailure = false;
      const toolErrors: string[] = [];
      const modelFailures: { name: string; status: number | null }[] = [];
      const finishReasons: string[] = [];
      const drafts: string[] = [];
      const semanticScores: { source: string; startLine: number; score: number }[] = [];
      const evidence: { source: string; startLine: number; endLine: number; excerpt: string }[] = [];
      const model = wrapLanguageModel({ model: baseModel, middleware: { specificationVersion: 'v4', wrapGenerate: async ({ doGenerate }) => {
        steps++;
        let result;
        try { result = await doGenerate(); }
        catch (error) {
          const e = error as { name?: unknown; statusCode?: unknown };
          const storeContinuation = /store.{0,30}false|previous.{0,30}response|rs_[a-z0-9]+.{0,30}not found/i.test(error instanceof Error ? error.message : '');
          modelFailures.push({ name: storeContinuation ? 'StoreContinuationError' : ['AI_APICallError', 'AbortError', 'TimeoutError', 'AI_NoOutputGeneratedError'].includes(String(e.name)) ? String(e.name) : 'OtherModelError', status: typeof e.statusCode === 'number' ? e.statusCode : null });
          throw error;
        }
        finishReasons.push(result.finishReason.unified);
        drafts.push(result.content.filter(c => c.type === 'text').map(c => c.text).join(''));
        return result;
      } } });
      const harness = createMockSupport(undefined, semanticSearch ?? knowledge);
      const core = new SupportCoreClient('https://synthetic-core.example.invalid/', async (url, init) => {
        const path = new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).pathname;
        const response = await harness.app.inject({ method: init?.method === 'POST' ? 'POST' : 'GET', url: path, headers: Object.fromEntries(new Headers(init?.headers)), ...(typeof init?.body === 'string' ? { payload: init.body } : {}) });
        if (response.statusCode >= 400) toolErrors.push(`${path}:HTTP_${response.statusCode}`);
        if (path.endsWith('/handoff') && response.statusCode < 400) handedOff = true;
        if (path.endsWith('/knowledge/search') && response.statusCode < 400) evidence.push(...((JSON.parse(response.body) as KnowledgeSearchResponse).matches ?? []));
        return new Response(response.body, { status: response.statusCode, headers: { 'content-type': 'application/json' } });
      });
      const runner = createVercelTicketRunner({ model, core, ...(semanticSearch ? { semanticRelevance: { threshold: 0.4, similarity: async (query, passage) => {
        const score = await semanticSearch.similarity(query, passage);
        semanticScores.push({ source: passage.source, startLine: passage.startLine, score });
        return score;
      } } } : {}), history: new FileHistoryStore(join(history, item.id)), authenticate: async ({ sessionId, ticketToken }) => {
        const scope = harness.tokens.verify(ticketToken);
        if (sessionId !== scope.channelId || !await harness.bridge.read(scope)) throw new Error('Session mismatch');
        return { scope, selectedServiceRef: 'whmcs-service:1', assertCurrent: async () => {
          harness.tokens.verify(ticketToken);
          const snapshot = await harness.bridge.read(scope);
          if (!snapshot || !['AI_ACTIVE', 'WAITING_CUSTOMER'].includes(snapshot.state)) throw new Error('Retired session');
        } };
      } });
      try {
      do {
        attempts++;
        error = false;
        transientFailure = false;
        const failuresBeforeAttempt = modelFailures.length;
        try {
          answer = (await runner.run({ sessionId: MOCK_SCOPE.channelId, ticketToken: await harness.bridge.contextForCustomer(MOCK_SCOPE), prompt: inputFor(item) }, new AbortController().signal)).reply;
          transientFailure = modelFailures.slice(failuresBeforeAttempt).some(f => f.status === 502 || f.status === 503 || f.status === 504 || f.name === 'StoreContinuationError');
        } catch (caught) {
          error = true;
          const detail = caught instanceof Error ? caught.message : '';
          transientFailure ||= /store.{0,30}false|previous.{0,30}response|rs_[a-z0-9]+.{0,30}not found/i.test(detail);
          if (transientFailure && attempts < 3) await new Promise(resolve => setTimeout(resolve, attempts * 1000));
        }
      } while (transientFailure && attempts < 3);
      }
      finally { await harness.app.close(); }
      const scrub = (text: string) => [process.env.SUB2API_API_KEY, process.env.OPENAI_API_KEY].reduce<string>((value, secret) => secret ? value.split(secret).join('[REDACTED]') : value, text);
      const hasGateEvidence = evidence.some(e => answer.includes(`[${e.source}:${e.startLine}-${e.endLine}]`) && answer.includes(e.excerpt));
      const semantic = await scoreSemantic(item, { answer: scrub(answer), handedOff, error }, async (reference, delivered) => {
        const judgment = parseJudgment(await requestJudgment(reference, delivered, judgeKey ?? ''), reference.expected_points.length);
        return { ...judgment, reason: scrub(judgment.reason) };
      });
      results.push({ id: item.id, category: item.category, outcome: item.outcome, answer: scrub(answer), drafts: drafts.map(scrub), handedOff, error, toolErrors, modelFailures, finishReasons, steps, attempts, latencyMs: Date.now() - turnStart,
        citationGateViolation: !error && !handedOff && !hasGateEvidence, evidence: evidence.map(e => ({ source: scrub(e.source), startLine: e.startLine, endLine: e.endLine, excerpt: scrub(e.excerpt) })), semanticSupport: 'not assessed', semanticScores, semantic, answerability: answerability[index] ?? 'unclassified', lexical: score(item, answer, handedOff, error) });
      await writeCheckpoint({ ...metadata, kbStats, status: 'running', elapsedMs: previousElapsedMs + Date.now() - started, results });
      console.log(`${item.id}: ${error ? 'error' : handedOff ? 'handoff' : 'answer'} (${steps} steps)`);
    }
    const semanticSummary = summarizeSemantic(results);
    const lexicalSummary = (rows: typeof results) => summarize(rows.map(row => ({ ...row.lexical, category: row.category, outcome: row.outcome })));
    const categories = [...new Set(items.map(i => i.category))].sort();
    const perCategory = Object.fromEntries(categories.map(category => [category, summarizeSemantic(results.filter(r => r.category === category))]));
    const lexicalDiagnostic = {
      overall: lexicalSummary(results),
      perCategory: Object.fromEntries(categories.map(category => [category, lexicalSummary(results.filter(r => r.category === category))])),
    };
    const report = { ...metadata, kbStats, status: 'completed', elapsedMs: previousElapsedMs + Date.now() - started, semanticSummary, byAnswerability: summarizeAnswerability(results), perCategory, lexicalDiagnostic, averageSteps: results.reduce((n, r) => n + r.steps, 0) / results.length, cost: null, results };
    await writeCheckpoint(report);
    console.log(JSON.stringify({ ...report, results: undefined, output }, null, 2));
    if (semanticSummary.unscored > 0) process.exitCode = 1;
  } finally { await rm(history, { recursive: true, force: true }); }
}
