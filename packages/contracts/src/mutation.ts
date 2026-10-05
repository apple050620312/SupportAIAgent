import { Type, type Static } from "@sinclair/typebox";
export const RestartServerRequestSchema = Type.Object({
  serviceRef: Type.String({ pattern: "^whmcs-service:[1-9][0-9]{0,15}$" })
}, { additionalProperties: false });
export const RestartServerResponseSchema = Type.Object({
  requested: Type.Literal(true), operation: Type.Literal("restart_server")
}, { additionalProperties: false });
export type RestartServerRequest = Static<typeof RestartServerRequestSchema>;
export type RestartServerResponse = Static<typeof RestartServerResponseSchema>;
