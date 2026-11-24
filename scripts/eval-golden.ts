import { mkdir, readFile, writeFile, mkdtemp, rename, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { isDeepStrictEqual, parseArgs } from 'node:util';
import { createHash, randomUUID } from 'node:crypto';
import type { LanguageModelMiddleware } from 'ai';
import type { KnowledgeSearchResponse } from '@support-ai-agent/contracts';
import { createLiveDraftVerifier, createLiveModel, createVercelTicketRunner, FileHistoryStore, resolveAnswerModel, SupportCoreClient, TurnTimeout, type CitationGate, type DraftVerifier } from '@support-ai-agent/agent-loop';
import { MarkdownKnowledgeProvider } from '../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js';
import { OpenAIEmbeddings, SemanticKnowledgeProvider } from '../apps/support-core/dist/src/adapters/semantic-knowledge-provider.js';
import { createMockSupport, MOCK_SCOPE } from './lib/mock-support.js';
import { inputFor, score, selectGoldenItems, summarize, type GoldenItem } from './lib/golden-eval.js';
import { judgeModel, judgeEndpoint, rubricVersion, requestJudgment, parseJudgment, scoreSemantic, scoreHandoffContent, reconcileReference, summarizeSemantic, type SemanticResult, type HandoffContentVerdict, type ReferenceConflict } from './lib/semantic-judge.js';
import { answerabilityForItem, classifyGolden, summarizeAnswerability, type Answerability } from './lib/golden-answerability.js';
import { supportKnowledgeRoot } from './lib/knowledge-setup.js';
import { observedEffort, observedModel, observedTier, providerFailure, requestId, type ModelFailure } from './lib/golden-provider-trace.js';

type EventLog = { attempt: number; kind: 'tool' | 'gate' | 'judge' | 'diagnostic'; name: string; status: string; detail?: string };
type Span = { source: string; startLine: number; endLine: number };
type ModelCall = {
  startedAt: string; elapsedMs: number | null; promptBytes: number; inputTokens: number | null;
  outputTokens: number | null; textTokens: number | null; reasoningTokens: number | null;
  outputLimit: number | null; finishReason: string | null;
  clientRequestId: string | null; responseRequestId: string | null;
  requestedTier: string | null; responseTier: string | null;
  requestedEffort: string | null; responseEffort: string | null;
  requestedModel: string | null; responseModel: string | null;
};
type AttemptTrace = {
  attempt: number;
  startedAt: string;
  endedAt: string;
  latencyMs: number;
  modelCallsMs: number[];
  plannedDraftEffort: string | null;
  answerCalls: ModelCall[];
  reviewCalls: ModelCall[];
  verificationMs: number | null;
  timedOutStage: TurnTimeout['stage'] | null;
  modelFailures: ModelFailure[];
  toolCounts: Record<string, number>;
  readWindows: Record<string, number>;
  retrievedEvidence: Span[];
  admittedEvidence: Span[];
  drafts: string[];
  answer: string;
  delivery: 'answer' | 'handoff' | 'error';
  citationVerdict: CitationGate['status'] | null;
  answerComplete: boolean | null;
  semanticVerdict: SemanticResult['verdict'];
};
type GoldenResult = { lexical: ReturnType<typeof score>; semantic: SemanticResult; handoffContentVerdict?: HandoffContentVerdict; referenceConflict?: ReferenceConflict; eventLog?: EventLog[]; attemptTraces?: AttemptTrace[]; answerability: Answerability; id: string; category: string; outcome: GoldenItem["outcome"]; answer: string; drafts: string[]; handedOff: boolean; error: boolean; toolErrors: string[]; modelFailures: ModelFailure[]; finishReasons: string[]; steps: number; attempts: number; latencyMs: number; citationGateViolation: boolean; ungroundedDelivery?: boolean; citationGateAttempts?: (CitationGate | null)[]; answerCompletenessAttempts?: (boolean | null)[]; contentCoverage?: boolean | null; currentPolicyCoverage?: boolean; handoffMarkerPresent?: boolean; handoffMarkerOverridden?: boolean; evidence: { source: string; startLine: number; endLine: number; excerpt: string; policyProvenance?: string }[]; admittedEvidence: { source: string; startLine: number; endLine: number }[]; semanticSupport: string; semanticScores: { source: string; startLine: number; score: number }[] };
type GoldenCheckpoint = Record<string, unknown> & {
  status: string;
  selected: number;
  selectedIds?: string[];
  elapsedMs?: number;
  results: GoldenResult[];
};

type ResponsesSettings = { service_tier?: unknown; reasoning?: { effort?: unknown } };

// No environment files are loaded. Persist selected diagnostics from provider errors.
const { values: args } = parseArgs({ options: {
  limit: { type: 'string' }, resume: { type: 'string' }, ids: { type: 'string' },
  'expect-index': { type: 'string' }, 'without-deployment-trigger': { type: 'boolean' },
  'gs030-max-control': { type: 'boolean' }
} });
if ((args.limit !== undefined && (!/^[1-9]\d*$/.test(args.limit) || !Number.isSafeInteger(Number(args.limit)))) ||
    (args.ids !== undefined && !args.ids.split(',').every(id => /^GS-\d+$/.test(id)))) {
  throw new Error('Usage: pnpm eval:golden [--limit N] [--ids GS-001,GS-002] [--resume <result-file>]');
}
const checkpoint = args.resume === undefined ? undefined : JSON.parse(await readFile(resolve(args.resume), 'utf8')) as GoldenCheckpoint | null;
if (args.resume !== undefined && (
  checkpoint?.status !== 'running' || !Number.isSafeInteger(checkpoint.selected) ||
  checkpoint.selected < 1 || !Array.isArray(checkpoint.results)
)) throw new Error('Expected a running golden eval checkpoint');

const source = await readFile(process.env.GOLDEN_SET_PATH ?? '/home/hatch/workspace/coffee-host-golden/golden_set.json', 'utf8');
const parsed: unknown = JSON.parse(source);
if (!Array.isArray(parsed) || !parsed.length || !parsed.every((item: GoldenItem) => item && typeof item.id === 'string' && typeof item.category === 'string' && typeof item.customer_problem === 'string' && Array.isArray(item.conversation) && item.conversation.every(m => m && typeof m.role === 'string' && typeof m.text === 'string') && typeof item.staff_resolution === 'string' && item.staff_resolution.trim() && Array.isArray(item.expected_points) && item.expected_points.length && item.expected_points.every(p => typeof p === 'string' && p.trim()) && ['resolved', 'handoff'].includes(item.outcome))) throw new Error('Invalid golden-set schema');
const selectedIds = args.ids?.split(',') ?? checkpoint?.selectedIds;
const selectedLimit = args.limit === undefined ? checkpoint?.selected : Number(args.limit);
const items = selectGoldenItems(parsed as GoldenItem[], {
  ...(selectedIds === undefined ? {} : { ids: selectedIds }),
  ...(selectedLimit === undefined ? {} : { limit: selectedLimit }),
});
const datasetSha256 = createHash('sha256').update(source).digest('hex');
const manifestSource = await readFile(process.env.GOLDEN_ANSWERABILITY_PATH ?? new URL('./lib/golden-answerability.json', import.meta.url), 'utf8');
const answerability = classifyGolden(JSON.parse(manifestSource) as Parameters<typeof classifyGolden>[0], datasetSha256, parsed.length);
const outputDir = resolve('eval-results');
await mkdir(outputDir, { recursive: true, mode: 0o700 });
const output = args.resume !== undefined ? resolve(args.resume) : join(outputDir, `golden-${new Date().toISOString().replace(/[:.]/g, '-')}-${items.length}.json`);
const provider = (process.env.MODEL_PROVIDER ?? 'sub2api').toLowerCase();
const endpoint = provider === 'openai' ? 'https://api.openai.com/v1' : 'https://sub2api.coffeehost.net/v1';
const answerModel = resolveAnswerModel();
const gs030Effort = answerModel.reasoningEffort === 'max' && items.some(item => item.id === 'GS-030')
  ? args['gs030-max-control'] ? 'max' : 'medium'
  : undefined;
const deploymentPolicyFocus = !args['without-deployment-trigger'];
const metadata = { model: answerModel.modelId, requestedReasoningEffort: answerModel.reasoningEffort, ...(gs030Effort ? { pinnedDraftEfforts: { 'GS-030': gs030Effort } } : {}), requestedServiceTier: answerModel.serviceTier, deploymentPolicyFocus, provider, endpoint, datasetSha256, answerabilityManifestSha256: createHash('sha256').update(manifestSource).digest('hex'), selected: items.length, ...(args.ids !== undefined || checkpoint?.selectedIds ? { selectedIds: items.map(item => item.id) } : {}), total: parsed.length, temperature: 0.2, stepCap: 10, hosting: 'synthetic; not live customer state', scoring: { primary: 'semantic', judgeModel, judgeEndpoint, rubricVersion, lexical: 'NFKC lowercase punctuation/whitespace-stripped whole-point substring' }, trueResolution7d: null };
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
  const expectedIndex = args['expect-index'];
  if (expectedIndex !== undefined && (!/^[a-f0-9]{8,64}$/u.test(expectedIndex) || !semanticSearch?.index.digest.startsWith(expectedIndex))) {
    throw new Error('Eval index digest does not match the requested corpus');
  }
  const retrieval = semanticSearch ? { provider: 'openai', model: semanticSearch.index.model, threshold: 0.4, hybrid: 'cosine + 0.02/(lexical rank + 1)', digest: semanticSearch.index.digest } : { provider: 'lexical' };
  Object.assign(metadata, { retrieval });
  if (checkpoint && (
    (checkpoint.selectedIds !== undefined && !isDeepStrictEqual(checkpoint.selectedIds, items.map(item => item.id))) ||
    !Object.entries({ ...metadata, kbStats }).every(([key, value]) => isDeepStrictEqual(checkpoint[key], value)) ||
    checkpoint.results.length > items.length ||
    !checkpoint.results.every((row: { id?: string } | null, index: number) => row?.id === items[index]?.id)
  )) throw new Error('Checkpoint does not match this eval configuration or the selected item order');

  const history = await mkdtemp(join(tmpdir(), 'golden-history-'));
  const results: GoldenResult[] = checkpoint?.results ?? [];
  const previousElapsedMs = checkpoint?.elapsedMs ?? results.reduce((total, row) => total + row.latencyMs, 0);
  const started = Date.now();
  const liveEnvironment = { ...process.env, AGENT_LIVE_MODEL: '1' };
  try {
    for (const [index, item] of items.entries()) {
      const saved = results[index];
      if (saved && saved.semantic.verdict !== null) continue;
      const turnStart = Date.now();
      let steps = 0; let handedOff = false; let answer = ''; let error = false; let attempts = 0; let transientFailure = false;
      const toolErrors: string[] = [];
      const modelFailures: ModelFailure[] = [];
      const finishReasons: string[] = [];
      const drafts: string[] = [];
      const answerCompletenessAttempts: (boolean | null)[] = [];
      let finalContentCoverage: boolean | null = null;
      const citationGateAttempts: (CitationGate | null)[] = [];
      const semanticScores: { source: string; startLine: number; score: number }[] = [];
      const evidence: { source: string; startLine: number; endLine: number; excerpt: string; policyProvenance?: string }[] = [];
      let admittedEvidence: { source: string; startLine: number; endLine: number }[] = [];
      let handoffMarkerPresent = false;
      let handoffMarkerOverridden = false;
      const eventLog: EventLog[] = [];
      const attemptTraces: AttemptTrace[] = [];
      let answerCalls: ModelCall[] = [];
      let reviewCalls: ModelCall[] = [];
      let attemptFailures: ModelFailure[] = [];
      let verificationMs: number | null = null;
      const scrub = (text: string) => [process.env.SUB2API_API_KEY, process.env.OPENAI_API_KEY].reduce<string>((value, secret) => secret ? value.split(secret).join('[REDACTED]') : value, text);
      const spans = (rows: readonly Span[]) => [...new Map(rows.map(({ source, startLine, endLine }) =>
        [JSON.stringify([source, startLine, endLine]), { source: scrub(source), startLine, endLine }]
      )).values()];
      const trace = (stage: ModelFailure['stage']): LanguageModelMiddleware => ({
        specificationVersion: 'v4',
        transformParams: ({ params }) => Promise.resolve({ ...params, headers: { ...params.headers, 'x-client-request-id': randomUUID() } }),
        async wrapGenerate({ doGenerate, model, params }) {
          const start = performance.now();
          const draft = stage === 'draft';
          const failures = attemptFailures;
          if (draft) steps++;
          const call: ModelCall = {
            startedAt: new Date().toISOString(), elapsedMs: null, promptBytes: Buffer.byteLength(JSON.stringify(params.prompt)),
            inputTokens: null, outputTokens: null, textTokens: null, reasoningTokens: null,
            outputLimit: params.maxOutputTokens ?? null, finishReason: null,
            clientRequestId: requestId(params.headers?.['x-client-request-id']), responseRequestId: null,
            requestedModel: observedModel(model.modelId), responseModel: null,
            requestedTier: observedTier(params.providerOptions?.openai?.serviceTier), responseTier: null,
            requestedEffort: observedEffort(params.providerOptions?.openai?.reasoningEffort), responseEffort: null
          };
          (draft ? answerCalls : reviewCalls).push(call);
          try {
            const result = await doGenerate();
            const request = result.request?.body as ResponsesSettings | undefined;
            const response = result.response?.body as ResponsesSettings | undefined;
            Object.assign(call, {
              inputTokens: result.usage.inputTokens.total ?? null, outputTokens: result.usage.outputTokens.total ?? null,
              textTokens: result.usage.outputTokens.text ?? null, reasoningTokens: result.usage.outputTokens.reasoning ?? null,
              finishReason: result.finishReason.unified, responseRequestId: requestId(result.response?.headers?.['x-request-id']),
              responseModel: observedModel(result.response?.modelId),
              requestedTier: observedTier(request?.service_tier) ?? call.requestedTier,
              responseTier: observedTier(response?.service_tier ?? result.providerMetadata?.openai?.serviceTier),
              requestedEffort: observedEffort(request?.reasoning?.effort) ?? call.requestedEffort,
              responseEffort: observedEffort(response?.reasoning?.effort)
            });
            if (draft && !params.abortSignal?.aborted) {
              finishReasons.push(result.finishReason.unified);
              drafts.push(result.content.filter(c => c.type === 'text').map(c => c.text).join(''));
            }
            return result;
          } catch (error) {
            const failure = providerFailure(error, stage, scrub);
            failures.push(failure);
            call.responseModel = failure.responseModel;
            call.responseRequestId = failure.responseRequestId;
            throw error;
          } finally {
            call.elapsedMs = Math.round(performance.now() - start);
          }
        }
      });
      const pinnedEffort = item.id === 'GS-030' ? gs030Effort : undefined;
      const model = createLiveModel(liveEnvironment, { ...(pinnedEffort ? { pinnedEffort } : {}), middleware: trace('draft') });
      const liveVerifier = createLiveDraftVerifier(liveEnvironment, trace('review'));
      const verifyDraft: DraftVerifier = async (input, signal) => {
        const start = performance.now();
        const failures = attemptFailures;
        const before = failures.length;
        try { return await liveVerifier(input, signal); }
        catch (error) {
          if (failures.length === before) failures.push(providerFailure(error, 'review', scrub));
          throw error;
        } finally {
          if (failures === attemptFailures) verificationMs = Math.round(performance.now() - start);
        }
      };
      do {
        attempts++;
        const attemptStart = Date.now();
        const draftsBeforeAttempt = drafts.length;
        const observedAdmissions: Span[] = [];
        const toolCounts: Record<string, number> = {};
        const readWindows: Record<string, number> = {};
        answerCalls = [];
        reviewCalls = [];
        attemptFailures = [];
        verificationMs = null;
        admittedEvidence = [];
        let answerComplete: boolean | null = null;
        let timedOutStage: TurnTimeout['stage'] | null = null;
        let currentContentCoverage: boolean | null = null;
        let citationGate: CitationGate | null = null;
        answer = '';
        handedOff = false;
        handoffMarkerPresent = false;
        handoffMarkerOverridden = false;
        error = false;
        toolErrors.length = 0;
        evidence.length = 0;
        semanticScores.length = 0;
        transientFailure = false;
        const harness = createMockSupport(undefined, semanticSearch ?? knowledge);
        const core = new SupportCoreClient('https://synthetic-core.example.invalid/', async (url, init) => {
          const path = new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url).pathname;
          toolCounts[path] = (toolCounts[path] ?? 0) + 1;
          const body = typeof init?.body === 'string' ? init.body : undefined;
          if (path.endsWith('/knowledge/read') && body) readWindows[body] = (readWindows[body] ?? 0) + 1;
          const response = await harness.withRequestSignal(init?.signal, () => harness.app.inject({
            method: init?.method === 'POST' ? 'POST' : 'GET', url: path, headers: Object.fromEntries(new Headers(init?.headers)),
            ...(body === undefined ? {} : { payload: body }), ...(init?.signal ? { signal: init.signal } : {})
          }));
          if (response.statusCode >= 400) toolErrors.push(`${path}:HTTP_${response.statusCode}`);
          eventLog.push({ attempt: attempts, kind: 'tool', name: path, status: response.statusCode >= 400 ? 'error' : 'ok', ...(response.statusCode >= 400 ? { detail: `HTTP_${response.statusCode}` } : {}) });
          if (path.endsWith('/handoff') && response.statusCode < 400) handedOff = true;
          if (path.endsWith('/knowledge/search') && response.statusCode < 400) evidence.push(...((JSON.parse(response.body) as KnowledgeSearchResponse).matches ?? []));
          return new Response(response.body, { status: response.statusCode, headers: { 'content-type': 'application/json' } });
        });
        const runner = createVercelTicketRunner({ model, core, verifyDraft, deploymentPolicyFocus, prefetchSemanticEvidence: true, onAdmittedEvidence: rows => observedAdmissions.push(...rows), ...(semanticSearch ? { semanticRelevance: { threshold: 0.4, similarity: async (query, passage, signal) => {
          const score = await semanticSearch.similarity(query, passage, signal);
          semanticScores.push({ source: passage.source, startLine: passage.startLine, score });
          return score;
        } } } : {}), history: new FileHistoryStore(join(history, item.id, String(attempts))), authenticate: async ({ sessionId, ticketToken }) => {
          const { scope, expiresAtMs } = harness.tokens.verifyContext(ticketToken);
          const initial = await harness.bridge.read(scope);
          if (sessionId !== scope.channelId || !initial) throw new Error('Session mismatch');
          return { scope, expiresAtMs, selectedServiceRef: 'whmcs-service:1', assertCurrent: async () => {
            harness.tokens.verify(ticketToken);
            const snapshot = await harness.bridge.read(scope);
            if (snapshot?.revision !== initial.revision || !['AI_ACTIVE', 'WAITING_CUSTOMER'].includes(snapshot.state)) throw new Error('Retired session');
          } };
        } });
        try {
          const result = await runner.run({ sessionId: MOCK_SCOPE.channelId, ticketToken: await harness.bridge.contextForCustomer(MOCK_SCOPE), prompt: inputFor(item) }, new AbortController().signal);
          ({ reply: answer, citationGate, answerComplete, contentCoverage: currentContentCoverage, admittedEvidence, handoffMarkerPresent, handoffMarkerOverridden, timedOutStage } = result);
          eventLog.push({ attempt: attempts, kind: 'diagnostic', name: 'handoffMarker', status: handoffMarkerPresent ? 'present' : 'absent' });
          if (handoffMarkerPresent) eventLog.push({ attempt: attempts, kind: 'diagnostic', name: 'handoffMarkerDecision', status: handoffMarkerOverridden ? 'overridden' : 'retained' });
        } catch (caught) {
          error = true;
          if (caught instanceof TurnTimeout) timedOutStage = caught.stage;
          const detail = caught instanceof Error ? caught.message : '';
          transientFailure = (caught instanceof Error && ['TimeoutError', 'AbortError'].includes(caught.name)) ||
            /store.{0,30}false|previous.{0,30}response|rs_[a-z0-9]+.{0,30}not found/i.test(detail);
        } finally {
          await harness.app.close();
        }
        citationGateAttempts.push(citationGate);
        answerCompletenessAttempts.push(answerComplete);
        finalContentCoverage = currentContentCoverage;
        eventLog.push({ attempt: attempts, kind: 'gate', name: 'citationGate', status: citationGate?.status ?? 'none' });
        modelFailures.push(...attemptFailures);
        if (timedOutStage) {
          error = true;
          transientFailure = true;
        }
        transientFailure ||= attemptFailures.some(f => f.retryable);
        // The runner can turn a provider error into a lifecycle handoff. Score
        // that as an unavailable answer when generation never reached the gate.
        if (attemptFailures.length && (!citationGate || citationGate.status === 'not_evaluated' ||
            citationGate.failures.some(failure => failure.reason === 'verification_unavailable'))) {
          error = true;
        }
        const attemptEnd = Date.now();
        const snapshotCalls = (calls: ModelCall[]) => calls.map(call => ({ ...call, elapsedMs: call.elapsedMs ?? attemptEnd - Date.parse(call.startedAt) }));
        const draftCalls = snapshotCalls(answerCalls);
        attemptTraces.push({
          attempt: attempts, startedAt: new Date(attemptStart).toISOString(), endedAt: new Date(attemptEnd).toISOString(),
          latencyMs: attemptEnd - attemptStart, modelCallsMs: draftCalls.map(call => call.elapsedMs),
          plannedDraftEffort: pinnedEffort ?? answerModel.reasoningEffort, answerCalls: draftCalls, reviewCalls: snapshotCalls(reviewCalls), verificationMs, timedOutStage,
          modelFailures: [...attemptFailures], toolCounts, readWindows,
          retrievedEvidence: spans(evidence), admittedEvidence: spans(observedAdmissions),
          drafts: drafts.slice(draftsBeforeAttempt).map(scrub), answer: scrub(answer),
          delivery: error ? 'error' : handedOff ? 'handoff' : 'answer',
          citationVerdict: citationGateAttempts.at(-1)?.status ?? null, answerComplete, semanticVerdict: null,
        });
        if (transientFailure && attempts < 3) {
          const delay = attemptFailures.some(f => f.status === 429) ? 10_000 : 1000;
          await new Promise(resolve => setTimeout(resolve, attempts * delay));
        }
      } while (transientFailure && attempts < 3);
      const hasGateEvidence = citationGateAttempts.at(-1)?.claimSupport === true;
      const judge = async (reference: typeof item, delivered: string) => {
        eventLog.push({ attempt: attempts, kind: 'judge', name: 'semantic', status: 'started' });
        try {
          const judgment = parseJudgment(await requestJudgment(reference, delivered, judgeKey ?? ''), reference.expected_points.length);
          eventLog.push({ attempt: attempts, kind: 'judge', name: 'semantic', status: 'ok', detail: judgment.verdict });
          return judgment;
        } catch (e) {
          eventLog.push({ attempt: attempts, kind: 'judge', name: 'semantic', status: 'error', detail: e instanceof Error ? e.message : 'unknown' });
          throw e;
        }
      };
      const semantic = await scoreSemantic(item, { answer: scrub(answer), handedOff, error }, async (reference, delivered) => {
        const judgment = await judge(reference as typeof item, delivered);
        return { ...judgment, reason: scrub(judgment.reason) };
      });
      const finalAttempt = attemptTraces.at(-1);
      if (finalAttempt) finalAttempt.semanticVerdict = semantic.verdict;
      const handoffDraft = drafts.map(scrub).filter(Boolean).at(-1) ?? '';
      const handoffContentVerdict = handedOff && !error ? await scoreHandoffContent(item, handoffDraft, async (reference, delivered) => judge(reference as typeof item, delivered)) : undefined;
      const referenceConflict = reconcileReference(`${item.staff_resolution} ${item.expected_points.join(' ')}`, handoffContentVerdict && 'judgment' in handoffContentVerdict ? handoffContentVerdict.judgment?.reason ?? '' : semantic && 'judgment' in semantic ? semantic.judgment?.reason ?? '' : '', evidence);
      results[index] = { id: item.id, category: item.category, outcome: item.outcome, answer: scrub(answer), drafts: drafts.map(scrub), attemptTraces, handedOff, error, toolErrors, modelFailures, finishReasons, steps, attempts, latencyMs: Date.now() - turnStart,
        citationGateViolation: citationGateAttempts.at(-1)?.status === "failed", currentPolicyCoverage: answerCompletenessAttempts.at(-1) === true && evidence.length > 0, ungroundedDelivery: !error && !handedOff && !hasGateEvidence,
        citationGateAttempts, answerCompletenessAttempts, contentCoverage: finalContentCoverage, handoffMarkerPresent, handoffMarkerOverridden, evidence: evidence.map(e => ({ source: scrub(e.source), startLine: e.startLine, endLine: e.endLine, excerpt: scrub(e.excerpt), ...(e.policyProvenance ? { policyProvenance: e.policyProvenance } : {}) })), admittedEvidence: admittedEvidence.map(e => ({ source: scrub(e.source), startLine: e.startLine, endLine: e.endLine })), semanticSupport: hasGateEvidence ? 'supported' : 'not verified', semanticScores, semantic, ...(handoffContentVerdict ? { handoffContentVerdict } : {}), referenceConflict, eventLog: eventLog.map(e => ({ ...e, ...(e.detail ? { detail: scrub(e.detail) } : {}) })), answerability: answerabilityForItem(item, parsed, answerability), lexical: score(item, answer, handedOff, error) };
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
    const calls = results.flatMap(row => row.attemptTraces?.flatMap(attempt => attempt.answerCalls) ?? []);
    const count = (key: keyof Pick<ModelCall, 'requestedTier' | 'responseTier' | 'requestedEffort' | 'responseEffort'>) => {
      const counts: Record<string, number> = {};
      for (const call of calls) {
        const label = call[key] ?? 'unknown';
        counts[label] = (counts[label] ?? 0) + 1;
      }
      return counts;
    };
    const answerSettings = { requestedTiers: count('requestedTier'), responseTiers: count('responseTier'), requestedEfforts: count('requestedEffort'), responseEfforts: count('responseEffort') };
    const report = { ...metadata, kbStats, status: semanticSummary.unscored > 0 ? 'running' : 'completed', elapsedMs: previousElapsedMs + Date.now() - started, answerSettings, semanticSummary, byAnswerability: summarizeAnswerability(results), perCategory, lexicalDiagnostic, averageSteps: results.reduce((n, r) => n + r.steps, 0) / results.length, cost: null, results };
    await writeCheckpoint(report);
    console.log(JSON.stringify({ ...report, results: undefined, output }, null, 2));
    if (semanticSummary.unscored > 0) process.exitCode = 1;
  } finally { await rm(history, { recursive: true, force: true }); }
}
