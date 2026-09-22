import { Type } from "@sinclair/typebox";
import type { Static } from "@sinclair/typebox";

export const CustomerIdentitySchema = Type.Object(
  {
    customerRef: Type.String({ minLength: 1 }),
    displayName: Type.Optional(Type.String({ minLength: 1 }))
  },
  { additionalProperties: false }
);

export type CustomerIdentity = Static<typeof CustomerIdentitySchema>;
