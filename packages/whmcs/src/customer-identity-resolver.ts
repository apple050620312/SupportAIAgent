import {
  isCanonicalDiscordSnowflake,
  type ActorContext,
  type CustomerIdentity
} from "@openclaw-hosting/contracts";
import type { WhmcsAdapterConfig } from "./types.js";

const MAX_BODY_BYTES = 65_536;
const TIMEOUT_MS = 10_000;

export type WhmcsIdentityFailure = "configuration" | "actor" | "transport" |
  "http" | "response";

/** No raw upstream data or potentially credential-bearing cause is retained. */
export class WhmcsIdentityResolutionError extends Error {
  constructor(readonly reason: WhmcsIdentityFailure) {
    super(`WHMCS identity resolution failed (${reason})`);
    this.name = "WhmcsIdentityResolutionError";
  }
}

export type WhmcsIdentityFetch = typeof fetch;

function endpointFor(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== "https:" || url.username || url.password ||
        url.search || url.hash || /\.php\/?$/i.test(url.pathname)) {
      throw new Error();
    }
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/includes/api.php`;
    return url.href;
  } catch {
    throw new WhmcsIdentityResolutionError("configuration");
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const mediaType = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  if (mediaType !== "application/json" || response.body === null) {
    await response.body?.cancel().catch(() => undefined);
    throw new WhmcsIdentityResolutionError("response");
  }
  const stream = response.body as ReadableStream<Uint8Array>;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) throw new WhmcsIdentityResolutionError("response");
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

function customerFrom(response: unknown): CustomerIdentity {
  if (response === null || typeof response !== "object" || Array.isArray(response)) {
    throw new WhmcsIdentityResolutionError("response");
  }
  const fields = response as Record<string, unknown>;
  // Extra fields are uncharacterized, including possible ambiguity indicators.
  if (fields.result !== "success" ||
      Object.keys(fields).some((key) => key !== "result" && key !== "clientid")) {
    throw new WhmcsIdentityResolutionError("response");
  }
  const id = fields.clientid;
  let canonical: string;
  if (typeof id === "number" && Number.isSafeInteger(id) && id > 0) {
    canonical = String(id);
  } else if (typeof id === "string" && /^[1-9][0-9]{0,15}$/.test(id) &&
      BigInt(id) <= BigInt(Number.MAX_SAFE_INTEGER)) {
    canonical = id;
  } else {
    throw new WhmcsIdentityResolutionError("response");
  }
  return { customerRef: `whmcs:${canonical}` };
}

/**
 * Provisional read-only port implementation. Not wired into production startup.
 * A valid shape does not establish mapping uniqueness or client existence/status.
 * No error is interpreted as a verified not-linked outcome (null).
 */
export class WhmcsCustomerIdentityResolver {
  #endpoint: string;
  #identifier: string;
  #secret: string;
  #fetch: WhmcsIdentityFetch;

  constructor(config: WhmcsAdapterConfig, fetchImpl: WhmcsIdentityFetch = fetch) {
    this.#endpoint = endpointFor(config.baseUrl);
    if (!config.apiIdentifier?.trim() || !config.apiSecret?.trim()) {
      throw new WhmcsIdentityResolutionError("configuration");
    }
    this.#identifier = config.apiIdentifier;
    this.#secret = config.apiSecret;
    this.#fetch = fetchImpl;
  }

  async resolveActor(actorContext: ActorContext): Promise<CustomerIdentity> {
    const discordUserId = actorContext?.actor?.discordUserId;
    if (!isCanonicalDiscordSnowflake(discordUserId)) {
      throw new WhmcsIdentityResolutionError("actor");
    }
    const body = new URLSearchParams({
      action: "GetClientID",
      discordid: discordUserId,
      identifier: this.#identifier,
      secret: this.#secret,
      responsetype: "json"
    });
    try {
      const response = await this.#fetch(this.#endpoint, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
        redirect: "error",
        signal: AbortSignal.timeout(TIMEOUT_MS)
      });
      if (!response.ok || response.redirected) {
        await response.body?.cancel().catch(() => undefined);
        throw new WhmcsIdentityResolutionError("http");
      }
      let parsed: unknown;
      try {
        parsed = await readBoundedJson(response);
      } catch {
        throw new WhmcsIdentityResolutionError("response");
      }
      return customerFrom(parsed);
    } catch (error: unknown) {
      if (error instanceof WhmcsIdentityResolutionError) throw error;
      throw new WhmcsIdentityResolutionError("transport");
    }
  }
}
