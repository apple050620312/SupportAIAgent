import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ButtonStyle, ChannelType, Client, ComponentType, Events, GatewayIntentBits, IntentsBitField, MessageFlags, MessageType, TextInputStyle,
  type APIContainerComponent, type ClientEvents, type Interaction, type Message, type TextChannel
} from "discord.js";
import { afterEach, expect, it, vi } from "vitest";
import { FileTeachingCorpus } from "../../apps/support-core/dist/src/adapters/file-teaching-corpus.js";
import { FileWorkflowJournal } from "../../apps/support-core/dist/src/adapters/teaching-files.js";
import { ManagementPolicy } from "../../apps/support-core/dist/src/domain/teaching-policy.js";
import { AdminRelayService, type RelayRecord } from "../../apps/support-core/dist/src/services/relay-service.js";
import { TeachingService, type ProposalRecord } from "../../apps/support-core/dist/src/services/teaching-service.js";
import { DiscordManagementAdapter, type ProposeTeachingEdit } from "../lib/discord-management.js";
import { loadManagementDiscordConfig } from "../lib/discord-management-setup.js";
import {
  ADMIN_ANSWER_INPUT_ID, adminAnswerModal, escalationPayload, proposalPayload, relayDraftPayload, type ManagementPayload
} from "../lib/discord-management-payloads.js";
import { startDiscordManagement } from "../run-discord-management.js";

let sequence = 0n;
const snowflake = () => String((BigInt(Date.now()) << 22n) | ++sequence);
const at = "2026-11-25T00:00:00.000Z";

function deployment() {
  return {
    TEACHING_DISCORD_GUILD_ID: snowflake(), TEACHING_DISCORD_CHANNEL_ID: snowflake(), TEACHING_OWNER_USER_ID: snowflake(),
    TEACHING_DISCORD_ADMIN_ROLE_ID: snowflake(), TEACHING_DISCORD_STAFF_USER_IDS: snowflake(), TEACHING_DISCORD_BOT_TOKEN: randomUUID()
  };
}

function launcherDeployment() {
  return { ...deployment(), AGENT_LIVE_MODEL: "1", MODEL_PROVIDER: "openai", EMBEDDING_PROVIDER: "openai", OPENAI_API_KEY: randomUUID() };
}

afterEach(() => { vi.restoreAllMocks(); });

it("rejects missing and invalid management configuration before gateway login", async () => {
  const login = vi.spyOn(Client.prototype, "login").mockRejectedValue(new Error("Unexpected gateway login"));
  const env = launcherDeployment();
  await expect(startDiscordManagement({})).rejects.toThrow("TEACHING_DISCORD_GUILD_ID");
  await expect(startDiscordManagement({ ...env, TEACHING_DISCORD_STAFF_ROLE_IDS: "invalid" })).rejects.toThrow("TEACHING_DISCORD_STAFF_ROLE_IDS");
  await expect(startDiscordManagement({ ...env, TEACHING_DISCORD_BOT_TOKEN: " " })).rejects.toThrow("TEACHING_DISCORD_BOT_TOKEN");
  await expect(startDiscordManagement({ ...env, OPENAI_API_KEY: " " })).rejects.toThrow("OPENAI_API_KEY");
  await expect(startDiscordManagement({ ...env, EMBEDDING_PROVIDER: "sub2api" })).rejects.toThrow("Invalid Discord management model, embeddings or knowledge settings");
  await expect(startDiscordManagement({ ...env, AGENT_LIVE_MODEL: undefined })).rejects.toThrow("Invalid Discord management model, embeddings or knowledge settings");
  expect(login).not.toHaveBeenCalled();
});

it("attaches management handlers before login and logs only fixed failure messages", async () => {
  let eventsAtLogin: (string | symbol)[] = [];
  const login = vi.spyOn(Client.prototype, "login").mockImplementation(function (this: Client) {
    eventsAtLogin = this.eventNames();
    return Promise.resolve("mock login");
  });
  const logger = vi.spyOn(console, "error").mockImplementation(() => undefined);
  const error = new Error("Internal error details");
  vi.spyOn(DiscordManagementAdapter.prototype, "handleMessage").mockRejectedValue(error);
  const env = launcherDeployment();
  const close = await startDiscordManagement(env);
  const client = login.mock.contexts[0] as Client;
  try {
    expect(login).toHaveBeenCalledWith(env.TEACHING_DISCORD_BOT_TOKEN);
    expect(new IntentsBitField(client.options.intents).bitfield).toBe(
      GatewayIntentBits.Guilds | GatewayIntentBits.GuildMessages | GatewayIntentBits.MessageContent
    );
    expect(eventsAtLogin).toEqual(expect.arrayContaining([Events.MessageCreate, Events.InteractionCreate, Events.Error, Events.ShardError]));
    client.emit(Events.Error, error);
    client.emit(Events.ShardError, error, 0);
    client.emit(Events.MessageCreate, {} as ClientEvents[Events.MessageCreate][0]);
    await vi.waitFor(() => expect(logger.mock.calls).toEqual([
      ["Discord management gateway error"], ["Discord management gateway error"], ["Discord management handler failed"]
    ]));
  } finally {
    await close();
  }
  expect(client.listenerCount(Events.MessageCreate)).toBe(0);
  expect(client.listenerCount(Events.InteractionCreate)).toBe(0);
});

it("detaches and destroys the client after a rejected login", async () => {
  const login = vi.spyOn(Client.prototype, "login").mockRejectedValue(new Error("Internal Discord error details"));
  const destroy = vi.spyOn(Client.prototype, "destroy");
  await expect(startDiscordManagement(launcherDeployment())).rejects.toThrow(/^Discord management gateway startup failed$/u);
  expect(destroy).toHaveBeenCalledOnce();
  const client = login.mock.contexts[0] as Client;
  expect(client.listenerCount(Events.MessageCreate)).toBe(0);
  expect(client.listenerCount(Events.InteractionCreate)).toBe(0);
});

function sampleProposal() {
  const config = loadManagementDiscordConfig(deployment());
  return {
    status: "pending",
    proposal: {
      id: randomUUID(), version: "a".repeat(64), article: "guide.md", section: "Policy",
      before: "Keep this context.\nWait one minute.\nKeep this too.", after: "Keep this context.\nWait two minutes.\nKeep this too.",
      baseVersion: "b".repeat(64), proposedArticleVersion: "c".repeat(64),
      ownerUserId: config.ownerUserId,
      source: { kind: "standing_policy", messageId: snowflake(), at, text: "教學：Wait two minutes.",
        actor: { guildId: config.guildId, channelId: config.channelId, userId: config.ownerUserId, roleIds: [] } }
    }
  } satisfies ProposalRecord;
}

function v2Container(payload: ManagementPayload): APIContainerComponent {
  expect(payload.flags).toBe(32768);
  for (const key of ["content", "embeds", "poll", "stickers"]) expect(payload).not.toHaveProperty(key);
  const box = payload.components[0];
  if (box?.type !== ComponentType.Container) throw new Error("Expected a Discord Container");
  return box;
}

it("renders the proposal and terminal edit with V2 text, styles, exact IDs and outcome", () => {
  const sample = sampleProposal();
  const links = { article: "https://github.com/example/project/blob/main/guide.md" };
  const pending = proposalPayload(sample, links);
  const box = v2Container(pending);
  expect(box.components.map(row => row.type)).toEqual([
    ComponentType.TextDisplay, ComponentType.TextDisplay, ComponentType.Separator, ComponentType.TextDisplay,
    ComponentType.Separator, ComponentType.TextDisplay, ComponentType.ActionRow
  ]);
  const texts = box.components.flatMap(component => component.type === ComponentType.TextDisplay ? [component.content] : []);
  expect(texts[0]).toMatch(/^## KB 修改提案/u);
  expect(texts[0]).toContain(links.article);
  expect(texts[1]).toContain(sample.proposal.source.text);
  expect(texts[2]).toContain("\x60\x60\x60diff\n@@ -2,1 +2,1 @@\n-Wait one minute.\n+Wait two minutes.\n\x60\x60\x60");
  expect(texts[3]).toMatch(/^-# .*只有擁有者可以批准/u);
  const row = box.components.find(component => component.type === ComponentType.ActionRow)!;
  expect(row.components).toMatchObject([
    { style: ButtonStyle.Success, label: "批准", custom_id: `kb:ap:${sample.proposal.id}`, disabled: false },
    { style: ButtonStyle.Danger, label: "拒絕", custom_id: `kb:de:${sample.proposal.id}`, disabled: false },
    { style: ButtonStyle.Link, url: links.article }
  ]);
  for (const button of row.components.slice(0, 2)) {
    expect(button).toHaveProperty("custom_id", expect.stringMatching(/^.{1,100}$/u));
  }
  const decision = { ownerUserId: sample.proposal.ownerUserId, at };
  const applied = v2Container(proposalPayload({ ...sample, status: "applied", decision }, links));
  const declined = v2Container(proposalPayload({ ...sample, status: "declined", decision }, links));
  expect(new Set([applied.accent_color, declined.accent_color, box.accent_color]).size).toBe(3);
  expect(applied.components.at(-2)).toHaveProperty("content", expect.stringContaining("已批准"));
  expect(declined.components.at(-2)).toHaveProperty("content", expect.stringContaining("已拒絕"));
  for (const terminal of [applied, declined]) {
    expect(terminal.components.at(-1)).toMatchObject({ components: [{ disabled: true }, { disabled: true }, { style: ButtonStyle.Link }] });
  }
});

it("truncates to the changed hunk within 4000 characters and links to the full diff", () => {
  const seed = sampleProposal();
  const record = { ...seed, proposal: { ...seed.proposal,
    before: `same opening\nold ${"舊值".repeat(2200)}\nsame ending`,
    after: `same opening\nnew ${"新值".repeat(2200)}\nsame ending`,
    source: { ...seed.proposal.source, text: `教學：${"條件".repeat(1000)}` }
  } };
  const diff = "https://github.com/example/project/pull/1/files";
  const payload = proposalPayload(record, { diff });
  const box = v2Container(payload);
  const text = box.components.flatMap(component => component.type === ComponentType.TextDisplay ? [component.content] : []).join("");
  expect(text.length).toBeLessThanOrEqual(4000);
  expect(text).toContain("完整差異");
  expect(text).toContain(diff);
  expect(text).toContain("-old");
  expect(text).toContain("+new");
  expect(text).not.toContain("same opening");
  expect(text).not.toContain("same ending");
  expect(payload.components[1]?.type).toBe(ComponentType.File);
  expect(payload.files?.[0]?.attachment.toString()).toContain(record.proposal.source.text);
  expect(payload.files?.[0]?.attachment.toString()).toContain(record.proposal.after.split("\n")[1]);
});

it("builds the escalation Section, role mention, Label modal and staff draft within V2 limits", () => {
  const record = { id: randomUUID(), ticket: { guildId: snowflake(), channelId: snowflake() }, openedAt: at, question: "Which plan supports this?" };
  const adminRoleId = snowflake();
  const payload = escalationPayload(record, adminRoleId);
  const box = v2Container(payload);
  const section = box.components[0];
  if (section?.type !== ComponentType.Section) throw new Error("Expected a Discord Section");
  expect(section.components[0]?.content).toContain(`<@&${adminRoleId}>`);
  expect(section.accessory).toMatchObject({ style: ButtonStyle.Primary, label: "回答" });
  expect(payload.allowedMentions).toEqual({ parse: [], roles: [adminRoleId] });
  const modal = adminAnswerModal(record.id);
  expect(modal.custom_id.length).toBeLessThanOrEqual(100);
  expect(modal.components).toMatchObject([{ type: ComponentType.Label, component: {
    type: ComponentType.TextInput, custom_id: ADMIN_ANSWER_INPUT_ID, style: TextInputStyle.Paragraph, max_length: 4000
  } }]);
  const draft = v2Container(relayDraftPayload({ ...record, draft: { text: "The standard plan supports it.", at } }));
  expect(draft.components[0]).toHaveProperty("content", expect.stringContaining("The standard plan supports it."));
  expect(draft.components[1]).toHaveProperty("content", expect.stringContaining("供工作人員審閱"));
});

it("handles trusted messages, the owner's bound decision and an admin modal without Discord", async () => {
  const root = await mkdtemp(join(tmpdir(), "discord-management-"));
  try {
    await writeFile(join(root, "guide.md"), "# Guide\n\n> Review: approved\n\n## Policy\n\nWait one minute.\n");
    const env = deployment();
    const config = loadManagementDiscordConfig(env);
    const staff = env.TEACHING_DISCORD_STAFF_USER_IDS;
    const { guildId, channelId, ownerUserId } = config;
    const policy = new ManagementPolicy(config);
    const teachingLog = new FileWorkflowJournal<ProposalRecord>(root, "teaching");
    const relayLog = () => new FileWorkflowJournal<RelayRecord>(root, "relay");
    const teaching = new TeachingService(policy, teachingLog, new FileTeachingCorpus(root, join(root, "index"),
      { model: "mock", embed: texts => Promise.resolve(texts.map(() => [1, 1])) }));
    const polish = vi.fn(() => Promise.resolve("Please wait two minutes."));
    const relay = new AdminRelayService(policy, relayLog(), polish);
    const suggest = vi.fn<ProposeTeachingEdit>((_text, sections) =>
      Promise.resolve({ ...sections.find(section => section.section === "Policy")!, replacement: "Wait two minutes." }));
    const adapter = new DiscordManagementAdapter(policy, config.adminRoleId, teaching, relay, suggest);
    const botId = snowflake();
    const sent: { id: string; attachments: { size: number }; author: { id: string }; edit: ReturnType<typeof vi.fn> }[] = [];
    const send = vi.fn((payload: ManagementPayload) => {
      v2Container(payload);
      const message = { id: snowflake(), attachments: { size: 0 }, author: { id: botId }, edit: vi.fn() };
      sent.push(message);
      return Promise.resolve(message);
    });
    const channel = { id: channelId, guildId, type: ChannelType.GuildText, send };
    const message = (content: string, overrides = {}) => ({
      id: snowflake(), guildId, channelId, channel, author: { id: staff, bot: false }, inGuild: () => true,
      type: MessageType.Default, createdAt: new Date(at), reference: null, attachments: new Map(), messageSnapshots: new Map(),
      content, ...overrides
    }) as unknown as Message;
    await adapter.handleMessage(message("教學：Wait two minutes.", { reference: { messageId: snowflake() } }));
    await adapter.handleMessage(message("教學：Wait two minutes.", { channelId: snowflake() }));
    expect(suggest).not.toHaveBeenCalled();
    await adapter.handleMessage(message("教學：Wait two minutes."));
    const first = (await teachingLog.read())[0]!;
    const posted = sent[0]!;
    expect(posted.edit).toHaveBeenCalledOnce();
    expect((await teachingLog.read()).at(-1)?.binding?.messageId).toBe(posted.id);

    const interact = (userId: string, customId: string, from: unknown, modal = false) => ({
      guildId, channelId, customId, user: { id: userId }, member: { roles: [] }, client: { user: { id: botId } },
      message: from, inGuild: () => true, isButton: () => !modal, isModalSubmit: () => modal, isFromMessage: () => true,
      deferUpdate: vi.fn(), reply: vi.fn(), editReply: vi.fn(), followUp: vi.fn(), showModal: vi.fn(),
      fields: { getTextInputValue: vi.fn(() => "Wait two minutes.") }
    });
    const clickId = `kb:ap:${first.proposal.id}`;
    const wrongUser = interact(staff, clickId, posted);
    await adapter.handleInteraction(wrongUser as unknown as Interaction);
    expect(wrongUser.reply).toHaveBeenCalledWith(expect.objectContaining({ flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] }));
    expect((await teachingLog.read()).at(-1)?.status).toBe("pending");
    const owner = interact(ownerUserId, clickId, posted);
    await adapter.handleInteraction(owner as unknown as Interaction);
    expect(owner.deferUpdate).toHaveBeenCalledOnce();
    expect(owner.editReply).toHaveBeenCalledWith(expect.objectContaining({ flags: 32768 }));
    expect(owner.followUp).toHaveBeenCalledOnce();
    expect((await teachingLog.read()).at(-1)?.status).toBe("applied");

    const ticket = { guildId, channelId: snowflake() };
    const question = "How long should the customer wait?";
    const escalation = await adapter.postEscalation(channel as unknown as TextChannel, ticket, question);
    const questionMessage = sent[1]!;
    const openModal = interact(staff, `kb:answer:${escalation.id}`, questionMessage);
    await adapter.handleInteraction(openModal as unknown as Interaction);
    expect(openModal.showModal).toHaveBeenCalledWith(adminAnswerModal(escalation.id));
    const submit = interact(staff, `kb:an:${escalation.id}`, questionMessage, true);
    await adapter.handleInteraction(submit as unknown as Interaction);
    expect(submit.followUp).toHaveBeenCalledWith(expect.objectContaining({ flags: 32768 }));
    expect(polish).toHaveBeenCalledWith({ question, answer: "Wait two minutes." });
    const restarted = new AdminRelayService(policy, relayLog(), polish);
    const staffActor = { guildId, channelId, userId: staff, roleIds: [] };
    const result = await restarted.recordOutcome(staffActor, escalation.id, "Resolved after waiting.");
    expect(result).toMatchObject({
      ticket, question, messageId: questionMessage.id, answer: { text: "Wait two minutes.", staffUserId: staff },
      draft: { text: "Please wait two minutes." }, outcome: { text: "Resolved after waiting.", staffUserId: staff }
    });
    expect((await relayLog().read()).at(-1)).toEqual(result);
    expect(sent).toHaveLength(2);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
