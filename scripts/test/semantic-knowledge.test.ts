import { afterEach, describe, it, expect, vi } from 'vitest';
import { MarkdownKnowledgeProvider } from '../../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js';
import { SemanticKnowledgeProvider, corpusDigest, cosine, OpenAIEmbeddings } from '../../apps/support-core/dist/src/adapters/semantic-knowledge-provider.js';
import type { KnowledgeSearchResponse } from '@openclaw-hosting/contracts';
afterEach(() => vi.unstubAllGlobals());
const passages: KnowledgeSearchResponse['matches'] = [
  { articleRef: `kb:${'a'.repeat(64)}`, source: 'backup.md', title: '備份', heading: '還原世界', excerpt: '選擇備份並還原世界檔案。', startLine: 1, endLine: 2 },
  { articleRef: `kb:${'b'.repeat(64)}`, source: 'dns.md', title: 'DNS', heading: '連線', excerpt: '設定 DNS 解析。', startLine: 1, endLine: 2 }
];
describe('semantic documentation adapter', () => {
  it('ranks a colloquial question by meaning over the lexical winner and caches queries', async () => {
    const lexical = new MarkdownKnowledgeProvider('/unused');
    vi.spyOn(lexical, 'search').mockResolvedValue({ trust:'reference_only', matches:[passages[1]!] });
    const embed = vi.fn(() => Promise.resolve([[1,0]]));
    const provider = new SemanticKnowledgeProvider(lexical, { embed }, { model:'test', digest:corpusDigest(passages), passages, vectors:[[1,0],[0,1]] });
    expect((await provider.search({query:'存檔炸了能救回昨天的嗎'})).matches[0]?.source).toBe('backup.md');
    expect(await provider.similarity('存檔炸了能救回昨天的嗎', passages[0]!)).toBe(1);
    expect(embed).toHaveBeenCalledTimes(1);
    expect(await provider.similarity('存檔炸了能救回昨天的嗎', {...passages[0]!, excerpt:'fabricated'})).toBe(-1);
  });
  it('rejects invalid vectors and corrupt indexes', () => {
    expect(()=>cosine([0,0],[1,0])).toThrow();
    expect(()=>cosine([NaN],[1])).toThrow();
    expect(()=>new SemanticKnowledgeProvider(new MarkdownKnowledgeProvider('/unused'), {embed:()=>Promise.resolve([])}, {model:'test',digest:'bad',passages,vectors:[]})).toThrow();
  });
  it('uses only the fixed official embeddings endpoint and sanitizes provider failures', async () => {
    const transport = vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify({ data: [{index:0, embedding:[1,0]}] }), {status:200})));
    vi.stubGlobal('fetch', transport);
    const embeddings = new OpenAIEmbeddings({ EMBEDDING_PROVIDER:'openai', OPENAI_API_KEY:'synthetic-test-only' });
    expect(await embeddings.embed(['test passage'])).toEqual([[1,0]]);
    expect(transport.mock.calls[0]?.[0]).toBe('https://api.openai.com/v1/embeddings');
    vi.stubGlobal('fetch', () => Promise.resolve(new Response('sensitive provider detail', {status:401})));
    await expect(embeddings.embed(['test passage'])).rejects.toThrow('Official embedding request failed');
  });
  it('requires embeddings-specific opt-in and never falls back to the chat key', () => {
    expect(()=>new OpenAIEmbeddings({EMBEDDING_PROVIDER:'sub2api', SUB2API_API_KEY:'synthetic'})).toThrow();
    expect(()=>new OpenAIEmbeddings({EMBEDDING_PROVIDER:'openai'})).toThrow();
  });
});
