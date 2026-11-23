import { describe, expect, it } from "vitest";
import type { MutationOperation, TicketScope } from "@support-ai-agent/contracts";
import { MutationApprovalStore } from "../src/services/mutation-approval-store.js";

const scope: TicketScope = { discordUserId: "18446744073709551615", guildId: "18446744073709551614", channelId: "18446744073709551613" };
const operation: MutationOperation = { operation: "power", serviceRef: "whmcs-service:1", action: "stop" };

describe("MutationApprovalStore", () => {
  it("binds approval to ticket scope and revision and consumes it once", () => {
    const store = new MutationApprovalStore();
    const proposal = store.propose(scope, 4, operation);
    expect(proposal.operationDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(store.approve(proposal.approvalId)).toBe(true);
    expect(store.consume(proposal.approvalId, { ...scope, channelId: "18446744073709551611" }, 4)).toBeNull();
    expect(store.consume(proposal.approvalId, scope, 3)).toBeNull();
    const second = store.propose(scope, 4, operation);
    expect(store.approve(second.approvalId)).toBe(true);
    expect(store.consume(second.approvalId, scope, 4)?.operation).toEqual(operation);
    expect(store.consume(second.approvalId, scope, 4)).toBeNull();
  });
  it("isolates the approved action/server from mutation of proposal inputs and outputs", () => {
    const store = new MutationApprovalStore();
    const input: MutationOperation = { operation: "power", serviceRef: "whmcs-service:1", action: "stop" };
    const proposal = store.propose(scope, 1, input);
    input.action = "kill";
    proposal.operation.serviceRef = "whmcs-service:2";
    store.approve(proposal.approvalId);
    expect(store.consume(proposal.approvalId, scope, 1)?.operation).toEqual({ operation: "power", serviceRef: "whmcs-service:1", action: "stop" });
  });
  it("rejects expired approvals", () => {
    const store = new MutationApprovalStore(0);
    const proposal = store.propose(scope, 1, operation);
    expect(store.approve(proposal.approvalId)).toBe(false);
  });
});
