import { isCanonicalDiscordSnowflake } from "@support-ai-agent/contracts";
import { TicketContextTokens } from "@support-ai-agent/trusted-context";
import { WhmcsCustomerIdentityResolver, VerifiedWhmcsCustomerResolver, WhmcsHostingServiceProvider } from "@support-ai-agent/whmcs";
import { PterodactylGameServerProvider } from "@support-ai-agent/pterodactyl";
import { createOpenClawTicketRunner, DEFAULT_HUMAN_IDLE_MS } from "@support-ai-agent/ticket-bridge";
import { HostingSupportService } from "../../apps/support-core/dist/src/services/hosting-support-service.js";
import { supportKnowledgeRoot } from "./knowledge-setup.js";

export class TicketSupportSetupError extends Error {
  constructor(message: string) { super(message); this.name = "TicketSupportSetupError"; }
}
function value(environment: Readonly<Record<string, string | undefined>>, name: string): string {
  const result = environment[name];
  if (!result?.trim() || result.startsWith("REPLACE_")) throw new TicketSupportSetupError(`${name} is required`);
  return result;
}

/** Validate every configuration before loading the baseline (which starts a live bot). */
export function prepareTicketSupport(environment: Readonly<Record<string, string | undefined>>, fetchImpl: typeof fetch = fetch) {
  if (environment.TICKET_SUPPORT_ACK !== "I_HAVE_AUTHORIZATION" ||
      environment.TICKET_BASELINE_REVIEW_ACK !== "I_HAVE_REVIEWED_BASELINE_CONFIGURATION" ||
      environment.GETCLIENTID_REVIEW_ACK !== "I_HAVE_REVIEWED_IDENTITY_CONTRACT" ||
      environment.PTERODACTYL_EXTERNAL_ID_ACK !== "WHMCS_SERVICE_ID") {
    throw new TicketSupportSetupError("Review the baseline, identity and external mapping; set all four authorization acknowledgements");
  }
  const root = value(environment, "TICKET_BOT_ROOT");
  let knowledgeRoot: string;
  try { knowledgeRoot = supportKnowledgeRoot(environment); }
  catch { throw new TicketSupportSetupError("SUPPORT_KNOWLEDGE_ROOT must be an absolute folder path"); }
  const guildId = value(environment, "TEST_TICKET_GUILD_ID");
  const channelId = value(environment, "TEST_TICKET_CHANNEL_ID");
  const staff = value(environment, "TICKET_STAFF_USER_IDS").split(",");
  const auditChannelId = environment.TICKET_AUDIT_CHANNEL_ID;
  if (auditChannelId !== undefined && (!isCanonicalDiscordSnowflake(auditChannelId) ||
      auditChannelId === channelId || environment.TICKET_AUDIT_REVIEW_ACK !== "I_HAVE_REVIEWED_STAFF_ONLY_CHANNEL")) {
    throw new TicketSupportSetupError("Audit requires a separate canonical channel ID and staff-only review acknowledgement");
  }
  if (![guildId, channelId, ...staff].every(isCanonicalDiscordSnowflake)) {
    throw new TicketSupportSetupError("Ticket and staff IDs must be canonical snowflake strings");
  }
  const port = environment.SUPPORT_CORE_PORT ?? "3001";
  if (!/^[0-9]{4,5}$/.test(port) || Number(port) < 1024 || Number(port) > 65535) {
    throw new TicketSupportSetupError("SUPPORT_CORE_PORT must be an unprivileged local port");
  }
  const humanIdleMs = environment.TICKET_HUMAN_IDLE_MS ?? String(DEFAULT_HUMAN_IDLE_MS);
  if (!/^[0-9]+$/.test(humanIdleMs) || !Number.isSafeInteger(Number(humanIdleMs)) ||
      Number(humanIdleMs) < 5_000 || Number(humanIdleMs) > 86_400_000) {
    throw new TicketSupportSetupError("TICKET_HUMAN_IDLE_MS must be an integer from 5000 to 86400000");
  }
  try {
    const whmcsConfig = { baseUrl: value(environment, "WHMCS_BASE_URL"),
      apiIdentifier: value(environment, "WHMCS_API_IDENTIFIER"), apiSecret: value(environment, "WHMCS_API_SECRET") };
    const identities = new VerifiedWhmcsCustomerResolver(new WhmcsCustomerIdentityResolver(whmcsConfig, fetchImpl), whmcsConfig, fetchImpl);
    const pterodactyl = new PterodactylGameServerProvider({ baseUrl: value(environment, "PTERODACTYL_BASE_URL"),
        applicationApiKey: value(environment, "PTERODACTYL_APPLICATION_API_KEY"),
        clientApiKey: value(environment, "PTERODACTYL_CLIENT_API_KEY"), externalIdStrategy: "whmcs-service-id" }, fetchImpl);
    const support = new HostingSupportService({ identityResolver: identities,
      hostingServices: new WhmcsHostingServiceProvider(whmcsConfig, identities, fetchImpl),
      gameServers: pterodactyl, gameServerFiles: pterodactyl, gameServerMutations: pterodactyl });
    const tokens = new TicketContextTokens(value(environment, "TICKET_CONTEXT_KEY"));
    const runner = createOpenClawTicketRunner(value(environment, "OPENCLAW_BASE_URL"), value(environment, "OPENCLAW_GATEWAY_TOKEN"), fetchImpl);
    return { root, knowledgeRoot, guildId, channelId, auditChannelId, staff: new Set(staff), port: Number(port), humanIdleMs: Number(humanIdleMs), support, tokens, runner };
  } catch (error: unknown) {
    if (error instanceof TicketSupportSetupError) throw error;
    throw new TicketSupportSetupError("Invalid provider, context key or OpenClaw configuration");
  }
}
