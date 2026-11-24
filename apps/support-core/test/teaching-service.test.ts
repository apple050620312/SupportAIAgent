import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileTeachingCorpus, PublishedKnowledgeProvider } from "../src/adapters/file-teaching-corpus.js";
import { FileWorkflowJournal } from "../src/adapters/teaching-files.js";
import { ManagementPolicy, type TeachingSource } from "../src/domain/teaching-policy.js";
import { SupportKnowledgeService } from "../src/services/support-knowledge-service.js";
import { TeachingService, type ProposalRecord } from "../src/services/teaching-service.js";

const markdown = "# Support policy\r\n\r\n> Review: approved\r\n\r\n## Retry\r\n\r\nWait one minute.\r\n\r\n## Contact\r\n\r\nContact support.\r\n";
const originalArticle = "guide.md";
const at = "2026-11-23T12:00:00.000Z";
const directories: string[] = [];
let suffix = 0n;
const snowflake = () => String((BigInt(Date.now()) << 22n) | ++suffix);

afterEach(async () => {
  await Promise.all(directories.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "core-teaching-"));
  directories.push(root);
  await writeFile(join(root, originalArticle), markdown);
  const guildId = snowflake(), channelId = snowflake(), ownerUserId = snowflake(), staffId = snowflake();
  const owner = { guildId, channelId, userId: ownerUserId, roleIds: [] };
  const staff = { ...owner, userId: staffId };
  const policy = new ManagementPolicy({ guildId, channelId, ownerUserId, staffUserIds: new Set([staffId]), staffRoleIds: new Set() });
  const embeddings = { model: "test", embed: vi.fn((texts: string[]) => Promise.resolve(texts.map(() => [1, 2]))) };
  const corpus = new FileTeachingCorpus(root, join(root, "seed-index.json"), embeddings);
  const journal = () => new FileWorkflowJournal<ProposalRecord>(root, "teaching");
  const service = new TeachingService(policy, journal(), corpus);
  const source = (text = "教學：Wait two minutes."): TeachingSource =>
    ({ kind: "standing_policy", actor: staff, at, text, messageId: snowflake() });
  const propose = async (replacement = "Wait two minutes.", teaching = source(), article = originalArticle) => {
    const section = (await service.reviewed(teaching)).find(item => item.article === originalArticle && item.section === "Retry")!;
    return service.propose(teaching, { article, section: section.section, baseVersion: section.baseVersion, replacement });
  };
  const bind = async (record: ProposalRecord) => {
    const messageId = snowflake();
    await service.bind(record.proposal.id, { guildId, channelId, messageId, version: record.proposal.version });
    return messageId;
  };
  return { root, owner, staff, policy, service, corpus, embeddings, journal, source, propose, bind };
}

describe("owner-approved KB publications", () => {
  it("binds the exact proposal to a message and owner, applies once, and exposes dates through Core after restart", async () => {
    const test = await fixture();
    const { proposal } = await test.propose();
    expect(proposal).toMatchObject({ before: "Wait one minute.", after: "Wait two minutes.", source: { text: "教學：Wait two minutes.", at } });
    expect(await test.service.reviewed(test.source())).toEqual(expect.arrayContaining([expect.objectContaining({ body: "Wait one minute." })]));
    const messageId = snowflake();
    const { guildId, channelId } = test.owner;
    await expect(test.service.bind(proposal.id, { guildId, channelId, messageId, version: "other" })).rejects.toMatchObject({ code: "not_found" });
    await test.service.bind(proposal.id, { guildId, channelId, messageId, version: proposal.version });
    await expect(test.service.decide(test.staff, proposal.id, messageId, "approve")).rejects.toMatchObject({ code: "forbidden" });
    await expect(test.service.decide(test.owner, proposal.id, snowflake(), "approve")).rejects.toMatchObject({ code: "forbidden" });
    await expect(test.service.decide({ ...test.owner, channelId: snowflake() }, proposal.id, messageId, "approve")).rejects.toMatchObject({ code: "forbidden" });
    const restartedService = new TeachingService(test.policy, test.journal(), test.corpus);
    const [applied, replay] = await Promise.all([
      test.service.decide(test.owner, proposal.id, messageId, "approve"),
      restartedService.decide(test.owner, proposal.id, messageId, "approve")
    ]);
    expect(applied.status).toBe("applied");
    expect(applied.publication).toEqual(replay.publication);
    const rows = await test.journal().read();
    expect(rows.filter(row => row.status === "applied")).toHaveLength(1);
    const directory = join(test.root, ".teachable", "releases", applied.publication!.id);
    expect(await readFile(join(directory, "previous.md"), "utf8")).toBe(markdown);
    expect(await readFile(join(directory, "markdown", originalArticle), "utf8")).toBe(markdown.replace("one minute", "two minutes"));
    const reader = new SupportKnowledgeService(new PublishedKnowledgeProvider(test.corpus, test.journal()));
    const { matches } = await reader.search({ query: "Wait two minutes" });
    const taught = matches.find(match => match.heading === "Retry")!;
    expect(taught).toMatchObject({ excerpt: "## Retry\n\nWait two minutes.\n", teachingDate: "2026-11-23" });
    expect(matches.find(match => match.heading === "Contact")).not.toHaveProperty("teachingDate");
    const page = await reader.read({ articleRef: taught.articleRef });
    expect(page.teachings).toEqual([{ startLine: 5, endLine: 8, teachingDate: "2026-11-23" }]);
  });

  it("leaves all active data intact for a decline, a pending edit and a failed rebuild", async () => {
    const test = await fixture();
    const initial = await test.propose();
    const initialMessage = await test.bind(initial);
    const first = await test.service.decide(test.owner, initial.proposal.id, initialMessage, "approve");
    expect(first.status).toBe("applied");
    const applied = await test.corpus.open(await test.journal().read());
    const declined = await test.propose("Wait three minutes.");
    const declinedMessage = await test.bind(declined);
    expect((await test.service.decide(test.owner, declined.proposal.id, declinedMessage, "decline")).status).toBe("declined");
    expect((await test.service.decide(test.owner, declined.proposal.id, declinedMessage, "approve")).status).toBe("declined");
    const pending = await test.propose("Wait four minutes.");
    const pendingMessage = await test.bind(pending);
    const reader = new PublishedKnowledgeProvider(test.corpus, test.journal());
    expect((await reader.current()).semantic?.index.digest).toBe(applied.semantic?.index.digest);
    test.embeddings.embed.mockRejectedValueOnce(new Error("embedding unavailable"));
    const failed = await test.service.decide(test.owner, pending.proposal.id, pendingMessage, "approve");
    expect(failed.status).toBe("failed");
    const restarted = await new PublishedKnowledgeProvider(test.corpus, test.journal()).current();
    expect(restarted.semantic?.index.digest).toBe(applied.semantic?.index.digest);
    expect(await restarted.lexical.articles()).toEqual(await applied.lexical.articles());
    expect((await test.journal().read()).filter(row => row.status === "applied")).toHaveLength(1);
  });

  it("requires a fresh proposal on staleness and puts reverts through approval", async () => {
    const test = await fixture();
    const first = await test.propose();
    const second = await test.propose("Wait three minutes.");
    const message = await test.bind(second);
    expect((await test.service.decide(test.owner, first.proposal.id, await test.bind(first), "approve")).status).toBe("applied");
    expect((await test.service.decide(test.owner, second.proposal.id, message, "approve")).status).toBe("stale");
    const revert = await test.service.proposeRevert(test.source(`還原 ${first.proposal.id}：Restore the previous reviewed policy.`), first.proposal.id);
    expect(revert.proposal).toMatchObject({ before: "Wait two minutes.", after: "Wait one minute.", reverts: first.proposal.id });
    expect((await test.service.decide(test.owner, revert.proposal.id, await test.bind(revert), "approve")).status).toBe("applied");
    const current = await test.corpus.open(await test.journal().read());
    expect((await current.lexical.articles())[0]?.content).toBe(markdown);
  });

  it("rejects ineligible provenance, paths, symlink escapes and changes beyond the reviewed section", async () => {
    const test = await fixture();
    const outside = await mkdtemp(join(tmpdir(), "outside-teaching-"));
    directories.push(outside);
    await writeFile(join(outside, "outside.md"), markdown);
    await symlink(outside, join(test.root, "escape"));
    await symlink(join(outside, "outside.md"), join(test.root, "link.md"));
    await mkdir(join(test.root, "eval-results"));
    await writeFile(join(test.root, "eval-results", "answer.md"), markdown);
    await writeFile(join(test.root, "draft.md"), markdown.replace("> Review: approved", "> draft v1 awaiting staff review"));
    for (const article of ["../outside.md", join(outside, "outside.md"), "escape/outside.md", "link.md", "eval-results/answer.md", "draft.md"]) {
      await expect(test.propose("Safe replacement.", test.source(), article)).rejects.toMatchObject({ code: "ineligible" });
    }
    for (const kind of ["customer_transcript", "ticket_reply", "golden_reference", "eval_artifact"] as const) {
      await expect(test.propose("Safe replacement.", { ...test.source(), kind })).rejects.toMatchObject({ code: "ineligible" });
    }
    await expect(test.service.reviewed(test.source("教學：\n客戶：Ticket transcript."))).rejects.toMatchObject({ code: "ineligible" });
    await expect(test.service.reviewed(test.source("教學：Copy GS-140."))).rejects.toMatchObject({ code: "ineligible" });
    await expect(test.propose("Wait two minutes.\n\n## Other\nOverwrite another section.")).rejects.toMatchObject({ code: "invalid_edit" });
    expect(await test.journal().read()).toEqual([]);
    expect(await readFile(join(outside, "outside.md"), "utf8")).toBe(markdown);
  });
});
