/** Deterministic published-docs import; never reads golden-set answers. */
import { readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
const sourceRoot = process.argv[2] ?? '/home/hatch/workspace/Coffee-Host-docs/content/docs';
const outRoot = join(process.cwd(), 'knowledge');
const exclusions: Record<string, string> = {
  'legal/privacy.mdx': 'Privacy notice; not troubleshooting or a golden support category.'
};
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symlink source rejected');
    if (entry.isDirectory()) out.push(...await walk(path));
    else if (entry.name.endsWith('.mdx')) out.push(path);
  }
  return out.sort();
}
function convert(raw: string, source: string): string {
  const title = raw.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^['"]|['"]$/g, '') ?? source;
  const body = raw.replace(/^---\r?\n[\s\S]*?\r?\n---\s*/u, '').replace(/^import .*?;?\s*$/gmu, '');
  let fenced = false;
  const lines = body.split('\n').map(line => {
    if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return line; }
    if (fenced) return line;
    return line.replace(/<(?:Callout|Accordion|Tab)\b[^>]*\btitle="([^"]*)"[^>]*>/g, '\n### $1\n')
      .replace(/<Image\b[^>]*\bsrc="([^"]*)"[^>]*\balt="([^"]*)"[^>]*\/>/g, '![$2]($1)')
      .replace(/<\/?(?:Callout|Accordion|Accordions|Step|Steps|Tabs|Tab|Cards|Card|u|br)\b[^>]*\/?\s*>/g, '');
  });
  return `# ${title}\n\n> Source: Coffee-Host/docs content/docs/${source}\n> draft v1 awaiting staff review — sourced from company published docs, still unreviewed as agent answers.\n\n${lines.join('\n').trim()}\n`;
}
// Validate every source before replacing the old local corpus. No matches are logged.
const sources = await Promise.all((await walk(sourceRoot)).map(async file => ({ source: relative(sourceRoot, file).replaceAll('\\', '/'), raw: await readFile(file, 'utf8') })));
for (const { raw } of sources) if (/-----BEGIN .*PRIVATE KEY-----|\b(?:sk-[a-zA-Z0-9]{20,}|AKIA[A-Z0-9]{16}|ghp_[a-zA-Z0-9]{30,})\b/.test(raw)) throw new Error('Potential credential in published source; import stopped');
await rm(outRoot, { recursive: true, force: true });
await mkdir(outRoot, { recursive: true });
let converted = 0;
for (const { source, raw } of sources) {
  if (exclusions[source]) continue;
  const output = join(outRoot, source.replace(/\.mdx$/, '.md'));
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, convert(raw, source)); converted++;
}
await writeFile(join(outRoot, 'README.txt'), `draft v1 awaiting staff review\nPublished Coffee-Host docs, still unreviewed as agent answers.\nConverted: ${converted}\nSkipped: ${JSON.stringify(exclusions)}\nSource: ${sourceRoot}\nNo golden answers were used. Automated credential-pattern scan complements manual review; images are links only.\n`);
console.log(JSON.stringify({ sourceArticles: sources.length, converted, skipped: exclusions }, null, 2));
