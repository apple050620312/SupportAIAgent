/** Internal provider transport. Never expose this package as an agent tool. */
export class ProviderReadError extends Error {
  constructor(readonly reason: "configuration" | "transport" | "http" | "response" | "policy") {
    super(`Provider read failed (${reason})`);
    this.name = "ProviderReadError";
  }
}

export function httpsInstallationBase(value: string): URL {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
        /\.php\/?$/i.test(url.pathname)) throw new Error();
    url.pathname = `${url.pathname.replace(/\/+$/, "")}/`;
    return url;
  } catch { throw new ProviderReadError("configuration"); }
}

export function record(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ProviderReadError("response");
  }
  return value as Record<string, unknown>;
}

export function positiveId(value: unknown): string {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) return String(value);
  if (typeof value === "string" && /^[1-9][0-9]{0,15}$/.test(value) &&
      BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER)) return value;
  throw new ProviderReadError("response");
}

export function count(value: unknown): number {
  if (value === 0 || value === "0") return 0;
  return Number(positiveId(value));
}

export function safeLabel(value: unknown): string {
  if (typeof value !== "string" || value.length === 0 || value.length > 191 ||
      [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)) throw new ProviderReadError("response");
  return value;
}

export async function readJson(
  fetchImpl: typeof fetch, url: URL, init: RequestInit, allowNotFound = false
): Promise<unknown> {
  try {
    const response = await fetchImpl(url.href, {
      ...init, redirect: "error", signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok || response.redirected) {
      await response.body?.cancel().catch(() => undefined);
      if (response.status === 404 && !response.redirected && allowNotFound) return null;
      throw new ProviderReadError("http");
    }
    const mime = response.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
    if (!["application/json", "application/vnd.pterodactyl.v1+json"].includes(mime ?? "") ||
        response.body === null) {
      await response.body?.cancel().catch(() => undefined);
      throw new ProviderReadError("response");
    }
    const reader = (response.body as ReadableStream<Uint8Array>).getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let size = 0;
    let body = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 524_288) throw new ProviderReadError("response");
        body += decoder.decode(value, { stream: true });
      }
      return JSON.parse(body + decoder.decode()) as unknown;
    } finally {
      await reader.cancel().catch(() => undefined);
      reader.releaseLock();
    }
  } catch (error: unknown) {
    if (error instanceof ProviderReadError) throw error;
    // No request configuration, upstream body or credential-bearing cause retained.
    throw new ProviderReadError("transport");
  }
}
