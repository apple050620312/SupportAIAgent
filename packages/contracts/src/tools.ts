import { Type } from "@sinclair/typebox";
import { HostingServiceSchema } from "./service.js";
import { GameServerSchema, ServerResourcesSchema, ServerStatusSchema } from "./server.js";
import { HandoffRequestSchema } from "./ticket.js";

export const PublicHostingServiceSchema = Type.Omit(HostingServiceSchema, ["customerRef"]);
export const PublicGameServerSchema = Type.Omit(GameServerSchema, ["serverRef"]);
export const ServiceSelectorSchema = Type.Object({
  serviceRef: Type.String({ pattern: "^whmcs-service:[1-9][0-9]{0,15}$" })
}, { additionalProperties: false });
const noArguments = Type.Object({}, { additionalProperties: false });

export const HostingToolContracts = {
  identify_customer: { input: noArguments, output: Type.Object({ linked: Type.Literal(true) }, { additionalProperties: false }) },
  list_my_services: { input: noArguments, output: Type.Array(PublicHostingServiceSchema) },
  get_service_details: { input: ServiceSelectorSchema, output: PublicHostingServiceSchema },
  list_my_servers: { input: noArguments, output: Type.Array(PublicGameServerSchema) },
  get_my_server_status: { input: ServiceSelectorSchema, output: Type.Object({ serviceRef: Type.String(), status: ServerStatusSchema }, { additionalProperties: false }) },
  get_my_server_resources: { input: ServiceSelectorSchema, output: ServerResourcesSchema },
  handoff_to_staff: { input: HandoffRequestSchema, output: Type.Object({ requested: Type.Literal(true) }, { additionalProperties: false }) }
} as const;
export type HostingToolName = keyof typeof HostingToolContracts;
