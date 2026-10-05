import { describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { createSupportAuditRecorder, DiscordTicketSupport, installLegacyMutationGuard, LegacyTicketAdapter, TicketBridge } from "@openclaw-hosting/ticket-bridge";
import { TicketContextTokens } from "@openclaw-hosting/trusted-context";
import { privateDiscordAudit, type PrivateAuditChannel } from "../lib/discord-support-audit.js";
import { createMockSupport, MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";
import type { SupportAuditEvent } from "@openclaw-hosting/contracts";

const event = (): SupportAuditEvent => ({ operation: "identify_customer", outcome: "success", correlationId: randomUUID() });
function privateChannel() {
  const flags = (enabled: boolean) => ({ has: (_flag: bigint) => { void _flag; return enabled; } });
  const overwrites = [
    { id: MOCK_SCOPE.guildId, type: 0, allow: flags(false), deny: flags(true) },
    { id: MOCK_OTHER_SCOPE.discordUserId, type: 1, allow: flags(true), deny: flags(false) }
  ];
  const send = vi.fn<(options: { content: string; allowedMentions: { parse: string[] } }) => Promise<unknown>>().mockResolvedValue(undefined);
  const channel: PrivateAuditChannel = { id: MOCK_OTHER_SCOPE.channelId, guildId: MOCK_SCOPE.guildId, type: 0,
    permissionOverwrites: { cache: { values: () => overwrites.values() } }, send };
  return { channel, overwrites, flags, send };
}
describe("minimal staff-only support audit", () => {
  it("serializes only fixed metadata, refusing injected sensitive properties and operation names", async () => {
    const send = vi.fn<(text: string) => Promise<unknown>>().mockResolvedValue(undefined); const failure = vi.fn();
    const recorder = createSupportAuditRecorder(send, failure);
    const clean = event(); await recorder.record(clean);
    const payload = send.mock.calls[0]?.[0];
    if (!payload) throw new Error("missing audit payload");
    expect(JSON.parse(payload)).toEqual(clean);
    await recorder.record({ ...clean, token: "synthetic-secret", discordUserId: MOCK_SCOPE.discordUserId } as SupportAuditEvent);
    await recorder.record({ ...clean, operation: "synthetic-secret" } as unknown as SupportAuditEvent);
    expect(send).toHaveBeenCalledTimes(1); expect(failure).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(send.mock.calls)).not.toContain(MOCK_SCOPE.discordUserId);
  });
  it("discards raw failures and never retries uncertain delivery", async () => {
    const send = vi.fn().mockRejectedValue(new Error("synthetic-credential-and-customer-body")); const failure = vi.fn();
    await createSupportAuditRecorder(send, failure).record(event());
    expect(send).toHaveBeenCalledTimes(1); expect(failure.mock.calls).toEqual([["SUPPORT_AUDIT_UNAVAILABLE"]]);
  });
  it("bounds waiting and outstanding sends, retaining slots after a timeout", async () => {
    vi.useFakeTimers();
    try {
      const send = vi.fn(() => new Promise<unknown>(() => undefined)); const failure = vi.fn();
      const recorder = createSupportAuditRecorder(send, failure);
      const pending = Promise.all(Array.from({ length: 17 }, () => recorder.record(event())));
      await vi.advanceTimersByTimeAsync(2000); await pending;
      expect(send).toHaveBeenCalledTimes(16); expect(failure).toHaveBeenCalledTimes(17);
      await recorder.record(event()); expect(send).toHaveBeenCalledTimes(16);
    } finally { vi.useRealTimers(); }
  });
  it("accepts reviewed member-only channel and disables mentions", async () => {
    const f = privateChannel(); const failure = vi.fn();
    await privateDiscordAudit(f.channel, MOCK_SCOPE.guildId, f.channel.id,
      new Set([MOCK_OTHER_SCOPE.discordUserId]), MOCK_SCOPE.discordUserId, failure).record(event());
    const sent = f.send.mock.calls[0]?.[0];
    expect(typeof sent?.content).toBe("string");
    expect(sent?.allowedMentions).toEqual({ parse: [] });
    expect(failure).not.toHaveBeenCalled();
  });
  it.each(["public", "role", "outsider", "guild", "thread"])("rejects %s channel before sending", (kind) => {
    const f = privateChannel();
    if (kind === "public") f.overwrites[0]!.deny = f.flags(false);
    if (kind === "role") f.overwrites[1]!.type = 0;
    if (kind === "outsider") f.overwrites[1]!.id = MOCK_SCOPE.channelId;
    if (kind === "guild") f.channel.guildId = MOCK_OTHER_SCOPE.channelId;
    if (kind === "thread") f.channel.type = 11;
    expect(() => privateDiscordAudit(f.channel, MOCK_SCOPE.guildId, MOCK_OTHER_SCOPE.channelId,
      new Set([MOCK_OTHER_SCOPE.discordUserId]), MOCK_SCOPE.discordUserId, vi.fn())).toThrow();
    expect(f.send).not.toHaveBeenCalled();
  });
  it("rechecks cached privacy on send and fails with static metadata only", async () => {
    const f = privateChannel(); const failure = vi.fn();
    const recorder = privateDiscordAudit(f.channel, MOCK_SCOPE.guildId, f.channel.id,
      new Set([MOCK_OTHER_SCOPE.discordUserId]), MOCK_SCOPE.discordUserId, failure);
    f.overwrites[0]!.allow = f.flags(true); await recorder.record(event());
    expect(f.send).not.toHaveBeenCalled(); expect(failure).toHaveBeenCalledWith("SUPPORT_AUDIT_UNAVAILABLE");
  });
  it("records Core success/denial/upstream failure without request headers, selectors or bodies", async () => {
    const record = vi.fn().mockResolvedValue(undefined); const h = createMockSupport({ record });
    try {
      const token = await h.bridge.contextForCustomer(MOCK_SCOPE);
      expect((await h.app.inject({ url: "/v1/me/identity", headers: { authorization: `Bearer ${token}`, "x-correlation-id": "synthetic-secret" } })).statusCode).toBe(200);
      expect((await h.app.inject({ url: "/v1/me/services?clientid=synthetic-private-selector" })).statusCode).toBe(401);
      vi.spyOn(h.bridge, "handoff").mockRejectedValue(new Error("synthetic-sensitive-error"));
      expect((await h.app.inject({ method: "POST", url: "/v1/me/handoff", headers: { authorization: `Bearer ${token}` },
        payload: { summary: "synthetic-customer-text", reason: "synthetic-reason", attemptedSteps: [] } })).statusCode).toBe(503);
      const recorded = record.mock.calls.map((call) => call[0] as SupportAuditEvent);
      expect(recorded.map((value) => [value.operation, value.outcome])).toEqual([
        ["identify_customer", "success"], ["list_my_services", "denied"], ["handoff_to_staff", "failed"]
      ]);
      const serialized = JSON.stringify(record.mock.calls);
      for (const forbidden of [token, MOCK_SCOPE.discordUserId, "synthetic-secret", "synthetic-private-selector", "synthetic-customer-text", "synthetic-sensitive-error"]) expect(serialized).not.toContain(forbidden);
      await h.app.inject({ url: "/health" }); expect(record).toHaveBeenCalledTimes(3);
    } finally { await h.app.close(); }
  });
  it("audit failure never converts a rejected Core request to success", async () => {
    const h = createMockSupport({ record: vi.fn().mockRejectedValue(new Error("synthetic-secret")) });
    try { expect((await h.app.inject({ url: "/v1/me/identity" })).statusCode).toBe(401); }
    finally { await h.app.close(); }
  });
  it("records admission and staff takeover independently of customer text", async () => {
    const row = { guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId, userId: MOCK_SCOPE.discordUserId,
      closed: false, deleted: false, claimedBy: null };
    const reader = { readByChannel: () => Promise.resolve(row) }; const record = vi.fn().mockResolvedValue(undefined);
    const adapter = new LegacyTicketAdapter(reader, { send: vi.fn().mockResolvedValue(undefined) });
    const restore = installLegacyMutationGuard({ findOneAndUpdate: () => ({ exec: () => Promise.resolve() }) }, adapter);
    const bridge = new TicketBridge(adapter, adapter, new TicketContextTokens("synthetic-audit-context-key-at-least-32-bytes"));
    const controller = new DiscordTicketSupport(reader, adapter, bridge, { run: vi.fn() }, new Set([MOCK_OTHER_SCOPE.discordUserId]), { record });
    await controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    await controller.receive({ guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId,
      author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false }, content: "synthetic-staff-text" });
    const recorded = record.mock.calls.map((call) => call[0] as SupportAuditEvent);
    expect(recorded.map((value) => value.operation)).toContain("human_takeover");
    expect(recorded[0]!.operation).toBe("ticket_admitted");
    expect(JSON.stringify(record.mock.calls)).not.toContain("synthetic-staff-text");
    controller.dispose(); restore();
  });
});
