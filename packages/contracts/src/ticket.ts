import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const TicketScopeSchema = Type.Object({
  discordUserId: Type.String({ pattern: "^[1-9][0-9]{16,19}$" }),
  guildId: Type.String({ pattern: "^[1-9][0-9]{16,19}$" }),
  channelId: Type.String({ pattern: "^[1-9][0-9]{16,19}$" })
}, { additionalProperties: false });
export type TicketScope = Static<typeof TicketScopeSchema>;
export type TicketState = "AI_ACTIVE" | "WAITING_CUSTOMER" | "HUMAN_NEEDED" | "HUMAN_ACTIVE" | "CLOSED";
export interface TicketSnapshot {
  readonly scope: TicketScope;
  readonly state: TicketState;
  readonly revision: number;
}

export const HandoffRequestSchema = Type.Object({
  summary: Type.String({ minLength: 1, maxLength: 2000, pattern: "\\S" }),
  reason: Type.String({ minLength: 1, maxLength: 500, pattern: "\\S" }),
  attemptedSteps: Type.Array(Type.String({ minLength: 1, maxLength: 300, pattern: "\\S" }), { maxItems: 12 })
}, { additionalProperties: false });
export type HandoffRequest = Static<typeof HandoffRequestSchema>;
