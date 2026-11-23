import { isCanonicalDiscordSnowflake, type ActorContext, type CustomerIdentity, type HostingService, type HostingServiceStatus } from "@support-ai-agent/contracts";
import { count, positiveId, ProviderReadError, record, safeLabel } from "@support-ai-agent/provider-http";
import { whmcsCustomerId } from "./verified-customer-resolver.js";
import { WhmcsReadApi } from "./read-api.js";
import type { WhmcsAdapterConfig } from "./types.js";

interface Resolver { resolveActor(actor: ActorContext): Promise<CustomerIdentity | null>; }
const PAGE_SIZE = 50;
const MAX_SERVICES = 1_000;
const statuses: Readonly<Record<string, HostingServiceStatus>> = {
  Active: "active", Suspended: "suspended", Pending: "pending", Terminated: "terminated",
  Cancelled: "terminated", Fraud: "terminated"
};

export class WhmcsHostingServiceProvider {
  #api: WhmcsReadApi;
  constructor(config: WhmcsAdapterConfig, private readonly identities: Resolver, fetchImpl: typeof fetch = fetch) {
    this.#api = new WhmcsReadApi(config, fetchImpl);
  }

  async listForCustomer(customer: CustomerIdentity, actor: ActorContext): Promise<readonly HostingService[]> {
    if (!isCanonicalDiscordSnowflake(actor.actor.discordUserId)) throw new ProviderReadError("policy");
    const clientid = whmcsCustomerId(customer.customerRef);
    const services: HostingService[] = [];
    const seen = new Set<string>();
    let total: number | undefined;
    do {
      const response = await this.#api.read("GetClientsProducts", {
        clientid, limitstart: String(services.length), limitnum: String(PAGE_SIZE)
      });
      const nextTotal = count(response.totalresults);
      if (nextTotal > MAX_SERVICES || (total !== undefined && total !== nextTotal) ||
          count(response.startnumber) !== services.length || positiveId(response.clientid) !== clientid) {
        throw new ProviderReadError("response");
      }
      total = nextTotal;
      const rows = total === 0 && (response.products === "" || response.products === undefined)
        ? [] : record(response.products).product;
      if (!Array.isArray(rows) || count(response.numreturned) !== rows.length || rows.length > PAGE_SIZE ||
          (rows.length === 0 && services.length < total) || services.length + rows.length > total) {
        throw new ProviderReadError("response");
      }
      for (const row of rows as unknown[]) {
        const product = record(row);
        const id = positiveId(product.id);
        if (positiveId(product.clientid) !== clientid || seen.has(id)) throw new ProviderReadError("policy");
        seen.add(id);
        services.push({
          serviceRef: `whmcs-service:${id}`, customerRef: customer.customerRef,
          displayName: safeLabel(product.name),
          status: typeof product.status === "string" && Object.hasOwn(statuses, product.status)
            ? statuses[product.status]! : "unknown",
          ...(product.servername === "Pterodactyl" ? { runtimeProvider: "pterodactyl" as const } : {})
        });
      }
    } while (services.length < total);
    return services;
  }

  async findByReference(serviceRef: string, actor: ActorContext): Promise<HostingService | null> {
    if (!/^whmcs-service:[1-9][0-9]{0,15}$/.test(serviceRef)) throw new ProviderReadError("policy");
    positiveId(serviceRef.slice("whmcs-service:".length));
    const customer = await this.identities.resolveActor(actor);
    if (customer === null) return null;
    // Scope the entire lookup to the actor's resolved customer, never global service ID lookup.
    return (await this.listForCustomer(customer, actor)).find((service) => service.serviceRef === serviceRef) ?? null;
  }
}
