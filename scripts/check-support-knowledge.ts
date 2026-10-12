import { MarkdownKnowledgeProvider } from "../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js";
import { supportKnowledgeRoot } from "./lib/knowledge-setup.js";

/** Local-only corpus check. Prints counts, never paths, document text or model/customer data. */
try {
  const provider = new MarkdownKnowledgeProvider(supportKnowledgeRoot(process.env));
  const stats = await provider.stats();
  if (!stats.articles) throw new Error();
  console.log(`Support knowledge ready: ${stats.articles} Markdown articles, ${stats.chunks} searchable sections, ${stats.bytes} UTF-8 bytes`);
  console.log("Local files only. No network, model or provider request was made.");
} catch {
  console.error("Knowledge check failed. Create knowledge/ or set SUPPORT_KNOWLEDGE_ROOT to a readable absolute folder with reviewed UTF-8 Markdown files. See docs/support-knowledge.md for limits.");
  process.exitCode = 1;
}
