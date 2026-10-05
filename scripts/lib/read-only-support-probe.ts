import { isCanonicalDiscordSnowflake } from "@openclaw-hosting/contracts";
import { WhmcsCustomerIdentityResolver, VerifiedWhmcsCustomerResolver, WhmcsHostingServiceProvider } from "@openclaw-hosting/whmcs";
import { PterodactylGameServerProvider } from "@openclaw-hosting/pterodactyl";
import { HostingSupportService } from "../../apps/support-core/dist/src/services/hosting-support-service.js";
import { SupportDomainError } from "../../apps/support-core/dist/src/domain/errors.js";

export class SupportProbeSetupError extends Error {
  constructor(message: string) { super(message); this.name = "SupportProbeSetupError"; }
}
export interface SupportProbeObservation {
  readonly stage: "customer" | "services" | "owned-server" | "foreign-service";
  readonly outcome: "success" | "failed";
  readonly code: string | null;
  readonly status?: "running" | "offline" | "starting" | "stopping" | "unknown";
  readonly resourcesPresent?: boolean;
}
type Environment = Readonly<Record<string, string | undefined>>;
function requireValue(environment: Environment, name: string): string {
  const value = environment[name];
  if (!value?.trim() || value.startsWith("REPLACE_")) throw new SupportProbeSetupError(`${name} is required`);
  return value;
}
function serviceId(value: string): string {
  if (!/^[1-9][0-9]{0,15}$/.test(value) || BigInt(value) > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new SupportProbeSetupError("Test service IDs must be canonical positive safe integers");
  }
  return value;
}

/** Manual opt-in integration check. Outputs no actor/client/service/server identifiers. */
export async function probeReadOnlySupport(
  environment: Environment, fetchImpl: typeof fetch = fetch
): Promise<readonly SupportProbeObservation[]> {
  if (environment.SUPPORT_PROBE_ACK !== "I_HAVE_AUTHORIZATION") {
    throw new SupportProbeSetupError("SUPPORT_PROBE_ACK must equal I_HAVE_AUTHORIZATION");
  }
  if (environment.GETCLIENTID_REVIEW_ACK !== "I_HAVE_REVIEWED_IDENTITY_CONTRACT") {
    throw new SupportProbeSetupError("Review the GetClientID characterization before running the full read-only probe");
  }
  if (environment.PTERODACTYL_EXTERNAL_ID_ACK !== "WHMCS_SERVICE_ID") {
    throw new SupportProbeSetupError("Confirm the deployed external ID mapping before running this probe");
  }
  const discordUserId = requireValue(environment, "TEST_LINKED_DISCORD_ID");
  if (!isCanonicalDiscordSnowflake(discordUserId)) throw new SupportProbeSetupError("TEST_LINKED_DISCORD_ID must be a canonical snowflake string");
  const ownId = serviceId(requireValue(environment, "TEST_OWNED_SERVICE_ID"));
  const foreignId = environment.TEST_OTHER_CUSTOMER_SERVICE_ID ? serviceId(environment.TEST_OTHER_CUSTOMER_SERVICE_ID) : null;
  if (foreignId === ownId) throw new SupportProbeSetupError("Owned and foreign test service IDs must differ");
  const whmcsConfig = {
    baseUrl: requireValue(environment, "WHMCS_BASE_URL"), apiIdentifier: requireValue(environment, "WHMCS_API_IDENTIFIER"),
    apiSecret: requireValue(environment, "WHMCS_API_SECRET")
  };
  // Construct and validate all configuration before any request.
  let support: HostingSupportService;
  try {
    const identities = new VerifiedWhmcsCustomerResolver(new WhmcsCustomerIdentityResolver(whmcsConfig, fetchImpl), whmcsConfig, fetchImpl);
    support = new HostingSupportService({ identityResolver: identities,
      hostingServices: new WhmcsHostingServiceProvider(whmcsConfig, identities, fetchImpl),
      gameServers: new PterodactylGameServerProvider({
        baseUrl: requireValue(environment, "PTERODACTYL_BASE_URL"),
        applicationApiKey: requireValue(environment, "PTERODACTYL_APPLICATION_API_KEY"),
        clientApiKey: requireValue(environment, "PTERODACTYL_CLIENT_API_KEY"), externalIdStrategy: "whmcs-service-id"
      }, fetchImpl) });
  } catch (error: unknown) {
    if (error instanceof SupportProbeSetupError) throw error;
    throw new SupportProbeSetupError("Provider configuration is invalid; require HTTPS installation bases and runtime credentials");
  }
  const actor = { actor: { discordUserId }, correlationId: "manual-read-only-probe" };
  const results: SupportProbeObservation[] = [];
  let stage: SupportProbeObservation["stage"] = "customer";
  try {
    await support.resolveCustomer(actor);
    results.push({ stage, outcome: "success", code: null });
    stage = "services";
    const services = await support.listMyServices(actor);
    if (!services.some((service) => service.serviceRef === `whmcs-service:${ownId}`)) {
      results.push({ stage, outcome: "failed", code: "TEST_SERVICE_NOT_IN_OWNED_LIST" });
      return results;
    }
    results.push({ stage, outcome: "success", code: null });
    stage = "owned-server";
    const server = await support.getMyServer(actor, `whmcs-service:${ownId}`);
    results.push({ stage, outcome: "success", code: null, status: server.status, resourcesPresent: server.resources !== undefined });
    if (foreignId !== null) {
      stage = "foreign-service";
      try {
        await support.getMyServer(actor, `whmcs-service:${foreignId}`);
        results.push({ stage, outcome: "failed", code: "OWNERSHIP_TEST_FAILED" });
      } catch (error: unknown) {
        if (error instanceof SupportDomainError && ["SERVICE_NOT_FOUND", "SERVICE_NOT_OWNED"].includes(error.code)) {
          results.push({ stage, outcome: "success", code: "FOREIGN_SERVICE_DENIED" });
        } else throw error;
      }
    }
  } catch (error: unknown) {
    results.push({ stage, outcome: "failed", code: error instanceof SupportDomainError ? error.code : "UPSTREAM_UNAVAILABLE" });
  }
  return results;
}
