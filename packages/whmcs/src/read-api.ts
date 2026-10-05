import { httpsInstallationBase, ProviderReadError, readJson, record } from "@openclaw-hosting/provider-http";
import type { WhmcsAdapterConfig } from "./types.js";

/** Internal fixed read actions, not an agent-facing generic WHMCS client. */
export class WhmcsReadApi {
  #endpoint: URL;
  #identifier: string;
  #secret: string;
  #fetch: typeof fetch;

  constructor(config: WhmcsAdapterConfig, fetchImpl: typeof fetch) {
    this.#endpoint = new URL("includes/api.php", httpsInstallationBase(config.baseUrl));
    if (!config.apiIdentifier.trim() || !config.apiSecret.trim()) throw new ProviderReadError("configuration");
    this.#identifier = config.apiIdentifier;
    this.#secret = config.apiSecret;
    this.#fetch = fetchImpl;
  }

  async read(action: "GetClientsDetails" | "GetClientsProducts", parameters: Record<string, string>) {
    const body = new URLSearchParams({
      ...parameters, action, identifier: this.#identifier, secret: this.#secret, responsetype: "json"
    });
    const result = record(await readJson(this.#fetch, this.#endpoint, {
      method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body
    }));
    if (result.result !== "success") throw new ProviderReadError("response");
    return result;
  }
}
