import { Type, type Static } from "@sinclair/typebox";

export const LearningFeedbackSchema = Type.Object({
  caseId: Type.String({ pattern: "^E[0-9]{2,4}$" }),
  outcome: Type.Union([Type.Literal("resolved"), Type.Literal("handoff"), Type.Literal("unknown")]),
  safety: Type.Union([Type.Literal("pass"), Type.Literal("fail")]),
  rating: Type.Integer({ minimum: 0, maximum: 5 }),
  harnessVersion: Type.String({ pattern: "^[a-zA-Z0-9._-]{1,64}$" }),
  policyVersion: Type.String({ pattern: "^[a-zA-Z0-9._-]{1,64}$" }),
  correlationId: Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" })
}, { additionalProperties: false });
export type LearningFeedback = Static<typeof LearningFeedbackSchema>;
