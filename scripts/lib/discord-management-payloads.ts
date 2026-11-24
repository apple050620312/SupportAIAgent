import {
  ButtonStyle, ComponentType, MessageFlags, TextInputStyle,
  type APIActionRowComponent, type APIButtonComponent, type APIContainerComponent, type APIMessageTopLevelComponent,
  type APIModalInteractionResponseCallbackData, type APITextDisplayComponent, type AttachmentPayload, type MessageMentionOptions
} from "discord.js";
import type { RelayRecord } from "../../apps/support-core/dist/src/services/relay-service.js";
import { isWorkflowId, type ProposalRecord } from "../../apps/support-core/dist/src/services/teaching-service.js";

export const MANAGEMENT_TEXT_BUDGET = 4_000;
const PENDING = 0x5865f2;
const APPLIED = 0x248046;
const DECLINED = 0xda373c;

export interface ManagementPayload {
  readonly flags: MessageFlags.IsComponentsV2;
  readonly components: readonly APIMessageTopLevelComponent[];
  readonly allowedMentions: MessageMentionOptions;
  readonly files?: readonly (AttachmentPayload & { attachment: Buffer })[];
}

export interface ProposalLinks {
  readonly article?: string;
  readonly diff?: string;
}

function v2(components: APIMessageTopLevelComponent[], roles: string[] = []): ManagementPayload {
  return { flags: MessageFlags.IsComponentsV2, components, allowedMentions: { parse: [], roles } };
}

function display(content: string): APITextDisplayComponent {
  return { type: ComponentType.TextDisplay, content };
}

function container(accent_color: number, components: APIContainerComponent["components"]): APIContainerComponent {
  return { type: ComponentType.Container, accent_color, components };
}

function customId(action: "ap" | "de" | "answer" | "an", id: string): string {
  if (!isWorkflowId(id)) throw new Error("Invalid management interaction ID");
  return `kb:${action}:${id}`;
}

function timestamp(at: string): string {
  return `<t:${Math.floor(Date.parse(at) / 1000)}:f>`;
}

function escaped(text: string): string {
  return text.replace(/[\\`*_~|[\]<>()#>-]/gu, "\\$&");
}

function clipped(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const end = /[\uD800-\uDBFF]/u.test(text[limit - 2] ?? "") ? limit - 2 : limit - 1;
  return text.slice(0, Math.max(0, end)) + "…";
}

function githubUrl(url: string | undefined): string | undefined {
  if (!url || url.length > 512) return undefined;
  const parsed = URL.parse(url);
  if (parsed?.protocol !== "https:" || parsed.hostname !== "github.com" || parsed.username || parsed.password || parsed.port) return undefined;
  return parsed.href.replace(/\(/gu, "%28").replace(/\)/gu, "%29");
}

function changedHunk(before: string, after: string) {
  const oldLines = before.replace(/\r\n?/gu, "\n").split("\n");
  const newLines = after.replace(/\r\n?/gu, "\n").split("\n");
  let start = 0;
  while (start < oldLines.length && oldLines[start] === newLines[start]) start++;
  let oldEnd = oldLines.length;
  let newEnd = newLines.length;
  while (oldEnd > start && newEnd > start && oldLines[oldEnd - 1] === newLines[newEnd - 1]) {
    oldEnd--;
    newEnd--;
  }
  const removed = oldLines.slice(start, oldEnd).map(line => `-${line}`).join("\n");
  const added = newLines.slice(start, newEnd).map(line => `+${line}`).join("\n");
  const oldStart = oldEnd === start ? start : start + 1;
  const newStart = newEnd === start ? start : start + 1;
  const header = `@@ -${oldStart},${oldEnd - start} +${newStart},${newEnd - start} @@`;
  return { header, removed, added, full: [header, removed, added].filter(Boolean).join("\n") };
}

const separator = { type: ComponentType.Separator, divider: true } as const;
const LABELS = { applied: "✅ 已批准並發布", declined: "❌ 已拒絕", stale: "⚠️ 文章已更新，請建立新提案",
  failed: "⚠️ 發布失敗，請建立新提案" } as const;

export function proposalPayload(record: ProposalRecord, links: ProposalLinks = {}, locked = false): ManagementPayload {
  const proposal = record.proposal;
  const article = githubUrl(links.article);
  const fullDiff = githubUrl(links.diff);
  const completed = record.status !== "pending" && record.status !== "applying";
  const articleLabel = escaped(proposal.article);
  const info = [
    "## KB 修改提案", `提案人 <@${proposal.source.actor.userId}> · ${timestamp(proposal.source.at)}`,
    `文章 ${article ? `[${articleLabel}](${article})` : articleLabel}`, `章節 ${escaped(proposal.section)}`
  ];
  const outcome = completed && record.decision
    ? `${LABELS[record.status]} · <@${record.decision.ownerUserId}> · ${timestamp(record.decision.at)}`
    : "只有擁有者可以批准 · 批准後發布 KB、更新語意索引並記錄教學";
  const teach = escaped(proposal.source.text);
  const teachingLimit = 900;
  const teaching = `**教學原文**\n${clipped(teach, teachingLimit)}`;
  const exactTeachingNeeded = teach.length > teachingLimit;
  const diff = changedHunk(proposal.before, proposal.after);
  const baseFooter = `-# ${proposal.id} · ${outcome}`;
  const wrapped = (text: string) => `\x60\x60\x60diff\n${text}\n\x60\x60\x60`;
  const meta = info.join("\n");
  const available = MANAGEMENT_TEXT_BUDGET - meta.length - teaching.length - 200;
  const truncateDiff = wrapped(diff.full).length > available || exactTeachingNeeded;
  const extra = truncateDiff
    ? `\n-# ${fullDiff ? `[完整差異](${fullDiff}) · ` : ""}完整預覽與教學原文見附件`
    : "";
  const budget = available - extra.length - wrapped(diff.header).length - 2;
  const oldLimit = Math.max(Math.floor(budget / 2), budget - diff.added.length);
  const newLimit = budget - Math.min(oldLimit, diff.removed.length);
  const preview = truncateDiff ? [diff.header, clipped(diff.removed, oldLimit), clipped(diff.added, newLimit)].filter(Boolean).join("\n") : diff.full;
  const buttons: APIButtonComponent[] = [
    { type: ComponentType.Button, style: ButtonStyle.Success, label: "批准", custom_id: customId("ap", proposal.id), disabled: completed || locked },
    { type: ComponentType.Button, style: ButtonStyle.Danger, label: "拒絕", custom_id: customId("de", proposal.id), disabled: completed || locked }
  ];
  if (article) buttons.push({ type: ComponentType.Button, style: ButtonStyle.Link, label: "查看文章", url: article });
  const row: APIActionRowComponent<APIButtonComponent> = { type: ComponentType.ActionRow, components: buttons };
  const accent = completed ? record.status === "applied" ? APPLIED : DECLINED : PENDING;
  const components: APIMessageTopLevelComponent[] = [
    container(accent, [display(meta), display(teaching), separator, display(wrapped(preview)), separator, display(baseFooter + extra), row])
  ];
  if (!truncateDiff) return v2(components);
  const name = `kb-${proposal.id}.txt`;
  components.push({ type: ComponentType.File, file: { url: `attachment://${name}` } });
  const attachment = Buffer.from([proposal.article, proposal.section, proposal.version, proposal.source.text, diff.full].join("\n\n"), "utf8");
  return { ...v2(components), files: [{ name, attachment }] };
}

export function escalationPayload(record: RelayRecord, adminRoleId: string, disabled = false): ManagementPayload {
  return v2([container(PENDING, [{
    type: ComponentType.Section, components: [display(`## 需要管理員協助\n<@&${adminRoleId}>\n${clipped(escaped(record.question), 3_600)}`)],
    accessory: { type: ComponentType.Button, style: ButtonStyle.Primary, custom_id: customId("answer", record.id), label: "回答", disabled }
  }])], [adminRoleId]);
}

export const ADMIN_ANSWER_INPUT_ID = "answer";

export function adminAnswerModal(id: string, previousAnswer?: string): APIModalInteractionResponseCallbackData {
  return {
    custom_id: customId("an", id), title: "回答客服問題", components: [{
      type: ComponentType.Label, label: "管理員答覆", component: {
        type: ComponentType.TextInput, custom_id: ADMIN_ANSWER_INPUT_ID, style: TextInputStyle.Paragraph,
        required: true, min_length: 1, max_length: 4_000, ...(previousAnswer === undefined ? {} : { value: previousAnswer })
      }
    }]
  };
}

export function relayDraftPayload(record: RelayRecord): ManagementPayload {
  if (!record.draft) throw new Error("Relay draft is missing");
  return v2([container(PENDING, [display(`## 回覆草稿\n${clipped(escaped(record.draft.text), 3_800)}`), display(`-# 供工作人員審閱 · ${record.id}`)])]);
}

export function managementNotice(text: string): ManagementPayload {
  return v2([container(PENDING, [display(text)])]);
}

export function publicationNotice(record: ProposalRecord, link?: string): ManagementPayload {
  const article = githubUrl(link);
  const label = escaped(record.proposal.article);
  const target = article ? `[${label}](${article})` : label;
  return v2([container(APPLIED, [display(`已發布 ${target} · 語意索引及教學紀錄已更新。`)])]);
}
