import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const HostingServiceStatusSchema = Type.Union([
  Type.Literal("active"),
  Type.Literal("suspended"),
  Type.Literal("pending"),
  Type.Literal("terminated"),
  Type.Literal("unknown")
]);

export const HostingServiceSchema = Type.Object(
  {
    serviceRef: Type.String({ minLength: 1 }),
    customerRef: Type.String({ minLength: 1 }),
    displayName: Type.String({ minLength: 1 }),
    status: HostingServiceStatusSchema
  },
  { additionalProperties: false }
);

export type HostingServiceStatus = Static<typeof HostingServiceStatusSchema>;
export type HostingService = Static<typeof HostingServiceSchema>;
