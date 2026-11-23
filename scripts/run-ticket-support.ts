import { createRequire } from "node:module";
import { resolve, isAbsolute } from "node:path";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import {
  LegacyTicketAdapter, legacyMongooseReader, installLegacyMutationGuard, TicketBridge,
  DiscordTicketSupport, attachTicketSupportEvents, type LegacyDiscordTransport
} from "@support-ai-agent/ticket-bridge";
import { buildApp } from "../apps/support-core/dist/src/app.js";
import { prepareTicketSupport, TicketSupportSetupError } from "./lib/ticket-support-setup.js";
import { privateDiscordAudit } from "./lib/discord-support-audit.js";
import { MarkdownKnowledgeProvider } from "../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js";
import { SupportKnowledgeService } from "../apps/support-core/dist/src/services/support-knowledge-service.js";

/** Manual launcher. Never imported by tests or default dev/start. */
async function main() {
  // Capture before baseline src/index.js replaces process.env with its own config.
  const setup = prepareTicketSupport({ ...process.env });
  // Load only reviewed local documentation before importing the live baseline.
  const knowledgeProvider = new MarkdownKnowledgeProvider(setup.knowledgeRoot);
  try {
    if (!(await knowledgeProvider.stats()).articles) throw new Error();
  } catch { throw new TicketSupportSetupError("Support knowledge is unavailable; run knowledge:check before starting the bot"); }
  const knowledge = new SupportKnowledgeService(knowledgeProvider);
  if (!isAbsolute(setup.root)) throw new TicketSupportSetupError("TICKET_BOT_ROOT must be an absolute extracted baseline directory");
  const root = resolve(setup.root);
  const metadata: unknown = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
  if (!metadata || typeof metadata !== "object" || !("main" in metadata) || metadata.main !== "src/index.js") {
    throw new TicketSupportSetupError("Baseline package must use the inspected src/index.js entry");
  }
  const baselineRequire = createRequire(resolve(root, "package.json"));
  // These are the actual shared baseline model/cache, not a second DB connection.
  const model = baselineRequire(resolve(root, "src/database/models/ticket.js")) as Parameters<typeof legacyMongooseReader>[0] & Record<string, unknown>;
  const reader = legacyMongooseReader(model);
  type BaselineClient = {
    user: { id: string } | null;
    isReady(): boolean;
    channels: { fetch(channelId: string): Promise<unknown> };
    on(event: string, listener: (...args: never[]) => void): unknown;
    off(event: string, listener: (...args: never[]) => void): unknown;
    once(event: string, listener: (...args: never[]) => void): unknown;
  };
  const discord: LegacyDiscordTransport = { async send(scope, text, options) {
    const channel = await client.channels.fetch(scope.channelId);
    if (!channel || typeof channel !== "object" || !("guildId" in channel) || channel.guildId !== scope.guildId ||
        !("id" in channel) || channel.id !== scope.channelId || !("send" in channel) || typeof channel.send !== "function") {
      throw new Error("Ticket channel unavailable");
    }
    await (Reflect.apply(channel.send, channel, [{ content: text, allowedMentions: options.allowedMentions }]) as Promise<unknown>);
  } };
  const adapter = new LegacyTicketAdapter(reader, discord);
  const restore = installLegacyMutationGuard(model, adapter);
  const bridge = new TicketBridge(adapter, adapter, setup.tokens);
  // Baseline uses relative paths for handlers/transcripts; leave its source files untouched.
  process.chdir(root);
  const client = baselineRequire(resolve(root, "src/index.js")) as BaselineClient;
  let detach = () => undefined as void;
  let app: ReturnType<typeof buildApp> | undefined;
  try {
    if (!client.isReady()) await once(client as never, "ready", { signal: AbortSignal.timeout(30_000) });
    const audit = setup.auditChannelId ? privateDiscordAudit(await client.channels.fetch(setup.auditChannelId),
      setup.guildId, setup.auditChannelId, setup.staff, client.user?.id ?? "", (code) => console.error(code)) : undefined;
    const tickets = new DiscordTicketSupport(reader, adapter, bridge, setup.runner, setup.staff, audit, {
      humanIdleMs: setup.humanIdleMs
    });
    detach = attachTicketSupportEvents(client, tickets, (code) => console.error(code));
    app = buildApp({ readOnly: { support: setup.support, tokens: setup.tokens, tickets: bridge, knowledge, ...(audit ? { audit } : {}) } });
    await tickets.enableChannel(setup.guildId, setup.channelId);
    await app.listen({ host: "127.0.0.1", port: setup.port });
    console.log("Ticket support ready for the explicitly configured test channel (OpenClaw 2026.9.8)");
    const stop = () => { detach(); restore(); void app?.close().finally(() => process.exit(0)); };
    process.once("SIGINT", stop); process.once("SIGTERM", stop);
  } catch {
    detach(); restore(); await app?.close();
    throw new TicketSupportSetupError("Ticket support startup failed safely; inspect the baseline environment locally");
  }
}
try { await main(); }
catch (error: unknown) {
  console.error(error instanceof TicketSupportSetupError ? error.message : "Ticket support setup failed safely");
  process.exit(1);
}
