import { createHash, randomUUID } from "node:crypto";
import type { MutationOperation, TicketScope } from "@support-ai-agent/contracts";

export type ApprovalState = "pending" | "approved" | "consumed" | "invalidated";
export interface MutationApproval {
  readonly approvalId: string;
  readonly binding?: { readonly customerRef: string; readonly serverRef: string };
  readonly operation: MutationOperation;
  readonly operationDigest: string;
  readonly scope: TicketScope;
  readonly ticketRevision: number;
  readonly expiresAt: number;
  state: ApprovalState;
}

function digest(operation: MutationOperation): string {
  return createHash("sha256").update(JSON.stringify(operation)).digest("hex");
}
function sameScope(a: TicketScope, b: TicketScope): boolean {
  return a.discordUserId === b.discordUserId && a.guildId === b.guildId && a.channelId === b.channelId;
}

/** Process-local prototype. Restart revokes all outstanding approvals by design. */
export class MutationApprovalStore {
  #entries = new Map<string, MutationApproval>();
  constructor(private readonly ttlMs = 5 * 60_000) {}

  propose(scope: TicketScope, ticketRevision: number, operation: MutationOperation, binding?: { customerRef: string; serverRef: string }): MutationApproval {
    const approval: MutationApproval = { approvalId: randomUUID(), operation: structuredClone(operation), operationDigest: digest(operation), scope: structuredClone(scope),
      ...(binding ? { binding: structuredClone(binding) } : {}),
      ticketRevision, expiresAt: Date.now() + this.ttlMs, state: "pending" };
    this.#entries.set(approval.approvalId, approval);
    return structuredClone(approval);
  }

  approve(approvalId: string): boolean {
    const entry = this.#entries.get(approvalId);
    if (!entry || entry.state !== "pending" || entry.expiresAt <= Date.now()) { if (entry) entry.state = "invalidated"; return false; }
    entry.state = "approved"; return true;
  }

  consume(approvalId: string, scope: TicketScope, ticketRevision: number): MutationApproval | null {
    const entry = this.#entries.get(approvalId);
    if (!entry || entry.state !== "approved" || entry.expiresAt <= Date.now() || entry.ticketRevision !== ticketRevision || !sameScope(entry.scope, scope)) {
      if (entry && entry.state !== "consumed") entry.state = "invalidated";
      return null;
    }
    entry.state = "consumed";
    return structuredClone(entry);
  }

  invalidateForTicket(scope: TicketScope): void {
    for (const entry of this.#entries.values()) if (sameScope(entry.scope, scope) && entry.state === "pending") entry.state = "invalidated";
  }
}
