import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  HandoffRequestSchema, PublicHostingServiceSchema, PublicGameServerSchema, ServiceSelectorSchema, ServerResourcesSchema, ServerStatusSchema,
  RestartServerResponseSchema,
  FileContentsResponseSchema, FileListResponseSchema, StartupConfigResponseSchema, MutationProposalResponseSchema, ExecuteMutationRequestSchema, ExecuteMutationResponseSchema,
  MutationOperationSchema
} from "@openclaw-hosting/contracts";
import type { ActorContext, HandoffRequest, TicketScope, MutationOperation, ExecuteMutationRequest, SupportAuditEvent } from "@openclaw-hosting/contracts";
import type { TicketContextTokens } from "@openclaw-hosting/trusted-context";
import type { TicketAccessProvider, SupportAuditRecorder } from "../ports/index.js";
import type { HostingSupportService } from "../services/hosting-support-service.js";
import { MutationNotAllowedError, SupportDomainError, UpstreamUnavailableError } from "../domain/errors.js";
import type { MutationApprovalStore } from "../services/mutation-approval-store.js";

export interface ReadOnlyDelivery {
  readonly support: HostingSupportService;
  readonly tokens: TicketContextTokens;
  readonly tickets: TicketAccessProvider;
  readonly audit?: SupportAuditRecorder;
  readonly approvals?: MutationApprovalStore;
  /** A separate trusted staff channel must call approve; models never receive this value. */
  readonly staffApprovalToken?: string;
}
const publicService = PublicHostingServiceSchema;
const publicServer = PublicGameServerSchema;
const selector = ServiceSelectorSchema;
const errorSchema = Type.Object({ code: Type.String(), message: Type.String() }, { additionalProperties: false });
const noQuery = Type.Object({}, { additionalProperties: false });
class TicketDeniedError extends Error {}

export function registerReadOnlyRoutes(app: FastifyInstance, delivery: ReadOnlyDelivery): void {
  const operations: Readonly<Record<string, SupportAuditEvent["operation"]>> = {
    "/v1/me/identity": "identify_customer", "/v1/me/services": "list_my_services",
    "/v1/me/services/:serviceRef": "get_service_details", "/v1/me/servers": "list_my_servers",
    "/v1/me/servers/:serviceRef/status": "get_my_server_status",
    "/v1/me/servers/:serviceRef/resources": "get_my_server_resources", "/v1/me/servers/:serviceRef/restart": "restart_server",
    "/v1/me/servers/:serviceRef/files": "list_my_files", "/v1/me/servers/:serviceRef/file": "read_my_file",
    "/v1/me/servers/:serviceRef/startup": "get_my_startup_config", "/v1/me/mutation-proposals": "propose_mutation",
    "/v1/me/mutation-executions": "execute_approved_mutation",
    "/v1/me/handoff": "handoff_to_staff"
  };
  app.addHook("onResponse", async (request, reply) => {
    const operation = operations[request.routeOptions.url ?? ""];
    if (!operation || !delivery.audit) return;
    try {
      await delivery.audit.record({ operation, correlationId: randomUUID(),
        outcome: reply.statusCode < 400 ? "success" : reply.statusCode < 500 ? "denied" : "failed" });
    } catch { app.log.warn("SUPPORT_AUDIT_UNAVAILABLE"); }
  });
  const contexts = new WeakMap<object, { actor: ActorContext; scope: TicketScope }>();
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof TicketDeniedError) {
      return reply.code(403).send({ code: "TICKET_ACCESS_DENIED", message: "Ticket access denied" });
    }
    if (error instanceof SupportDomainError) {
      const status = error.code === "UPSTREAM_UNAVAILABLE" ? 503 : error.code === "SERVICE_NOT_OWNED" || error.code === "MUTATION_NOT_ALLOWED" ? 403 : error.code === "MUTATION_RATE_LIMITED" ? 429 : 404;
      return reply.code(status).send({ code: error.code, message: error.message });
    }
    if (typeof error === "object" && error !== null && "validation" in error) {
      return reply.code(400).send({ code: "INVALID_REQUEST", message: "Invalid support request" });
    }
    return reply.code(503).send({ code: "UPSTREAM_UNAVAILABLE", message: "Support operation unavailable" });
  });

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.url === "/health") return;
    if (request.routeOptions.url?.startsWith("/v1/staff/")) return;
    const authorization = request.headers.authorization;
    let scope: TicketScope;
    try {
      if (!authorization?.startsWith("Bearer ")) throw new Error();
      scope = delivery.tokens.verify(authorization.slice(7));
    } catch {
      await reply.code(401).send({ code: "UNAUTHENTICATED", message: "Trusted ticket context required" });
      return;
    }
    let ticket;
    try { ticket = await delivery.tickets.read(scope); }
    catch { throw new UpstreamUnavailableError("Ticket access provider"); }
    if (!ticket || ticket.scope.discordUserId !== scope.discordUserId || ticket.scope.guildId !== scope.guildId ||
        ticket.scope.channelId !== scope.channelId || !(request.routeOptions.url === "/v1/me/handoff"
          ? ["AI_ACTIVE", "WAITING_CUSTOMER", "HUMAN_NEEDED"] : ["AI_ACTIVE", "WAITING_CUSTOMER"]).includes(ticket.state)) {
      throw new TicketDeniedError();
    }
    contexts.set(request, { scope, actor: { actor: { discordUserId: scope.discordUserId }, correlationId: randomUUID() } });
  });
  function context(request: object) {
    const result = contexts.get(request);
    if (!result) throw new TicketDeniedError();
    return result;
  }
  app.addHook("preSerialization", async (request, reply, payload) => {
    const established = contexts.get(request);
    if (!established || reply.statusCode >= 400 || request.routeOptions.url === "/v1/me/handoff") return payload;
    try { delivery.tokens.verify((request.headers.authorization ?? "").slice(7)); }
    catch { throw new TicketDeniedError(); }
    let current;
    try { current = await delivery.tickets.read(established.scope); }
    catch { throw new UpstreamUnavailableError("Ticket access provider"); }
    if (!current || current.scope.discordUserId !== established.scope.discordUserId ||
        current.scope.guildId !== established.scope.guildId || current.scope.channelId !== established.scope.channelId ||
        !["AI_ACTIVE", "WAITING_CUSTOMER"].includes(current.state)) throw new TicketDeniedError();
    return payload;
  });
  const errors = { 400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema, 429: errorSchema, 503: errorSchema };
  app.get("/v1/me/identity", { schema: { querystring: noQuery, response: { 200: Type.Object({ linked: Type.Literal(true) }), ...errors } } },
    async (request) => { await delivery.support.resolveCustomer(context(request).actor); return { linked: true }; });
  app.get("/v1/me/services", { schema: { querystring: noQuery, response: { 200: Type.Array(publicService), ...errors } } },
    async (request) => (await delivery.support.listMyServices(context(request).actor)).map((service) => ({
      serviceRef: service.serviceRef, displayName: service.displayName, status: service.status,
      ...(service.runtimeProvider ? { runtimeProvider: service.runtimeProvider } : {})
    })));
  app.get<{ Params: { serviceRef: string } }>("/v1/me/services/:serviceRef",
    { schema: { params: selector, querystring: noQuery, response: { 200: publicService, ...errors } } }, async (request) => {
      const service = await delivery.support.getMyService(context(request).actor, request.params.serviceRef);
      return { serviceRef: service.serviceRef, displayName: service.displayName, status: service.status,
        ...(service.runtimeProvider ? { runtimeProvider: service.runtimeProvider } : {}) };
    });
  app.get("/v1/me/servers", { schema: { querystring: noQuery, response: { 200: Type.Array(publicServer), ...errors } } },
    async (request) => (await delivery.support.listMyServers(context(request).actor)).map((server) => ({
      serviceRef: server.serviceRef, displayName: server.displayName, status: server.status,
      ...(server.resources ? { resources: server.resources } : {})
    })));
  app.get<{ Params: { serviceRef: string } }>("/v1/me/servers/:serviceRef/status", {
    schema: { params: selector, querystring: noQuery, response: { 200: Type.Object({ serviceRef: Type.String(), status: ServerStatusSchema }), ...errors } }
  }, async (request) => {
    const server = await delivery.support.getMyServer(context(request).actor, request.params.serviceRef);
    return { serviceRef: server.serviceRef, status: server.status };
  });
  app.get<{ Params: { serviceRef: string } }>("/v1/me/servers/:serviceRef/resources", {
    schema: { params: selector, querystring: noQuery, response: { 200: ServerResourcesSchema, ...errors } }
  }, async (request) => {
    const server = await delivery.support.getMyServer(context(request).actor, request.params.serviceRef);
    if (!server.resources) throw new UpstreamUnavailableError("Game server resources");
    return server.resources;
  });
  app.post<{ Params: { serviceRef: string } }>("/v1/me/servers/:serviceRef/restart", {
    schema: { params: selector, querystring: noQuery, body: noQuery, response: { 200: RestartServerResponseSchema, ...errors } }
  }, async (request) => {
    await delivery.support.restartMyServer(context(request).actor, request.params.serviceRef);
    return { requested: true, operation: "restart_server" as const };
  });
  app.get<{ Params: { serviceRef: string }; Querystring: { path?: string } }>("/v1/me/servers/:serviceRef/files", {
    schema: { params: selector, querystring: Type.Object({ path: Type.Optional(Type.String({ minLength: 1, maxLength: 512 })) }), response: { 200: FileListResponseSchema, ...errors } }
  }, async (request) => delivery.support.listMyFiles(context(request).actor, request.params.serviceRef, request.query.path ?? "/"));
  app.get<{ Params: { serviceRef: string }; Querystring: { path: string } }>("/v1/me/servers/:serviceRef/file", {
    schema: { params: selector, querystring: Type.Object({ path: Type.String({ minLength: 1, maxLength: 512 }) }), response: { 200: FileContentsResponseSchema, ...errors } }
  }, async (request) => delivery.support.readMyFile(context(request).actor, request.params.serviceRef, request.query.path));
  app.get<{ Params: { serviceRef: string } }>("/v1/me/servers/:serviceRef/startup", {
    schema: { params: selector, querystring: noQuery, response: { 200: StartupConfigResponseSchema, ...errors } }
  }, async (request) => delivery.support.getMyStartupConfig(context(request).actor, request.params.serviceRef));
  app.post<{ Body: MutationOperation }>("/v1/me/mutation-proposals", {
    schema: { body: MutationOperationSchema, querystring: noQuery, response: { 200: MutationProposalResponseSchema, ...errors } }
  }, async (request) => {
    if (!delivery.approvals) throw new UpstreamUnavailableError("Mutation approval store");
    const current = await delivery.tickets.read(context(request).scope);
    if (!current) throw new TicketDeniedError();
    const approval = delivery.approvals.propose(context(request).scope, current.revision, request.body);
    return { requested: true as const, approvalId: approval.approvalId, operationDigest: approval.operationDigest, expiresAt: approval.expiresAt };
  });
  app.post<{ Body: ExecuteMutationRequest }>("/v1/me/mutation-executions", {
    schema: { body: ExecuteMutationRequestSchema, querystring: noQuery, response: { 200: ExecuteMutationResponseSchema, ...errors } }
  }, async (request) => {
    if (!delivery.approvals) throw new UpstreamUnavailableError("Mutation approval store");
    const current = await delivery.tickets.read(context(request).scope);
    if (!current) throw new TicketDeniedError();
    const approval = delivery.approvals.consume(request.body.approvalId, context(request).scope, current.revision);
    if (!approval) throw new MutationNotAllowedError();
    await delivery.support.executeApprovedMutation(context(request).actor, approval.operation);
    return { executed: true as const, operation: approval.operation.operation };
  });
  app.post<{ Params: { approvalId: string } }>("/v1/staff/mutation-approvals/:approvalId/approve", {
    schema: { params: Type.Object({ approvalId: Type.String() }), response: { 200: Type.Object({ approved: Type.Literal(true) }), ...errors } }
  }, async (request, reply) => {
    if (!delivery.approvals || !delivery.staffApprovalToken || request.headers["x-staff-approval"] !== delivery.staffApprovalToken) return reply.code(403).send({ code: "TICKET_ACCESS_DENIED", message: "Staff approval required" });
    if (!delivery.approvals.approve(request.params.approvalId)) return reply.code(404).send({ code: "MUTATION_NOT_ALLOWED", message: "Approval is missing or expired" });
    return { approved: true as const };
  });
  app.post<{ Body: HandoffRequest }>("/v1/me/handoff", {
    schema: { body: HandoffRequestSchema, querystring: noQuery, response: { 200: Type.Object({ requested: Type.Literal(true) }), ...errors } }
  }, async (request) => {
    try { await delivery.tickets.handoff(context(request).scope, request.body); }
    catch { throw new UpstreamUnavailableError("Ticket handoff provider"); }
    return { requested: true };
  });
}
