import { Type, type Static } from "@sinclair/typebox";

/** No customer selectors, actor IDs, text, tokens, provider payloads or raw errors. */
export const SupportAuditEventSchema = Type.Object({
  operation: Type.Union([
    Type.Literal("identify_customer"), Type.Literal("list_my_services"), Type.Literal("get_service_details"),
    Type.Literal("list_my_servers"), Type.Literal("get_my_server_status"), Type.Literal("get_my_server_resources"),
    Type.Literal("handoff_to_staff"), Type.Literal("ticket_admitted"), Type.Literal("human_takeover"),
    Type.Literal("ticket_retired"), Type.Literal("agent_turn"), Type.Literal("restart_server"),
    Type.Literal("list_my_files"), Type.Literal("read_my_file"), Type.Literal("get_my_startup_config"),
    Type.Literal("propose_mutation"), Type.Literal("execute_approved_mutation")
  ]),
  outcome: Type.Union([Type.Literal("success"), Type.Literal("denied"), Type.Literal("failed")]),
  correlationId: Type.String({ pattern: "^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$" })
}, { additionalProperties: false });
export type SupportAuditEvent = Static<typeof SupportAuditEventSchema>;
