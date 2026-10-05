/** Synthetic offline harness. Never import this module from production packages. */
import type { TicketScope, TicketSnapshot, SupportAuditEvent } from "@openclaw-hosting/contracts";
import { TicketContextTokens } from "@openclaw-hosting/trusted-context";
import { TicketBridge, sameTicket, type TicketMessenger, type TicketStore } from "@openclaw-hosting/ticket-bridge";
import { WhmcsCustomerIdentityResolver, VerifiedWhmcsCustomerResolver, WhmcsHostingServiceProvider } from "@openclaw-hosting/whmcs";
import { PterodactylGameServerProvider } from "@openclaw-hosting/pterodactyl";
import { createHostingTools } from "@openclaw-hosting/openclaw-plugin";
import { buildApp } from "../../apps/support-core/dist/src/app.js";
import { HostingSupportService } from "../../apps/support-core/dist/src/services/hosting-support-service.js";

export const MOCK_SCOPE: TicketScope = {
  discordUserId: "18446744073709551615", guildId: "18446744073709551614", channelId: "18446744073709551613"
};
export const MOCK_OTHER_SCOPE: TicketScope = {
  discordUserId: "18446744073709551612", guildId: MOCK_SCOPE.guildId, channelId: "18446744073709551611"
};
const key = "synthetic-offline-context-key-not-for-deployment";
function json(value: unknown): Response {
  return new Response(JSON.stringify(value), { headers: { "content-type": "application/json" } });
}

export interface MockSupportHarness {
  readonly app: ReturnType<typeof buildApp>;
  readonly bridge: TicketBridge;
  readonly tokens: TicketContextTokens;
  readonly store: TicketStore;
  readonly messages: TicketMessenger;
  readonly snapshots: Map<string, TicketSnapshot>;
  readonly providerCalls: string[];
  readonly sent: { scope: TicketScope; text: string }[];
  toolsFor(scope: TicketScope): ReturnType<typeof createHostingTools>;
}

export function createMockSupport(audit?: { record(event: SupportAuditEvent): Promise<void> }): MockSupportHarness {
  const snapshots = new Map<string, TicketSnapshot>([MOCK_SCOPE, MOCK_OTHER_SCOPE].map((scope) => [scope.channelId, { scope, revision: 0, state: "AI_ACTIVE" }]));
  const sent: { scope: TicketScope; text: string }[] = [];
  const receipts = new Set<string>();
  const providerCalls: string[] = [];
  const store: TicketStore = {
    read: async (scope) => Promise.resolve(snapshots.get(scope.channelId) ?? null),
    compareAndSet: (snapshot, state) => {
      const current = snapshots.get(snapshot.scope.channelId);
      if (!current || !sameTicket(snapshot.scope, current.scope) || current.revision !== snapshot.revision || current.state !== snapshot.state) return Promise.resolve(false);
      snapshots.set(snapshot.scope.channelId, { ...current, state, revision: current.revision + 1 });
      return Promise.resolve(true);
    }
  };
  const messages: TicketMessenger = {
    send: (scope, text, options) => {
      if (options.allowedMentions.length !== 0) throw new Error("Mock forbids mentions");
      if (options.idempotencyKey && receipts.has(options.idempotencyKey)) return Promise.resolve();
      const current = snapshots.get(scope.channelId);
      if (!current || !sameTicket(current.scope, scope) || current.revision !== options.expectedSnapshot.revision ||
          current.state !== "HUMAN_NEEDED") throw new Error("Mock handoff authority changed");
      sent.push({ scope, text });
      if (options.idempotencyKey) receipts.add(options.idempotencyKey);
      return Promise.resolve();
    },
    sendIfCurrent: (snapshot, text, options) => {
      const current = snapshots.get(snapshot.scope.channelId);
      if (!current || current.revision !== snapshot.revision || !sameTicket(snapshot.scope, current.scope) ||
          !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(current.state) || options.allowedMentions.length !== 0) return Promise.resolve(false);
      sent.push({ scope: snapshot.scope, text });
      return Promise.resolve(true);
    }
  };
  const tokens = new TicketContextTokens(key);
  const bridge = new TicketBridge(store, messages, tokens);
  const whmcsConfig = { baseUrl: "https://whmcs.example.invalid/", apiIdentifier: "synthetic-identifier", apiSecret: "synthetic-secret" };
  const whmcs: typeof fetch = (_url, init) => {
    const body = init?.body as URLSearchParams;
    const action = body.get("action") ?? "";
    providerCalls.push(action);
    if (init?.method !== "POST") throw new Error("Unapproved method");
    if (action === "GetClientID") {
      const id = body.get("discordid");
      return Promise.resolve(json(id === MOCK_SCOPE.discordUserId || id === MOCK_OTHER_SCOPE.discordUserId
        ? { result: "success", clientid: id === MOCK_SCOPE.discordUserId ? 1 : 2 }
        : { result: "error" }));
    }
    const clientid = body.get("clientid");
    if (clientid !== "1" && clientid !== "2") throw new Error("Unapproved customer");
    if (action === "GetClientsDetails") return Promise.resolve(json({ result: "success", client: { id: clientid, status: "Active" } }));
    if (action === "GetClientsProducts") return Promise.resolve(json({ result: "success", clientid,
      totalresults: 1, startnumber: 0, numreturned: 1,
      products: { product: [{ id: clientid, clientid, name: "Synthetic service", status: "Active", servername: "Pterodactyl" }] } }));
    throw new Error("Unapproved WHMCS action");
  };
  const ptero: typeof fetch = (url, init) => {
    const parsed = new URL(typeof url === "string" ? url : url instanceof URL ? url.href : url.url);
    providerCalls.push(parsed.pathname);
    if (init?.method !== "GET") throw new Error("Unapproved method");
    const match = /^\/api\/application\/servers\/external\/([12])$/.exec(parsed.pathname);
    if (match) return Promise.resolve(json({ object: "server", attributes: {
      id: match[1], external_id: match[1], uuid: `00000000-0000-4000-8000-00000000000${match[1]}`,
      name: "Synthetic server", suspended: false, status: null, limits: { memory: 1024, disk: 2048 }
    } }));
    if (/^\/api\/client\/servers\/00000000-0000-4000-8000-00000000000[12]\/resources$/.test(parsed.pathname)) {
      return Promise.resolve(json({ object: "stats", attributes: { current_state: "running", is_suspended: false,
        resources: { memory_bytes: 1024, cpu_absolute: 10, disk_bytes: 2048 } } }));
    }
    throw new Error("Unapproved Pterodactyl read");
  };
  const identities = new VerifiedWhmcsCustomerResolver(new WhmcsCustomerIdentityResolver(whmcsConfig, whmcs), whmcsConfig, whmcs);
  const support = new HostingSupportService({ identityResolver: identities,
    hostingServices: new WhmcsHostingServiceProvider(whmcsConfig, identities, whmcs),
    gameServers: new PterodactylGameServerProvider({ baseUrl: "https://panel.example.invalid/", applicationApiKey: "synthetic-application-key", clientApiKey: "synthetic-client-key", externalIdStrategy: "whmcs-service-id" }, ptero) });
  const app = buildApp({ logger: false, readOnly: { support, tokens, tickets: bridge, ...(audit ? { audit } : {}) } });
  const coreFetch: typeof fetch = async (url, init) => {
    const parsed = new URL(typeof url === "string" ? url : url instanceof URL ? url.href : url.url);
    const response = await app.inject({
      method: init?.method === "POST" ? "POST" : "GET", url: parsed.pathname + parsed.search,
      headers: Object.fromEntries(new Headers(init?.headers)),
      ...(typeof init?.body === "string" ? { payload: init.body } : {})
    });
    return new Response(response.body, { status: response.statusCode, headers: { "content-type": "application/json" } });
  };
  function toolsFor(scope: TicketScope) {
    return createHostingTools("https://support.example.invalid/", {
      getTicketToken: () => bridge.contextForCustomer(scope),
      assertCurrent: () => {
        const snapshot = snapshots.get(scope.channelId);
        if (!snapshot || !sameTicket(snapshot.scope, scope) || !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(snapshot.state)) {
          throw new Error("Retired mock context");
        }
      }
    }, coreFetch);
  }
  return { app, bridge, tokens, store, messages, snapshots, providerCalls, sent, toolsFor };
}
