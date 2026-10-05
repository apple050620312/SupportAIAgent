import { Type } from "@sinclair/typebox";
import Fastify from "fastify";
import { registerReadOnlyRoutes, type ReadOnlyDelivery } from "./delivery/read-only-routes.js";

export interface BuildAppOptions {
  readonly logger?: boolean | { readonly level: string };
  readonly readOnly?: ReadOnlyDelivery;
}

const HealthResponseSchema = Type.Object(
  { status: Type.Literal("ok") },
  { additionalProperties: false }
);

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    logger: options.logger === false ? false : {
      level: typeof options.logger === "object" ? options.logger.level : "info",
      redact: ["req.headers.authorization"],
      serializers: { req: (request: { method: string }) => ({ method: request.method }) }
    },
    requestIdHeader: "x-correlation-id"
  });

  app.get(
    "/health",
    {
      schema: {
        response: { 200: HealthResponseSchema }
      }
    },
    () => ({ status: "ok" as const })
  );

  if (options.readOnly) registerReadOnlyRoutes(app, options.readOnly);
  return app;
}
