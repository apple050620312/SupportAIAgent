import { Type } from "@sinclair/typebox";
import Fastify from "fastify";

export interface BuildAppOptions {
  readonly logger?: boolean | { readonly level: string };
}

const HealthResponseSchema = Type.Object(
  { status: Type.Literal("ok") },
  { additionalProperties: false }
);

export function buildApp(options: BuildAppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? true,
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

  return app;
}
