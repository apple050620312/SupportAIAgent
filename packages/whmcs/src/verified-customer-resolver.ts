import type { ActorContext, CustomerIdentity } from "@support-ai-agent/contracts";
import { positiveId, ProviderReadError, record } from "@support-ai-agent/provider-http";
import type { WhmcsAdapterConfig } from "./types.js";
import { WhmcsReadApi } from "./read-api.js";

interface IdentityCandidateResolver {
  resolveActor(actor: ActorContext): Promise<CustomerIdentity | null>;
}

/** Provisional policy: only existing Active clients receive read-only support access. */
export class VerifiedWhmcsCustomerResolver {
  #api: WhmcsReadApi;
  constructor(
    private readonly candidates: IdentityCandidateResolver,
    config: WhmcsAdapterConfig,
    fetchImpl: typeof fetch = fetch
  ) { this.#api = new WhmcsReadApi(config, fetchImpl); }

  async resolveActor(actor: ActorContext): Promise<CustomerIdentity | null> {
    const customer = await this.candidates.resolveActor(actor);
    if (customer === null) return null;
    const id = whmcsCustomerId(customer.customerRef);
    const response = await this.#api.read("GetClientsDetails", { clientid: id });
    const client = record(response.client);
    if (positiveId(client.id) !== id || client.status !== "Active") throw new ProviderReadError("policy");
    for (const alias of ["client_id", "userid"]) {
      if (Object.hasOwn(client, alias) && positiveId(client[alias]) !== id) throw new ProviderReadError("response");
    }
    return { customerRef: customer.customerRef };
  }
}

export function whmcsCustomerId(customerRef: string): string {
  if (!customerRef.startsWith("whmcs:")) throw new ProviderReadError("policy");
  return positiveId(customerRef.slice("whmcs:".length));
}
