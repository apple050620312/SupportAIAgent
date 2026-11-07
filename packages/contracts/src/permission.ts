import { Type, type Static } from "@sinclair/typebox";

/** Model cannot choose a customer, service ID, invoice ID or server UUID. Trusted ticket selection supplies the resource. */
export const EmptyToolInputSchema = Type.Object({}, { additionalProperties: false });
export const OwnInvoiceSchema = Type.Object({
  status: Type.Union([Type.Literal("paid"), Type.Literal("unpaid"), Type.Literal("cancelled")]),
  amountMinor: Type.Integer({ minimum: 0 }), currency: Type.String({ pattern: "^[A-Z]{3}$" })
}, { additionalProperties: false });
export type OwnInvoice = Static<typeof OwnInvoiceSchema>;
export const RedactedServerLogsSchema = Type.Object({
  trust: Type.Literal("untrusted_data"), lines: Type.Array(Type.String({ maxLength: 512 }), { maxItems: 100 })
}, { additionalProperties: false });
export type RedactedServerLogs = Static<typeof RedactedServerLogsSchema>;
