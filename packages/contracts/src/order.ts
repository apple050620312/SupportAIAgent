import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

// A deliberately small normalized shape; order policy is outside Task 1.
export const HostingOrderSchema = Type.Object(
  {
    orderRef: Type.String({ minLength: 1 }),
    status: Type.Union([
      Type.Literal("pending"),
      Type.Literal("accepted"),
      Type.Literal("cancelled"),
      Type.Literal("unknown")
    ])
  },
  { additionalProperties: false }
);

export type HostingOrder = Static<typeof HostingOrderSchema>;
