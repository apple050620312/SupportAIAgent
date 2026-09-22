import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const SupportHandoffSchema = Type.Object(
  {
    correlationId: Type.String({ minLength: 1 }),
    summary: Type.String({ minLength: 1 }),
    reason: Type.String({ minLength: 1 }),
    attemptedSteps: Type.Array(Type.String({ minLength: 1 }))
  },
  { additionalProperties: false }
);

export type SupportHandoff = Static<typeof SupportHandoffSchema>;
