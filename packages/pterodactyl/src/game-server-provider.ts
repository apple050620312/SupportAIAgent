import { isCanonicalDiscordSnowflake, type ActorContext, type GameServer, type HostingService, type ServerResources, type ServerStatus } from "@openclaw-hosting/contracts";
import { count, httpsInstallationBase, positiveId, ProviderReadError, readJson, record, safeLabel } from "@openclaw-hosting/provider-http";

export interface ReadOnlyPterodactylConfig {
  readonly baseUrl: string;
  readonly applicationApiKey: string;
  readonly clientApiKey: string;
  /** Operator must confirm this deployed WHMCS module convention before enabling. */
  readonly externalIdStrategy: "whmcs-service-id";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const states: Readonly<Record<string, ServerStatus>> = {
  running: "running", offline: "offline", stopped: "offline", starting: "starting", stopping: "stopping"
};

function nonnegative(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) throw new ProviderReadError("response");
  return value;
}

function limitBytes(value: unknown): number | undefined {
  const bytes = count(value) * 1_048_576;
  if (!Number.isSafeInteger(bytes)) throw new ProviderReadError("response");
  return bytes === 0 ? undefined : bytes;
}

/** Read-only adapter for the verified Pterodactyl 1.15.1 API routes. */
export class PterodactylGameServerProvider {
  #base: URL;
  #applicationKey: string;
  #clientKey: string;
  #fetch: typeof fetch;
  constructor(config: ReadOnlyPterodactylConfig, fetchImpl: typeof fetch = fetch) {
    this.#base = httpsInstallationBase(config.baseUrl);
    if (!config.applicationApiKey.trim() || !config.clientApiKey.trim() ||
        config.externalIdStrategy !== "whmcs-service-id") throw new ProviderReadError("configuration");
    this.#applicationKey = config.applicationApiKey;
    this.#clientKey = config.clientApiKey;
    this.#fetch = fetchImpl;
  }

  async findForOwnedService(service: HostingService, actor: ActorContext): Promise<GameServer | null> {
    if (!isCanonicalDiscordSnowflake(actor.actor.discordUserId)) throw new ProviderReadError("policy");
    if (service.runtimeProvider !== "pterodactyl" || service.status !== "active") return null;
    if (!service.serviceRef.startsWith("whmcs-service:")) throw new ProviderReadError("policy");
    const externalId = positiveId(service.serviceRef.slice("whmcs-service:".length));
    const mapping = await readJson(this.#fetch,
      new URL(`api/application/servers/external/${externalId}`, this.#base), {
        method: "GET", headers: this.headers(this.#applicationKey)
      }, true);
    if (mapping === null) return null;
    const envelope = record(mapping);
    if (envelope.object !== "server") throw new ProviderReadError("response");
    const attributes = record(envelope.attributes);
    const uuid = attributes.uuid;
    if (positiveId(attributes.external_id) !== externalId || typeof uuid !== "string" || !UUID.test(uuid) ||
        attributes.suspended !== false || (attributes.status !== null && attributes.status !== undefined)) {
      throw new ProviderReadError("policy");
    }
    positiveId(attributes.id);
    const limits = record(attributes.limits);
    const memoryLimitBytes = limitBytes(limits.memory);
    const diskLimitBytes = limitBytes(limits.disk);
    const statsEnvelope = record(await readJson(this.#fetch,
      new URL(`api/client/servers/${uuid}/resources`, this.#base), {
        method: "GET", headers: this.headers(this.#clientKey)
      }));
    if (statsEnvelope.object !== "stats") throw new ProviderReadError("response");
    const stats = record(statsEnvelope.attributes);
    if (stats.is_suspended !== false || typeof stats.current_state !== "string") throw new ProviderReadError("policy");
    const raw = record(stats.resources);
    const resources: ServerResources = {
      memoryBytes: count(raw.memory_bytes), cpuPercent: nonnegative(raw.cpu_absolute), diskBytes: count(raw.disk_bytes),
      ...(memoryLimitBytes === undefined ? {} : { memoryLimitBytes }),
      ...(diskLimitBytes === undefined ? {} : { diskLimitBytes })
    };
    return {
      serverRef: `pterodactyl:${uuid}`, serviceRef: service.serviceRef,
      displayName: safeLabel(attributes.name),
      status: Object.hasOwn(states, stats.current_state) ? states[stats.current_state]! : "unknown", resources
    };
  }

  /** Reversible client operation. Core must resolve the server from the owned service first. */
  async restart(server: GameServer, actor: ActorContext): Promise<void> {
    if (!isCanonicalDiscordSnowflake(actor.actor.discordUserId) ||
        !server.serverRef.startsWith("pterodactyl:") ||
        !UUID.test(server.serverRef.slice("pterodactyl:".length)) ||
        !server.serviceRef.startsWith("whmcs-service:") ||
        !["running", "starting", "stopping"].includes(server.status)) throw new ProviderReadError("policy");
    const response = await this.#fetch(new URL(`api/client/servers/${server.serverRef.slice("pterodactyl:".length)}/power`, this.#base).href, {
      method: "POST", headers: { ...this.headers(this.#clientKey), "content-type": "application/json" },
      body: JSON.stringify({ signal: "restart" }), redirect: "error", signal: AbortSignal.timeout(10_000)
    });
    await response.body?.cancel().catch(() => undefined);
    if (![200, 202, 204].includes(response.status) || response.redirected) throw new ProviderReadError("http");
  }

  private headers(key: string): Record<string, string> {
    return { authorization: `Bearer ${key}`, accept: "application/vnd.pterodactyl.v1+json" };
  }
}
