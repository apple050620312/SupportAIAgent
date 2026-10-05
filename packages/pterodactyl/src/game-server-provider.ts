import { Value } from "@sinclair/typebox/value";
import {
  isCanonicalDiscordSnowflake, MutationOperationSchema,
  type ActorContext, type FileContentsResponse, type FileListResponse, type GameServer,
  type HostingService, type MutationOperation, type ServerResources, type ServerStatus, type StartupConfigResponse
} from "@openclaw-hosting/contracts";
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
const MAX_FILE_BYTES = 262_144;

function safePath(value: string): string {
  if (typeof value !== "string" || value.length < 1 || value.length > 512 || !value.startsWith("/") ||
      value.includes("\0") || value.includes("\r") || value.includes("\n") || value.split("/").some((part) => part === "..")) {
    throw new ProviderReadError("policy");
  }
  return value;
}

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
    this.validateServer(server, actor);
    if (!["running", "starting", "stopping"].includes(server.status)) throw new ProviderReadError("policy");
    await this.power(server, "restart");
  }

  async listFiles(server: GameServer, path: string, actor: ActorContext): Promise<FileListResponse> {
    this.validateServer(server, actor);
    const directory = safePath(path);
    const value = await readJson(this.#fetch, new URL(`api/client/servers/${this.uuid(server)}/files/list?directory=${encodeURIComponent(directory)}`, this.#base), {
      method: "GET", headers: this.headers(this.#clientKey)
    });
    const envelope = record(value);
    if (!Array.isArray(envelope.data) || envelope.data.length > 1000) throw new ProviderReadError("response");
    const entries = envelope.data.map((entry) => {
      const attributes = record(entry).attributes;
      const item = record(attributes);
      return { name: safeLabel(item.name), directory: item.is_file === true ? false : item.is_file === false ? true : (() => { throw new ProviderReadError("response"); })() };
    });
    return { path: directory, entries };
  }

  async readFile(server: GameServer, path: string, actor: ActorContext): Promise<FileContentsResponse> {
    this.validateServer(server, actor);
    const file = safePath(path);
    const response = await this.#fetch(new URL(`api/client/servers/${this.uuid(server)}/files/contents?file=${encodeURIComponent(file)}`, this.#base).href, {
      method: "GET", headers: { ...this.headers(this.#clientKey), accept: "text/plain" }, redirect: "error", signal: AbortSignal.timeout(10_000)
    });
    const content = await this.readText(response);
    return { path: file, content };
  }

  async getStartupConfig(server: GameServer, actor: ActorContext): Promise<StartupConfigResponse> {
    this.validateServer(server, actor);
    const value = record(await readJson(this.#fetch, new URL(`api/client/servers/${this.uuid(server)}/startup`, this.#base), {
      method: "GET", headers: this.headers(this.#clientKey)
    }));
    const meta = record(value.meta);
    const startupCommand = meta.startup_command;
    if (typeof startupCommand !== "string" || startupCommand.length > 4096) throw new ProviderReadError("response");
    const rawImages = meta.docker_images;
    const dockerImages = rawImages && typeof rawImages === "object" && !Array.isArray(rawImages)
      ? Object.values(rawImages).filter((item): item is string => typeof item === "string" && item.length <= 512)
      : [];
    if (!Array.isArray(value.data) || value.data.length > 256) throw new ProviderReadError("response");
    const variables = value.data.map((entry) => {
      const item = record(record(entry).attributes);
      if (typeof item.env_variable !== "string" || typeof item.server_value !== "string" ||
          typeof item.is_editable !== "boolean") throw new ProviderReadError("response");
      return { key: item.env_variable, value: item.server_value, editable: item.is_editable };
    });
    return { startupCommand, dockerImages, variables };
  }

  async execute(operation: MutationOperation, server: GameServer, actor: ActorContext): Promise<void> {
    this.validateServer(server, actor);
    if (!Value.Check(MutationOperationSchema, operation) || operation.serviceRef !== server.serviceRef) throw new ProviderReadError("policy");
    switch (operation.operation) {
      case "power":
        if (operation.action === "start" && server.status !== "offline") throw new ProviderReadError("policy");
        if (operation.action !== "start" && !["running", "starting", "stopping"].includes(server.status)) throw new ProviderReadError("policy");
        await this.power(server, operation.action); return;
      case "write_file":
        safePath(operation.path);
        await this.requestEmpty(new URL(`api/client/servers/${this.uuid(server)}/files/write?file=${encodeURIComponent(operation.path)}`, this.#base), {
          method: "POST", headers: { ...this.headers(this.#clientKey), "content-type": "text/plain" }, body: operation.content
        }); return;
      case "move_file":
        safePath(operation.from); safePath(operation.to);
        await this.requestEmpty(new URL(`api/client/servers/${this.uuid(server)}/files/rename`, this.#base), {
          method: "PUT", headers: { ...this.headers(this.#clientKey), "content-type": "application/json" },
          body: JSON.stringify({ root: "/", files: [{ from: operation.from, to: operation.to }] })
        }); return;
      case "update_startup_variable":
        await this.requestEmpty(new URL(`api/client/servers/${this.uuid(server)}/startup/variable`, this.#base), {
          method: "PUT", headers: { ...this.headers(this.#clientKey), "content-type": "application/json" },
          body: JSON.stringify({ key: operation.key, value: operation.value })
        }); return;
      case "update_docker_image":
        await this.requestEmpty(new URL(`api/client/servers/${this.uuid(server)}/settings/docker-image`, this.#base), {
          method: "PUT", headers: { ...this.headers(this.#clientKey), "content-type": "application/json" },
          body: JSON.stringify({ docker_image: operation.image })
        }); return;
      case "reinstall":
        await this.requestEmpty(new URL(`api/client/servers/${this.uuid(server)}/settings/reinstall`, this.#base), {
          method: "POST", headers: this.headers(this.#clientKey)
        }); return;
      case "suspend":
      case "unsuspend": {
        const applicationId = await this.applicationId(server);
        await this.requestEmpty(new URL(`api/application/servers/${applicationId}/${operation.operation}`, this.#base), {
          method: "POST", headers: this.headers(this.#applicationKey)
        }); return;
      }
    }
  }

  private validateServer(server: GameServer, actor: ActorContext): void {
    if (!isCanonicalDiscordSnowflake(actor.actor.discordUserId) || !server.serverRef.startsWith("pterodactyl:") ||
        !UUID.test(server.serverRef.slice("pterodactyl:".length)) || !server.serviceRef.startsWith("whmcs-service:")) {
      throw new ProviderReadError("policy");
    }
  }

  private uuid(server: GameServer): string { return server.serverRef.slice("pterodactyl:".length); }

  private async power(server: GameServer, signal: "start" | "stop" | "kill" | "restart"): Promise<void> {
    await this.requestEmpty(new URL(`api/client/servers/${this.uuid(server)}/power`, this.#base), {
      method: "POST", headers: { ...this.headers(this.#clientKey), "content-type": "application/json" }, body: JSON.stringify({ signal })
    });
  }

  private async applicationId(server: GameServer): Promise<string> {
    const externalId = positiveId(server.serviceRef.slice("whmcs-service:".length));
    const value = record(await readJson(this.#fetch, new URL(`api/application/servers/external/${externalId}`, this.#base), {
      method: "GET", headers: this.headers(this.#applicationKey)
    }));
    const attributes = record(value.attributes);
    if (value.object !== "server" || positiveId(attributes.external_id) !== externalId || attributes.uuid !== this.uuid(server)) throw new ProviderReadError("policy");
    return positiveId(attributes.id);
  }

  private async requestEmpty(url: URL, init: RequestInit): Promise<void> {
    const response = await this.#fetch(url.href, { ...init, redirect: "error", signal: AbortSignal.timeout(10_000) });
    await response.body?.cancel().catch(() => undefined);
    if (![200, 202, 204].includes(response.status) || response.redirected) throw new ProviderReadError("http");
  }

  private async readText(response: Response): Promise<string> {
    if (!response.ok || response.redirected || response.body === null) {
      await response.body?.cancel().catch(() => undefined); throw new ProviderReadError("http");
    }
    const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (mime !== "text/plain" && mime !== "application/octet-stream") {
      await response.body.cancel().catch(() => undefined); throw new ProviderReadError("response");
    }
    const reader = (response.body as ReadableStream<Uint8Array>).getReader(); const decoder = new TextDecoder("utf-8", { fatal: true });
    let body = ""; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength; if (size > MAX_FILE_BYTES) throw new ProviderReadError("response");
        body += decoder.decode(value, { stream: true });
      }
      return body + decoder.decode();
    } finally { await reader.cancel().catch(() => undefined); reader.releaseLock(); }
  }

  private headers(key: string): Record<string, string> {
    return { authorization: `Bearer ${key}`, accept: "application/vnd.pterodactyl.v1+json" };
  }
}
