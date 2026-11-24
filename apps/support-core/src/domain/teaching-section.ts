import { containsIneligibleMaterial, isControl, sha256, TeachingError } from "./teaching-policy.js";

export interface ReviewedSection {
  readonly article: string;
  readonly section: string;
  readonly baseVersion: string;
  readonly body: string;
  readonly startLine: number;
  readonly endLine: number;
  readonly start: number;
  readonly end: number;
}

export interface SectionEdit {
  readonly article: string;
  readonly section: string;
  readonly baseVersion: string;
  readonly replacement: string;
}

export function eligibleArticlePath(source: string): boolean {
  return source.length <= 512 && /\.md$/iu.test(source) && !source.includes("\\") && ![...source].some(isControl) &&
    source.split("/").every(part => part && !part.startsWith(".") &&
      !/(?:^|[-_])(?:evals?|golden(?:[-_]?set)?|transcripts?|ticket[-_]?(?:exports?|repl(?:y|ies)))(?:[-_.]|$)/iu.test(part));
}

function markdownLines(content: string) {
  const segments = content.split(/(\r\n|\n|\r)/u);
  const lines: { text: string; start: number; after: number }[] = [];
  let offset = 0;
  for (let i = 0; i < segments.length; i += 2) {
    const text = segments[i]!;
    const after = offset + text.length + (segments[i + 1]?.length ?? 0);
    lines.push({ text, start: offset, after });
    offset = after;
  }
  return lines;
}

function headings(lines: string[]): { headings: { line: number; title: string }[]; openFence: boolean } {
  const result: { line: number; title: string }[] = [];
  let fence = "";
  for (const [line, text] of lines.entries()) {
    const marker = /^ {0,3}(\x60{3,}|~{3,})(.*)$/u.exec(text);
    if (fence) {
      if (marker && marker[1]!.startsWith(fence) && !marker[2]!.trim()) fence = "";
      continue;
    }
    if (marker) {
      fence = marker[1]!;
      continue;
    }
    const title = /^ {0,3}#{1,6}[ \t]+(.+?)[ \t]*#*[ \t]*$/u.exec(text.replace(/^\uFEFF/u, ""))?.[1]?.trim();
    if (title) result.push({ line, title });
  }
  return { headings: result, openFence: !!fence };
}

export function reviewedSections(article: string, content: string): ReviewedSection[] {
  if (!eligibleArticlePath(article)) return [];
  const lines = markdownLines(content);
  const { headings: sections, openFence } = headings(lines.map(line => line.text));
  if (openFence || sections[0]?.line !== 0) return [];
  let headerEnd = 1;
  while (lines[headerEnd] && /^\s*$/u.test(lines[headerEnd]!.text)) headerEnd++;
  const metadata: string[] = [];
  while (lines[headerEnd]?.text.startsWith(">")) metadata.push(lines[headerEnd++]!.text);
  const reviewed = metadata.includes("> Review: approved") ||
    (metadata.some(line => /^> Source: Coffee-Host owner answers, \d{4}-\d{2}-\d{2}\b/u.test(line)) &&
      metadata.includes("> Owner-provided; not sourced from published docs or past tickets."));
  if (!reviewed || metadata.some(line => /awaiting staff review|unreviewed|\bdraft\b/iu.test(line))) return [];
  const baseVersion = sha256(content);
  return sections.flatMap(({ line, title }, index) => {
    if (title.length > 256 || sections.some((other, i) => i !== index && other.title === title)) return [];
    const endLine = sections[index + 1]?.line ?? lines.length;
    const from = lines[Math.max(line + 1, headerEnd)]?.start ?? content.length;
    const until = lines[endLine]?.start ?? content.length;
    const block = content.slice(from, until);
    const body = block.trim();
    if (!body) return [];
    return [{ article, section: title, baseVersion, body, startLine: line + 1, endLine,
      start: from + (block.length - block.trimStart().length), end: until - (block.length - block.trimEnd().length) }];
  });
}

export function replaceReviewedSection(content: string, section: ReviewedSection, replacement: string): string {
  if (typeof replacement !== "string") throw new TeachingError("invalid_edit");
  const body = replacement.trim().replace(/\r\n?/gu, "\n");
  const lines = body.split("\n");
  const structure = headings(lines);
  if (!body || body.length > 16_000 || lines.some(line => line.length > 8_000) ||
      structure.headings.length || structure.openFence || /<!--|^ {0,3}[=-]+\s*$/mu.test(body) ||
      containsIneligibleMaterial(body)) throw new TeachingError("invalid_edit");
  const lineEnding = /\r\n|\n|\r/u.exec(content)?.[0] ?? "\n";
  const converted = body.replace(/\n/gu, lineEnding);
  if (converted === section.body) throw new TeachingError("invalid_edit");
  return content.slice(0, section.start) + converted + content.slice(section.end);
}
