/** Synthetic offline harness. Never import this module from production packages. */
import type { TicketScope, TicketSnapshot, SupportAuditEvent } from "@support-ai-agent/contracts";
import { TicketContextTokens } from "@support-ai-agent/trusted-context";
import { TicketBridge, sameTicket, type TicketMessenger, type TicketStore } from "@support-ai-agent/ticket-bridge";
import { WhmcsCustomerIdentityResolver, VerifiedWhmcsCustomerResolver, WhmcsHostingServiceProvider } from "@support-ai-agent/whmcs";
import { PterodactylGameServerProvider } from "@support-ai-agent/pterodactyl";
import { createHostingTools } from "@support-ai-agent/openclaw-plugin";
import { buildApp } from "../../apps/support-core/dist/src/app.js";
import { HostingSupportService } from "../../apps/support-core/dist/src/services/hosting-support-service.js";
import { MutationApprovalStore } from "../../apps/support-core/dist/src/services/mutation-approval-store.js";
import { SupportKnowledgeService } from "../../apps/support-core/dist/src/services/support-knowledge-service.js";
import type { SupportKnowledgeProvider, InvoiceProvider, RedactedServerLogProvider } from "../../apps/support-core/dist/src/ports/index.js";

export const MOCK_SCOPE: TicketScope = {
  discordUserId: "18446744073709551615", guildId: "18446744073709551614", channelId: "18446744073709551613"
};
export const MOCK_OTHER_SCOPE: TicketScope = {
  discordUserId: "18446744073709551612", guildId: MOCK_SCOPE.guildId, channelId: "18446744073709551611"
};
const key = "synthetic-offline-context-key-not-for-deployment";
export const MOCK_ARTICLE_REF = `kb:${"a".repeat(64)}`;
const mockKnowledge: SupportKnowledgeProvider = {
  search: () => Promise.resolve({ trust: "reference_only", matches: [{ articleRef: MOCK_ARTICLE_REF,
    source: "synthetic/recovery.md", title: "Synthetic recovery", heading: "Verification", startLine: 1, endLine: 2,
    excerpt: "Query status and confirm the result with the customer." }] }),
  read: (request) => Promise.resolve(request.articleRef === MOCK_ARTICLE_REF ? { trust: "reference_only", articleRef: MOCK_ARTICLE_REF,
    source: "synthetic/recovery.md", title: "Synthetic recovery", content: "# Synthetic recovery\nQuery status and confirm the result with the customer.",
    startLine: 1, endLine: 2, totalLines: 2 } : null)
};
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

export function createMockSupport(audit?: { record(event: SupportAuditEvent): Promise<void> }, knowledgeProvider: SupportKnowledgeProvider = mockKnowledge, reads?: { invoices: InvoiceProvider; logs: RedactedServerLogProvider; invoiceRef: string }): MockSupportHarness {
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
    if (init?.method === "POST" && /\/api\/client\/servers\/00000000-0000-4000-8000-00000000000[12]\/power$/.test(parsed.pathname)) {
      const body = typeof init.body === "string" ? JSON.parse(init.body) as { signal?: string } : {};
      if (body.signal !== "restart") throw new Error("Unapproved power signal");
      return Promise.resolve(new Response(null, { status: 204 }));
    }
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
    if (/\/files\/list$/.test(parsed.pathname)) return Promise.resolve(json({ data: [{ attributes: { name: "config.yml", is_file: true } }] }));
    if (/\/files\/contents$/.test(parsed.pathname)) return Promise.resolve(new Response("safe synthetic content", { status: 200, headers: { "content-type": "text/plain" } }));
    if (/\/startup$/.test(parsed.pathname)) return Promise.resolve(json({ meta: { startup_command: "run", docker_images: { primary: "example/image:latest" } }, data: [{ attributes: { env_variable: "PORT", server_value: "25565", is_editable: true } }] }));
    throw new Error("Unapproved Pterodactyl read");
  };
  const identities = new VerifiedWhmcsCustomerResolver(new WhmcsCustomerIdentityResolver(whmcsConfig, whmcs), whmcsConfig, whmcs);
  const pteroProvider = new PterodactylGameServerProvider({ baseUrl: "https://panel.example.invalid/", applicationApiKey: "synthetic-application-key", clientApiKey: "synthetic-client-key", externalIdStrategy: "whmcs-service-id" }, ptero);
  const support = new HostingSupportService({ identityResolver: identities,
    hostingServices: new WhmcsHostingServiceProvider(whmcsConfig, identities, whmcs),
    gameServers: pteroProvider, gameServerMutations: pteroProvider,
    gameServerFiles: pteroProvider, ...(reads ? { invoices: reads.invoices, logs: reads.logs } : {}) });
  const approvals = new MutationApprovalStore();
  const app = buildApp({ logger: false, readOnly: { selectedResources: { serviceForTicket: (scope) => Promise.resolve(scope.discordUserId === MOCK_SCOPE.discordUserId ? "whmcs-service:1" : "whmcs-service:2"), invoiceForTicket: () => Promise.resolve(reads?.invoiceRef ?? null) }, invocationAudit: { append: () => Promise.resolve() },
    permissions: { grants: () => Promise.resolve(["customer:read", "server:read", "knowledge:read", "ticket:handoff", "server:restart", "server:propose", "server:mutate", ...(reads ? ["invoice:read" as const] : [])]),
      restartGate: () => Promise.resolve({ customerConfirmed: false, autonomousRecovery: true }) }, support, tokens, tickets: bridge, knowledge: new SupportKnowledgeService(knowledgeProvider), approvals, staffApprovalToken: "synthetic-staff-token", ...(audit ? { audit } : {}) } });
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
