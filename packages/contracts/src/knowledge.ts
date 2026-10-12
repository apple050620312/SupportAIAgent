import { Type, type Static } from "@sinclair/typebox";

export const KnowledgeArticleRefSchema = Type.String({ pattern: "^kb:[0-9a-f]{64}$" });
export const KnowledgeSearchRequestSchema = Type.Object({
  query: Type.String({ minLength: 1, maxLength: 300, pattern: "\\S" }),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 8 }))
}, { additionalProperties: false });
export const KnowledgeReadRequestSchema = Type.Object({
  articleRef: KnowledgeArticleRefSchema,
  startLine: Type.Optional(Type.Integer({ minimum: 1, maximum: 1_000_000 })),
  maxLines: Type.Optional(Type.Integer({ minimum: 1, maximum: 120 }))
}, { additionalProperties: false });

const source = Type.String({ minLength: 1, maxLength: 512 });
export const KnowledgeSearchResponseSchema = Type.Object({
  trust: Type.Literal("reference_only"),
  matches: Type.Array(Type.Object({
    articleRef: KnowledgeArticleRefSchema, source,
    title: Type.String({ maxLength: 256 }), heading: Type.String({ maxLength: 256 }),
    startLine: Type.Integer({ minimum: 1 }), endLine: Type.Integer({ minimum: 1 }),
    excerpt: Type.String({ maxLength: 800 })
  }, { additionalProperties: false }), { maxItems: 8 })
}, { additionalProperties: false });
export const KnowledgeReadResponseSchema = Type.Object({
  trust: Type.Literal("reference_only"), articleRef: KnowledgeArticleRefSchema, source,
  title: Type.String({ maxLength: 256 }), content: Type.String({ maxLength: 24_000 }),
  startLine: Type.Integer({ minimum: 1 }), endLine: Type.Integer({ minimum: 1 }),
  totalLines: Type.Integer({ minimum: 1 }), nextLine: Type.Optional(Type.Integer({ minimum: 1 }))
}, { additionalProperties: false });
export type KnowledgeSearchRequest = Static<typeof KnowledgeSearchRequestSchema>;
export type KnowledgeSearchResponse = Static<typeof KnowledgeSearchResponseSchema>;
export type KnowledgeReadRequest = Static<typeof KnowledgeReadRequestSchema>;
export type KnowledgeReadResponse = Static<typeof KnowledgeReadResponseSchema>;
