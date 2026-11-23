import type { ActorContext, TicketScope } from "@support-ai-agent/contracts";

export const permissionMatrix = {
  get_invoice: { tier: "T0", scope: "invoice:read" },
  get_server_logs: { tier: "T0", scope: "server:read" },
  identify_customer: { tier: "T0", scope: "customer:read" },
  list_my_services: { tier: "T0", scope: "customer:read" },
  get_service_details: { tier: "T0", scope: "server:read" },
  list_my_servers: { tier: "T0", scope: "server:read" },
  get_my_server_status: { tier: "T0", scope: "server:read" },
  get_my_server_resources: { tier: "T0", scope: "server:read" },
  list_my_files: { tier: "T0", scope: "server:read" },
  read_my_file: { tier: "T0", scope: "server:read" },
  get_my_startup_config: { tier: "T0", scope: "server:read" },
  search_support_knowledge: { tier: "T0", scope: "knowledge:read" },
  read_support_article: { tier: "T0", scope: "knowledge:read" },
  handoff_to_staff: { tier: "T0", scope: "ticket:handoff" },
  restart_server: { tier: "T1", scope: "server:restart" },
  propose_mutation: { tier: "T2", scope: "server:propose" },
  execute_approved_mutation: { tier: "T2", scope: "server:mutate" }
} as const;
export type ToolName = keyof typeof permissionMatrix;
export type PermissionScope = typeof permissionMatrix[ToolName]["scope"];

/** Trusted adapter only. Never derive grants or confirmation from ticket/log/model text. */
export interface ToolPermissionProvider {
  grants(actor: ActorContext, ticket: TicketScope): Promise<readonly PermissionScope[]>;
  restartGate(actor: ActorContext, ticket: TicketScope, serviceRef: string): Promise<{
    /** Authenticated customer interaction in this channel, bound to this server. */
    customerConfirmed: boolean;
    /** Explicit operator-reviewed recovery exception; cooldown/state still apply. */
    autonomousRecovery: boolean;
  }>;
}

/** Exact transaction includes server mapping and customer resolved by Core, not the model. */
export interface ApprovalTransaction {
  readonly customerRef: string;
  readonly serverRef: string;
  readonly action: string;
  readonly amountMinor: number;
  readonly currency: string;
  readonly operationDigest: string;
}
export interface DurableHumanApprovalProvider {
  /** Atomically consume an unexpired, staff-approved, single-use receipt matching ALL fields.
   * Must survive process restart and validate ticket scope/revision. No retry after uncertainty.
   */
  consume(reference: string, transaction: ApprovalTransaction, scope: TicketScope, revision: number): Promise<boolean>;
}
export interface ToolInvocationAudit {
  /** Append-only protected staff sink; raw untrusted text/secrets are replaced with a digest. */
  append(event: Readonly<{
    invocationId: string;
    actor: string | null;
    customerRef: string | null;
    tool: ToolName;
    inputDigest: string;
    approvalReference: string | null;
    decision: "pending" | "allow" | "deny";
    outcome: "attempt" | "success" | "denied" | "failed";
  }>): Promise<void>;
}

/** Trusted ticket resource selection, separate from model arguments and chat text. */
export interface SelectedResourceProvider {
  serviceForTicket(scope: TicketScope): Promise<string | null>;
  invoiceForTicket(scope: TicketScope): Promise<string | null>;
}
