import type { TicketScope } from "@support-ai-agent/contracts";
import type { ShadowThread } from "@support-ai-agent/ticket-bridge";

type FetchChannel = (id: string) => Promise<unknown>;
interface ParentChannel {
  id: string;
  guildId: string;
  type: number;
  guild: { members: { fetch(options: { user: string; force: true }): Promise<unknown> } };
  permissionsFor(member: unknown): { has(permission: bigint): boolean } | null;
  threads: { create(options: { name: string; type: 12; invitable: false }): Promise<PrivateThread> };
}
interface PrivateThread {
  id: string;
  guildId: string;
  parentId: string;
  type: number;
  invitable: boolean;
  ownerId: string;
  members: {
    add(id: string): Promise<unknown>;
    fetch(options: { cache: false }): Promise<{ keys(): IterableIterator<string> }>;
  };
  send(options: { content: string; allowedMentions: { parse: []; repliedUser: false }; flags: number }): Promise<{ delete(): Promise<unknown> }>;
  delete(): Promise<unknown>;
}

export async function openDiscordShadowThread(fetchChannel: FetchChannel, scope: TicketScope,
  staff: ReadonlySet<string>, botId: string): Promise<ShadowThread> {
  const unavailable = () => new Error("Private draft thread unavailable");
  const allowed = new Set([...staff, botId]);
  if (!botId || allowed.has(scope.discordUserId)) throw unavailable();
  async function parent(): Promise<ParentChannel> {
    const channel = await fetchChannel(scope.channelId) as ParentChannel | null;
    if (channel?.type !== 0 || channel.id !== scope.channelId || channel.guildId !== scope.guildId) throw unavailable();
    const customer = await channel.guild.members.fetch({ user: scope.discordUserId, force: true });
    const permissions = channel.permissionsFor(customer);
    // Manage Threads and Administrator can see private threads without an invitation.
    if (!permissions || permissions.has(1n << 34n) || permissions.has(1n << 3n)) throw unavailable();
    return channel;
  }
  const created = await (await parent()).threads.create({ name: "Support draft review", type: 12, invitable: false });
  async function verify(thread: PrivateThread | null): Promise<PrivateThread> {
    if (thread?.type !== 12 || thread.id !== created.id || thread.parentId !== scope.channelId ||
        thread.guildId !== scope.guildId || thread.invitable !== false || thread.ownerId !== botId) throw unavailable();
    const members = await thread.members.fetch({ cache: false });
    if ([...members.keys()].some(id => !allowed.has(id))) throw unavailable();
    return thread;
  }
  try {
    await verify(created);
    for (const id of staff) await created.members.add(id);
  } catch {
    await created.delete();
    throw unavailable();
  }
  return {
    id: created.id,
    async publish(id, text, assertCurrent) {
      const sent: Awaited<ReturnType<PrivateThread["send"]>>[] = [];
      const discard = async () => { await Promise.all(sent.map(message => message.delete())); };
      let remaining = `Draft ${id}\nReview here with \`!draft ${id} accept\`, \`!draft ${id} edit <replacement>\`, or \`!draft ${id} reject\`.\n\n${text}`;
      try {
        while (remaining) {
          await parent();
          const thread = await verify(await fetchChannel(created.id) as PrivateThread | null);
          await assertCurrent();
          let end = Math.min(remaining.length, 1800);
          if (end < remaining.length && /[\uD800-\uDBFF]/.test(remaining[end - 1]!)) end--;
          sent.push(await thread.send({ content: remaining.slice(0, end),
            allowedMentions: { parse: [], repliedUser: false }, flags: 4 }));
          remaining = remaining.slice(end);
          await assertCurrent();
        }
        return discard;
      } catch (error) {
        await discard();
        throw error;
      }
    }
  };
}
