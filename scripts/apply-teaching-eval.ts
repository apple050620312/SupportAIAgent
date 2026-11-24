// Replay recorded owner policy in a private FIX-4 copy through the same Core tool and approval path.
import { randomInt } from "node:crypto";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { FileTeachingCorpus } from "../apps/support-core/dist/src/adapters/file-teaching-corpus.js";
import { MarkdownKnowledgeProvider } from "../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js";
import { OpenAIEmbeddings, SemanticKnowledgeProvider } from "../apps/support-core/dist/src/adapters/semantic-knowledge-provider.js";
import { FileWorkflowJournal } from "../apps/support-core/dist/src/adapters/teaching-files.js";
import { ManagementPolicy, type TeachingSource } from "../apps/support-core/dist/src/domain/teaching-policy.js";
import { TeachingService, type ProposalRecord } from "../apps/support-core/dist/src/services/teaching-service.js";
import { supportKnowledgeRoot } from "./lib/knowledge-setup.js";

const baseline = "04003b9bec8898f13f9cd8a79ebf30491b3911c2732952cfb9f3f65b314e821a";
const rulings = [
  {
    goldenId: "GS-140", date: "2026-11-24", article: "store/services/duplicate-tickets.md", section: "等待技術人員回覆",
    ruling: "同一問題重複開單不會加快處理。開單後請等技術人員回覆，產品問題走售後服務類別。",
    replacement: "開單後，請在原客服單等待技術人員回覆。同一個問題重複開單不會加快處理。"
  },
  {
    goldenId: "GS-041", date: "2026-11-23", article: "panel/config/docker-image-switching.md", section: "自由切換 Docker 映像檔",
    ruling: "面板提供 Docker 映像檔選項時，客戶可在啟動設定自行切換。",
    replacement: "面板提供 Docker 映像檔選項時，客戶可以自行切換，無需經客服。\n\n在面板的「啟動設定」選擇 Docker Image（映像檔），例如切換 Java 版本。接著在「設定」選擇「重新安裝伺服器」，讓設定生效。\n\n請注意不同 Minecraft 版本對應的 Java 版本。"
  },
  {
    goldenId: "GS-096", date: "2026-11-23", article: "practice/advanced/test-server.md", section: "測試伺服器",
    ruling: "測試伺服器的位址與使用規則以 Discord 測試伺服公告為準。",
    replacement: "測試伺服器的位址與使用規則，以 Discord「#測試伺服」頻道的公告為準。"
  },
  {
    goldenId: "GS-138", date: "2026-11-23", article: "practice/advanced/velocity.md", section: "在主機上執行 Velocity",
    ruling: "符合服務條款就能運行 Velocity，後端 Paper 可放在自己的主機，到後端的連線品質不保證。",
    replacement: "客戶可在主機上執行 Velocity，須遵守服務條款。\n\n後端 Paper 可以放在自己的伺服器。Coffee-Host 不保證到後端的連線品質。"
  }
];

const seed = supportKnowledgeRoot(process.env);
const indexPath = resolve(process.env.KB_INDEX_PATH || ".kb-index/passages.json");
const embeddings = new OpenAIEmbeddings();
const index = await SemanticKnowledgeProvider.load(new MarkdownKnowledgeProvider(seed), embeddings, indexPath);
if (index.index.digest !== baseline) throw new Error("Expected the verified FIX-4 corpus and index");

const root = await mkdtemp(join(tmpdir(), "teachable-fix4-"));
try {
  await cp(seed, root, { recursive: true, filter: source => source !== join(seed, ".teachable") });
  // These are generated test identities. The harness runs outside the real KB and management channel.
  const snowflake = () => String(BigInt(Date.now()) << 22n | BigInt(randomInt(1 << 22)));
  const guildId = snowflake();
  const channelId = snowflake();
  const ownerUserId = snowflake();
  const owner = { guildId, channelId, userId: ownerUserId, roleIds: [] };
  const policy = new ManagementPolicy({ guildId, channelId, ownerUserId, staffUserIds: new Set(), staffRoleIds: new Set() });
  const journal = new FileWorkflowJournal<ProposalRecord>(root, "teaching");
  const corpus = new FileTeachingCorpus(root, indexPath, embeddings);
  const service = new TeachingService(policy, journal, corpus);
  const baselineCopy = await corpus.open([]);
  if (baselineCopy.semantic?.index.digest !== baseline) throw new Error("The evaluation copy differs from FIX-4");

  const applied = [];
  for (const ruling of rulings) {
    const source: TeachingSource = { kind: "standing_policy", actor: owner, messageId: snowflake(),
      at: new Date(ruling.date).toISOString(), text: `教學：${ruling.ruling}` };
    const section = (await service.reviewed(source)).find(item => item.article === ruling.article && item.section === ruling.section);
    if (!section) throw new Error("The reviewed section is missing");
    const { proposal } = await service.propose(source, { ...ruling, baseVersion: section.baseVersion });
    const messageId = snowflake();
    await service.bind(proposal.id, { guildId, channelId, messageId, version: proposal.version });
    const decision = await service.decide(owner, proposal.id, messageId, "approve");
    if (decision.status !== "applied" || !decision.publication) throw new Error(`Teaching replay failed for ${ruling.goldenId}: ${decision.status}`);
    applied.push({ id: ruling.goldenId, source: ruling.article, digest: decision.publication.digest });
  }
  const published = await corpus.open(await journal.read());
  console.log(JSON.stringify({ root, baseline, after: published.semantic?.index.digest, articles: await published.lexical.stats(), applied }));
} catch (error) {
  await rm(root, { recursive: true, force: true });
  throw error;
}
