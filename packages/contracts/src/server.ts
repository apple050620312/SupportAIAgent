import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const ServerStatusSchema = Type.Union([
  Type.Literal("running"),
  Type.Literal("offline"),
  Type.Literal("starting"),
  Type.Literal("stopping"),
  Type.Literal("unknown")
]);

export const ServerResourcesSchema = Type.Object(
  {
    memoryBytes: Type.Integer({ minimum: 0 }),
    memoryLimitBytes: Type.Optional(Type.Integer({ minimum: 0 })),
    cpuPercent: Type.Number({ minimum: 0 }),
    diskBytes: Type.Integer({ minimum: 0 }),
    diskLimitBytes: Type.Optional(Type.Integer({ minimum: 0 }))
  },
  { additionalProperties: false }
);

export const GameServerSchema = Type.Object(
  {
    serverRef: Type.String({ minLength: 1 }),
    serviceRef: Type.String({ minLength: 1 }),
    displayName: Type.String({ minLength: 1 }),
    status: ServerStatusSchema,
    resources: Type.Optional(ServerResourcesSchema)
  },
  { additionalProperties: false }
);

export type ServerStatus = Static<typeof ServerStatusSchema>;
export type ServerResources = Static<typeof ServerResourcesSchema>;
export type GameServer = Static<typeof GameServerSchema>;
