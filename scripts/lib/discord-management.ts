import { ChannelType, Events, MessageFlags, MessageType,
  type ButtonInteraction, type Client, type Interaction, type Message, type ModalSubmitInteraction, type TextChannel
} from "discord.js";
import type { TicketScope } from "@support-ai-agent/contracts";
import { type ManagementPolicy, TeachingError, type ManagementActor, type TeachingSource } from "../../apps/support-core/dist/src/domain/teaching-policy.js";
import type { ReviewedSection, SectionEdit } from "../../apps/support-core/dist/src/domain/teaching-section.js";
import type { AdminRelayService } from "../../apps/support-core/dist/src/services/relay-service.js";
import { isWorkflowId, type TeachingProposal, type TeachingService } from "../../apps/support-core/dist/src/services/teaching-service.js";
import {
  ADMIN_ANSWER_INPUT_ID, adminAnswerModal, escalationPayload, managementNotice, proposalPayload, publicationNotice, relayDraftPayload,
  type ManagementPayload, type ProposalLinks
} from "./discord-management-payloads.js";

type ManagementChannel = Pick<TextChannel, "id" | "guildId" | "send">;
export type ProposeTeachingEdit = (text: string, sections: readonly ReviewedSection[]) => Promise<SectionEdit | null>;

const notices = {
  forbidden: "此動作僅供已授權的工作人員或擁有者使用。",
  ineligible: "這則教學或目的章節不符合知識庫更新條件。",
  invalid_edit: "請提出一項針對現有章節的明確修改。",
  stale: "文章已更新，請建立新提案。",
  conflict: "這筆記錄已有另一個決定或答案。",
  not_found: "找不到這筆記錄。"
};

function reason(error: unknown): string {
  return error instanceof TeachingError ? notices[error.code] : "暫時無法完成，請稍後再試。";
}

function privateNotice(text: string) {
  return { ...managementNotice(text), flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] as const };
}

function editPayload(payload: ManagementPayload, message: Pick<Message, "attachments">) {
  if (!message.attachments.size) return payload;
  const { flags, components, allowedMentions } = payload;
  return { flags, components, allowedMentions };
}

export class DiscordManagementAdapter {
  constructor(
    private readonly policy: ManagementPolicy,
    private readonly adminRoleId: string,
    private readonly teaching: TeachingService,
    private readonly relay: AdminRelayService,
    private readonly proposeEdit: ProposeTeachingEdit,
    private readonly links: (proposal: TeachingProposal) => ProposalLinks = () => ({})
  ) {}

  private inManagement(guildId: string | null, channelId: string): boolean {
    return guildId === this.policy.config.guildId && channelId === this.policy.config.channelId;
  }

  attach(client: Client, reportFailure: () => void = () => undefined): () => void {
    const onMessage = (message: Message) => { void this.handleMessage(message).catch(reportFailure); };
    const onInteraction = (interaction: Interaction) => { void this.handleInteraction(interaction).catch(reportFailure); };
    client.on(Events.MessageCreate, onMessage);
    client.on(Events.InteractionCreate, onInteraction);
    return () => {
      client.off(Events.MessageCreate, onMessage);
      client.off(Events.InteractionCreate, onInteraction);
    };
  }

  async handleMessage(message: Message): Promise<void> {
    if (!message.inGuild() || !this.inManagement(message.guildId, message.channelId) ||
        message.channel.type !== ChannelType.GuildText || message.author.bot || message.webhookId ||
        message.type !== MessageType.Default || message.reference || message.attachments.size || message.messageSnapshots.size) return;
    const text = message.content;
    const teach = /^教學[：:]/u.test(text);
    const revert = /^還原 ([0-9a-f-]{36})[：:]/u.exec(text)?.[1];
    const outcome = /^結果 ([0-9a-f-]{36})[：:]\s*([\s\S]+)$/u.exec(text);
    if (!teach && !revert && !outcome) return;
    const actor = { guildId: message.guildId, channelId: message.channelId, userId: message.author.id,
      roleIds: [...(message.member?.roles.cache.keys() ?? [])] };
    try { this.policy.assertStaff(actor); }
    catch { return; }

    try {
      if (outcome && isWorkflowId(outcome[1]!)) {
        await this.relay.recordOutcome(actor, outcome[1]!, outcome[2]!);
        await message.channel.send(managementNotice("已記錄工單結果。"));
        return;
      }
      const source: TeachingSource = { kind: "standing_policy", actor, messageId: message.id, text, at: message.createdAt.toISOString() };
      let record;
      if (revert) {
        record = await this.teaching.proposeRevert(source, revert);
      } else {
        const sections = await this.teaching.reviewed(source);
        const edit = await this.proposeEdit(text, sections);
        if (!edit) {
          await message.channel.send(managementNotice("找不到適合修改的已審核章節。"));
          return;
        }
        record = await this.teaching.propose(source, edit);
      }
      if (record.binding) return;
      const links = this.links(record.proposal);
      const preview = await message.channel.send(proposalPayload(record, links, true));
      record = await this.teaching.bind(record.proposal.id, {
        guildId: message.guildId, channelId: message.channelId, messageId: preview.id, version: record.proposal.version
      });
      await preview.edit(editPayload(proposalPayload(record, links), preview));
    } catch (error) {
      await message.channel.send(managementNotice(reason(error)));
    }
  }

  /** The host supplies the trusted ticket and the question for the management channel. */
  async postEscalation(channel: ManagementChannel, ticket: Pick<TicketScope, "guildId" | "channelId">, question: string) {
    if (!this.inManagement(channel.guildId, channel.id)) throw new TeachingError("forbidden");
    const record = await this.relay.open(ticket, question);
    const message = await channel.send(escalationPayload(record, this.adminRoleId, true));
    const bound = await this.relay.bind(record.id, { guildId: channel.guildId, channelId: channel.id, messageId: message.id });
    const enabled = escalationPayload(bound, this.adminRoleId);
    await message.edit({ ...enabled, allowedMentions: { parse: [] } });
    return bound;
  }

  async handleInteraction(interaction: Interaction): Promise<void> {
    if (!(interaction.isButton() || interaction.isModalSubmit()) || !interaction.customId.startsWith("kb:") ||
        !interaction.inGuild() || !interaction.channelId || !this.inManagement(interaction.guildId, interaction.channelId) ||
        interaction.user.bot) return;
    const parts = /^kb:(ap|de|answer|an):(.+)$/u.exec(interaction.customId);
    if (!parts || !isWorkflowId(parts[2]!)) return;
    const [action, id] = [parts[1]!, parts[2]!];
    const member = interaction.member;
    const roleIds = "cache" in member.roles ? [...member.roles.cache.keys()] : member.roles;
    const actor = { guildId: interaction.guildId, channelId: interaction.channelId, userId: interaction.user.id, roleIds };
    try {
      this.policy.assertStaff(actor);
      if (interaction.isButton() && interaction.message.author.id === interaction.client.user.id) {
        await this.button(interaction, actor, action, id);
      } else if (interaction.isModalSubmit() && action === "an" && interaction.isFromMessage() &&
          interaction.message.author.id === interaction.client.user.id) {
        await this.answer(interaction, actor, id, interaction.message);
      }
    } catch (error) {
      const notice = privateNotice(reason(error));
      if (interaction.replied || interaction.deferred) await interaction.followUp(notice);
      else await interaction.reply(notice);
    }
  }

  private async button(interaction: ButtonInteraction, actor: ManagementActor, action: string, id: string): Promise<void> {
    if (action === "answer") {
      const record = await this.relay.questionForAnswer(actor, id, interaction.message.id);
      await interaction.showModal(adminAnswerModal(id, record.answer?.text));
      return;
    }
    if (action !== "ap" && action !== "de") return;
    this.policy.assertOwner(actor);
    await interaction.deferUpdate();
    const record = await this.teaching.decide(actor, id, interaction.message.id, action === "ap" ? "approve" : "decline");
    if (record.status === "applying") {
      await interaction.followUp(privateNotice("這筆提案正在發布。"));
      return;
    }
    const links = this.links(record.proposal);
    await interaction.editReply(editPayload(proposalPayload(record, links), interaction.message));
    if (record.status === "applied" && action === "ap") await interaction.followUp(publicationNotice(record, links.article));
  }

  private async answer(interaction: ModalSubmitInteraction, actor: ManagementActor, id: string, message: Message): Promise<void> {
    const answer = interaction.fields.getTextInputValue(ADMIN_ANSWER_INPUT_ID);
    await interaction.deferUpdate();
    const record = await this.relay.answer(actor, id, message.id, answer);
    await interaction.followUp(relayDraftPayload(record));
    const preview = escalationPayload(record, this.adminRoleId, true);
    await interaction.editReply({ ...preview, allowedMentions: { parse: [] } });
  }
}
