import { createHmac, timingSafeEqual } from "node:crypto";
import { Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { isCanonicalDiscordSnowflake, TicketScopeSchema, type TicketScope } from "@support-ai-agent/contracts";

const ClaimSchema = Type.Object({
  audience: Type.Literal("hosting-support-core"), scope: TicketScopeSchema,
  issuedAt: Type.Integer({ minimum: 0 }), expiresAt: Type.Integer({ minimum: 0 })
}, { additionalProperties: false });

export class InvalidTicketContextError extends Error {
  constructor() { super("Invalid or expired trusted ticket context"); this.name = "InvalidTicketContextError"; }
}

/** Signing key belongs only to the trusted Ticket Bot and Support Core, never the model. */
export class TicketContextTokens {
  #key: string;
  constructor(key: string, private readonly now: () => number = () => Math.floor(Date.now() / 1000)) {
    if (key.length < 32) throw new InvalidTicketContextError();
    this.#key = key;
  }

  issue(scope: TicketScope): string {
    if (!Value.Check(TicketScopeSchema, scope) || !Object.values(scope).every(isCanonicalDiscordSnowflake)) {
      throw new InvalidTicketContextError();
    }
    const issuedAt = this.now();
    const encoded = Buffer.from(JSON.stringify({
      audience: "hosting-support-core", scope, issuedAt, expiresAt: issuedAt + 60
    })).toString("base64url");
    return `${encoded}.${createHmac("sha256", this.#key).update(encoded).digest("base64url")}`;
  }

  verify(token: string): TicketScope {
    return this.verifyContext(token).scope;
  }

  verifyContext(token: string): { scope: TicketScope; expiresAtMs: number } {
    try {
      if (token.length > 2048 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(token)) throw new Error();
      const [encoded, signature] = token.split(".");
      if (!encoded || !signature) throw new Error();
      const expected = createHmac("sha256", this.#key).update(encoded).digest();
      const supplied = Buffer.from(signature, "base64url");
      if (supplied.toString("base64url") !== signature || supplied.length !== expected.length ||
          !timingSafeEqual(expected, supplied)) throw new Error();
      const bytes = Buffer.from(encoded, "base64url");
      if (bytes.toString("base64url") !== encoded) throw new Error();
      const parsed: unknown = JSON.parse(bytes.toString("utf8"));
      if (!Value.Check(ClaimSchema, parsed)) throw new Error();
      const now = this.now();
      if (parsed.issuedAt > now || parsed.expiresAt <= now || parsed.expiresAt !== parsed.issuedAt + 60 ||
          !Object.values(parsed.scope).every(isCanonicalDiscordSnowflake)) throw new Error();
      return { scope: { ...parsed.scope }, expiresAtMs: parsed.expiresAt * 1000 };
    } catch { throw new InvalidTicketContextError(); }
  }
}
