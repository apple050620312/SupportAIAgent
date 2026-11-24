import { createRequire } from "node:module";
import { resolve, isAbsolute } from "node:path";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import { once } from "node:events";
import {
  LegacyTicketAdapter, legacyMongooseReader, installLegacyMutationGuard, TicketBridge,
  DiscordTicketSupport, attachTicketSupportEvents, TicketBridgeError
} from "@support-ai-agent/ticket-bridge";
import { createLiveDraftVerifier, createLiveModel, createVercelTicketRunner, FileHistoryStore, SupportCoreClient } from "@support-ai-agent/agent-loop";
import { createShadowVerdictRecorder } from "./lib/shadow-verdict-log.js";
import { openDiscordShadowThread } from "./lib/discord-shadow.js";
import { buildApp } from "../apps/support-core/dist/src/app.js";
import { prepareTicketSupport, shadowAutoAdmissionEnabled, TicketSupportSetupError } from "./lib/ticket-support-setup.js";
import { privateDiscordAudit } from "./lib/discord-support-audit.js";
import { MarkdownKnowledgeProvider } from "../apps/support-core/dist/src/adapters/markdown-knowledge-provider.js";
import { SupportKnowledgeService } from "../apps/support-core/dist/src/services/support-knowledge-service.js";

/** Manual launcher. Never imported by tests or default dev/start. */
async function main() {
  // Capture before baseline src/index.js replaces process.env with its own config.
  const environment = { ...process.env };
  const autoAdmit = shadowAutoAdmissionEnabled(environment);
  if (!autoAdmit && !environment.SHADOW_TICKET_CHANNEL_IDS?.trim()) {
    console.log("Ticket shadow mode is disabled: auto-admission is off and the channel allowlist is empty");
    return;
  }
  const setup = prepareTicketSupport(environment, fetch, true);
  const shadowRoot = resolve(".ticket-shadow");
  await mkdir(shadowRoot, { recursive: true, mode: 0o700 });
  const append = (file: string, entry: unknown) =>
    appendFile(resolve(shadowRoot, file), JSON.stringify(entry) + "\n", { mode: 0o600 });
  const runnerModel = createLiveModel(environment);
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
    channels: { fetch(channelId: string, options?: { force: boolean }): Promise<unknown> };
    on(event: string, listener: (...args: never[]) => void): unknown;
    off(event: string, listener: (...args: never[]) => void): unknown;
    once(event: string, listener: (...args: never[]) => void): unknown;
  };
  const adapter = new LegacyTicketAdapter(reader, { send: () => Promise.reject(new TicketBridgeError()) });
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
    const runner = createVercelTicketRunner({
      verifyDraft: createLiveDraftVerifier(environment),
      model: runnerModel, draftOnly: true, history: new FileHistoryStore(resolve(shadowRoot, "history")),
      core: new SupportCoreClient(`http://127.0.0.1:${setup.port}/`),
      async authenticate({ sessionId, ticketToken }) {
        const { scope, expiresAtMs } = setup.tokens.verifyContext(ticketToken);
        if (scope.guildId !== setup.guildId || scope.channelId !== sessionId ||
            (setup.channelIds.size > 0 && !setup.channelIds.has(scope.channelId))) throw new TicketBridgeError();
        const initial = await bridge.read(scope);
        if (initial?.state !== "AI_ACTIVE") throw new TicketBridgeError();
        const assertCurrent = async () => {
          setup.tokens.verify(ticketToken);
          const current = await bridge.read(scope);
          if (current?.state !== "AI_ACTIVE" || current.revision !== initial.revision) throw new TicketBridgeError();
        };
        return { scope, expiresAtMs, selectedServiceRef: null, assertCurrent };
      }
    });
    const tickets = new DiscordTicketSupport(reader, adapter, bridge, runner, setup.staff, audit, {
      shadow: {
        channelIds: setup.channelIds,
        ...(autoAdmit ? { autoAdmitGuildId: setup.guildId } : {}),
        ...(setup.auditChannelId ? { excludedChannelId: setup.auditChannelId } : {}),
        openThread: (scope) => openDiscordShadowThread(id => client.channels.fetch(id, { force: true }),
          scope, setup.staff, client.user?.id ?? ""),
        recordVerdict: createShadowVerdictRecorder(shadowRoot)
      }
    });
    app = buildApp({ readOnly: {
      support: setup.support, tokens: setup.tokens, tickets: bridge, knowledge, ...(audit ? { audit } : {}),
      invocationAudit: { append: (entry) => append("core-invocations.jsonl", entry) },
      permissions: { grants: () => Promise.resolve(["customer:read", "server:read", "invoice:read", "knowledge:read"]),
        restartGate: () => Promise.resolve({ customerConfirmed: false, autonomousRecovery: false }) }
    } });
    await app.listen({ host: "127.0.0.1", port: setup.port });
    for (const channelId of setup.channelIds) await tickets.enableChannel(setup.guildId, channelId);
    detach = attachTicketSupportEvents(client, tickets, (code) => console.error(code));
    console.log("Ticket support ready in draft-only shadow mode");
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
