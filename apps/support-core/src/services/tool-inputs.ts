import { z } from "zod";
import { Value } from "@sinclair/typebox/value";
import { MutationOperationSchema, HandoffRequestSchema, KnowledgeSearchRequestSchema, KnowledgeReadRequestSchema } from "@openclaw-hosting/contracts";
import type { ToolName } from "./permission-matrix.js";

const empty = z.strictObject({});
const service = z.strictObject({ serviceRef: z.string().regex(/^whmcs-service:[1-9][0-9]{0,15}$/) });
const path = z.string().min(1).max(512);
/** Zod is local to delivery policy. Shared contracts remain pure TypeBox. */
export const toolInputs: Record<ToolName, z.ZodType> = {
  identify_customer: empty,
  list_my_services: empty,
  get_service_details: service,
  list_my_servers: empty,
  get_my_server_status: service,
  get_my_server_resources: service,
  restart_server: service,
  list_my_files: service.extend({ path: path.optional() }),
  read_my_file: service.extend({ path }),
  get_my_startup_config: service,
  get_invoice: empty,
  get_server_logs: empty,
  // Preserve the existing discriminated fixed-field contracts without a second divergent definition.
  propose_mutation: z.custom((input) => Value.Check(MutationOperationSchema, input)),
  execute_approved_mutation: z.strictObject({ approvalId: z.uuid() }),
  handoff_to_staff: z.custom((input) => Value.Check(HandoffRequestSchema, input)),
  search_support_knowledge: z.custom((input) => Value.Check(KnowledgeSearchRequestSchema, input)),
  read_support_article: z.custom((input) => Value.Check(KnowledgeReadRequestSchema, input))
};
