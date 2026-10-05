import { Type } from "@sinclair/typebox";
import { HostingServiceSchema } from "./service.js";
import { GameServerSchema, ServerResourcesSchema, ServerStatusSchema } from "./server.js";
import { HandoffRequestSchema } from "./ticket.js";
import {
  ExecuteMutationRequestSchema, ExecuteMutationResponseSchema, FileContentsResponseSchema, FileListResponseSchema,
  MutationOperationSchema, MutationProposalResponseSchema, RestartServerRequestSchema, RestartServerResponseSchema,
  StartupConfigResponseSchema
} from "./mutation.js";

export const PublicHostingServiceSchema = Type.Omit(HostingServiceSchema, ["customerRef"]);
export const PublicGameServerSchema = Type.Omit(GameServerSchema, ["serverRef"]);
export const ServiceSelectorSchema = Type.Object({
  serviceRef: Type.String({ pattern: "^whmcs-service:[1-9][0-9]{0,15}$" })
}, { additionalProperties: false });
const noArguments = Type.Object({}, { additionalProperties: false });
const serviceRef = Type.String({ pattern: "^whmcs-service:[1-9][0-9]{0,15}$" });

export const HostingToolContracts = {
  identify_customer: { input: noArguments, output: Type.Object({ linked: Type.Literal(true) }, { additionalProperties: false }) },
  list_my_services: { input: noArguments, output: Type.Array(PublicHostingServiceSchema) },
  get_service_details: { input: ServiceSelectorSchema, output: PublicHostingServiceSchema },
  list_my_servers: { input: noArguments, output: Type.Array(PublicGameServerSchema) },
  get_my_server_status: { input: ServiceSelectorSchema, output: Type.Object({ serviceRef: Type.String(), status: ServerStatusSchema }, { additionalProperties: false }) },
  get_my_server_resources: { input: ServiceSelectorSchema, output: ServerResourcesSchema },
  restart_my_server: { input: RestartServerRequestSchema, output: RestartServerResponseSchema },
  list_my_files: { input: Type.Object({ serviceRef, path: Type.Optional(Type.String({ minLength: 1, maxLength: 512 })) }, { additionalProperties: false }), output: FileListResponseSchema },
  read_my_file: { input: Type.Object({ serviceRef, path: Type.String({ minLength: 1, maxLength: 512 }) }, { additionalProperties: false }), output: FileContentsResponseSchema },
  get_my_startup_config: { input: ServiceSelectorSchema, output: StartupConfigResponseSchema },
  propose_mutation: { input: MutationOperationSchema, output: MutationProposalResponseSchema },
  execute_approved_mutation: { input: ExecuteMutationRequestSchema, output: ExecuteMutationResponseSchema },
  handoff_to_staff: { input: HandoffRequestSchema, output: Type.Object({ requested: Type.Literal(true) }, { additionalProperties: false }) }
} as const;
export type HostingToolName = keyof typeof HostingToolContracts;
