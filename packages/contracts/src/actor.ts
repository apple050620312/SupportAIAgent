import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const DiscordActorSchema = Type.Object(
  {
    discordUserId: Type.String({ minLength: 1 }),
    displayName: Type.Optional(Type.String({ minLength: 1 }))
  },
  { additionalProperties: false }
);

export type DiscordActor = Static<typeof DiscordActorSchema>;

export const ActorContextSchema = Type.Object(
  {
    actor: DiscordActorSchema,
    correlationId: Type.String({ minLength: 1 })
  },
  { additionalProperties: false }
);

export type ActorContext = Static<typeof ActorContextSchema>;
