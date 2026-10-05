import { createSupportAuditRecorder } from "@openclaw-hosting/ticket-bridge";

interface Overwrite { id: string; type: number; allow: { has(flag: bigint): boolean }; deny: { has(flag: bigint): boolean }; }
export interface PrivateAuditChannel {
  id: string; guildId: string; type: number;
  permissionOverwrites: { cache: { values(): IterableIterator<Overwrite> } };
  send(options: { content: string; allowedMentions: { parse: string[] } }): Promise<unknown>;
}

/** Strict subset: explicit staff/bot member grants only. Admin visibility still requires operator review. */
export function privateDiscordAudit(channel: unknown, guildId: string, channelId: string,
  staffIds: ReadonlySet<string>, botId: string,
  onFailure: (code: "SUPPORT_AUDIT_UNAVAILABLE") => void) {
  const unavailable = () => new Error("Audit channel must be a reviewed private staff-only text channel");
  function assertPrivate(): PrivateAuditChannel {
    if (!channel || typeof channel !== "object") throw unavailable();
    const data = channel as PrivateAuditChannel;
    if (data.id !== channelId || data.guildId !== guildId || data.type !== 0 ||
        typeof data.send !== "function" || typeof data.permissionOverwrites?.cache?.values !== "function") throw unavailable();
    const viewChannel = 1024n;
    const overwrites = [...data.permissionOverwrites.cache.values()];
    const everyone = overwrites.find((item) => item.id === guildId && item.type === 0);
    if (!everyone?.deny.has(viewChannel) || everyone.allow.has(viewChannel)) throw unavailable();
    for (const item of overwrites) {
      if (item.allow.has(viewChannel) && (item.type !== 1 || (!staffIds.has(item.id) && item.id !== botId))) throw unavailable();
    }
    return data;
  }
  assertPrivate();
  return createSupportAuditRecorder(async (text) => {
    const reviewed = assertPrivate(); // Recheck cached permission changes on every send; no claim of cross-process atomicity.
    return reviewed.send({ content: text, allowedMentions: { parse: [] } });
  }, onFailure);
}
