import { randomUUID } from "node:crypto";
import { Type } from "@sinclair/typebox";
import type { FastifyInstance } from "fastify";
import {
  HandoffRequestSchema, PublicHostingServiceSchema, PublicGameServerSchema, ServiceSelectorSchema, ServerResourcesSchema, ServerStatusSchema,
  type ActorContext, type HandoffRequest, type TicketScope
} from "@openclaw-hosting/contracts";
import type { TicketContextTokens } from "@openclaw-hosting/trusted-context";
import type { TicketAccessProvider } from "../ports/index.js";
import type { HostingSupportService } from "../services/hosting-support-service.js";
import { SupportDomainError, UpstreamUnavailableError } from "../domain/errors.js";

export interface ReadOnlyDelivery {
  readonly support: HostingSupportService;
  readonly tokens: TicketContextTokens;
  readonly tickets: TicketAccessProvider;
}
const publicService = PublicHostingServiceSchema;
const publicServer = PublicGameServerSchema;
const selector = ServiceSelectorSchema;
const errorSchema = Type.Object({ code: Type.String(), message: Type.String() }, { additionalProperties: false });
const noQuery = Type.Object({}, { additionalProperties: false });
class TicketDeniedError extends Error {}

export function registerReadOnlyRoutes(app: FastifyInstance, delivery: ReadOnlyDelivery): void {
  const contexts = new WeakMap<object, { actor: ActorContext; scope: TicketScope }>();
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof TicketDeniedError) {
      return reply.code(403).send({ code: "TICKET_ACCESS_DENIED", message: "Ticket access denied" });
    }
    if (error instanceof SupportDomainError) {
      const status = error.code === "UPSTREAM_UNAVAILABLE" ? 503 : error.code === "SERVICE_NOT_OWNED" ? 403 : 404;
      return reply.code(status).send({ code: error.code, message: error.message });
    }
    if (typeof error === "object" && error !== null && "validation" in error) {
      return reply.code(400).send({ code: "INVALID_REQUEST", message: "Invalid support request" });
    }
    return reply.code(503).send({ code: "UPSTREAM_UNAVAILABLE", message: "Support operation unavailable" });
  });

  app.addHook("onRequest", async (request, reply) => {
    if (request.routeOptions.url === "/health") return;
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
  const errors = { 400: errorSchema, 401: errorSchema, 403: errorSchema, 404: errorSchema, 503: errorSchema };
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
  app.post<{ Body: HandoffRequest }>("/v1/me/handoff", {
    schema: { body: HandoffRequestSchema, querystring: noQuery, response: { 200: Type.Object({ requested: Type.Literal(true) }), ...errors } }
  }, async (request) => {
    try { await delivery.tickets.handoff(context(request).scope, request.body); }
    catch { throw new UpstreamUnavailableError("Ticket handoff provider"); }
    return { requested: true };
  });
}
