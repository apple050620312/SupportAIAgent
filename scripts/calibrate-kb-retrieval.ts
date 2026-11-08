// Deliberately reads ONLY customer_problem from the golden set. Never imports its scorer/input builder.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { MarkdownKnowledgeProvider } from '../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js';
import { OpenAIEmbeddings, SemanticKnowledgeProvider, cosine } from '../apps/support-core/dist/src/adapters/semantic-knowledge-provider.js';
import { supportKnowledgeRoot } from './lib/knowledge-setup.js';
const lexical = new MarkdownKnowledgeProvider(supportKnowledgeRoot(process.env));
const semantic = await SemanticKnowledgeProvider.load(lexical, new OpenAIEmbeddings(), resolve('.kb-index/passages.json'));
const problems = (JSON.parse(await readFile(process.env.GOLDEN_SET_PATH ?? '/home/hatch/workspace/coffee-host-golden/golden_set.json', 'utf8')) as {id: string; customer_problem: string}[]).map(p => ({id:p.id, query:p.customer_problem}));
const negatives = ['如何烘焙巧克力蛋糕', 'What is the capital of Peru?', '幫我預約明天牙醫洗牙', 'How do I replace bicycle brake pads?', '請分析莎士比亞的十四行詩', 'How do I treat a broken ankle?'];
const rows = [];
for (const p of [...problems, ...negatives.map((query, i) => ({ id: `negative-${i}`, query }))]) {
  const vector = await semantic.vector(p.query);
  const ranked = semantic.index.passages.map((passage, i) => ({ source:passage.source, heading:passage.heading, excerpt:passage.excerpt, score:cosine(vector, semantic.index.vectors[i]!) })).sort((a,b)=>b.score-a.score);
  rows.push({...p, top:ranked.slice(0,3)});
}
await mkdir('eval-results', {recursive:true});
await writeFile('eval-results/step9-calibration.json', JSON.stringify(rows,null,2), {mode:0o600});
console.log(JSON.stringify(rows.filter(r=>r.id.startsWith('negative')).map(r=>({id:r.id,score:r.top[0]?.score}))));
