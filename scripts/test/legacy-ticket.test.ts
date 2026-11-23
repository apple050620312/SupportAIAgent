import { describe, expect, it, vi } from "vitest";
import { LegacyTicketAdapter, legacyMongooseReader, installLegacyMutationGuard, TicketBridge } from "@support-ai-agent/ticket-bridge";
import { TicketContextTokens } from "@support-ai-agent/trusted-context";
import { MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

function setup() {
  const rows = new Map([MOCK_SCOPE, MOCK_OTHER_SCOPE].map((scope) => [scope.channelId, {
    guildId: scope.guildId, channelId: scope.channelId, userId: scope.discordUserId,
    closed: false, deleted: false, claimedBy: null as string | null
  }]));
  const send = vi.fn().mockResolvedValue(undefined);
  const adapter = new LegacyTicketAdapter({ readByChannel: (channelId) => Promise.resolve(rows.get(channelId) ?? null) }, { send });
  const model = { findOneAndUpdate: (channelId: string) => ({
    exec: () => { rows.get(channelId)!.closed = true; return Promise.resolve(null); }
  }) };
  const dispose = installLegacyMutationGuard(model, adapter);
  const bridge = new TicketBridge(adapter, adapter, new TicketContextTokens("synthetic-legacy-ticket-signing-key"));
  return { rows, send, adapter, model, dispose, bridge };
}

describe("unchanged ticket-main single-process adapter", () => {
  it("has no admission before explicit enable and loses admission on restart", async () => {
    const fixture = setup();
    expect(await fixture.adapter.read(MOCK_SCOPE)).toBeNull();
    await fixture.adapter.enable(MOCK_SCOPE);
    expect(await fixture.adapter.read(MOCK_SCOPE)).toMatchObject({ state: "AI_ACTIVE" });
    const restarted = new LegacyTicketAdapter({ readByChannel: () => Promise.resolve(fixture.rows.get(MOCK_SCOPE.channelId)) }, { send: fixture.send });
    expect(await restarted.read(MOCK_SCOPE)).toBeNull();
    await expect(restarted.enable(MOCK_SCOPE)).rejects.toThrow();
  });
  it.each(["closed", "deleted", "claimed", "owner", "guild"])("rejects baseline %s without sending", async (change) => {
    const fixture = setup();
    const snapshot = await fixture.adapter.enable(MOCK_SCOPE);
    const row = fixture.rows.get(MOCK_SCOPE.channelId)!;
    if (change === "closed") row.closed = true;
    if (change === "deleted") row.deleted = true;
    if (change === "claimed") row.claimedBy = MOCK_OTHER_SCOPE.discordUserId;
    if (change === "owner") row.userId = MOCK_OTHER_SCOPE.discordUserId;
    if (change === "guild") row.guildId = MOCK_OTHER_SCOPE.channelId;
    expect(await fixture.adapter.sendIfCurrent(snapshot, "Synthetic reply", { allowedMentions: [] })).toBe(false);
    expect(fixture.send).not.toHaveBeenCalled();
  });
  it("does not revive a session when the baseline row reopens", async () => {
    const fixture = setup();
    const snapshot = await fixture.adapter.enable(MOCK_SCOPE);
    fixture.rows.get(MOCK_SCOPE.channelId)!.closed = true;
    await fixture.adapter.read(MOCK_SCOPE);
    fixture.rows.get(MOCK_SCOPE.channelId)!.closed = false;
    expect(await fixture.adapter.read(MOCK_SCOPE)).toMatchObject({ state: "CLOSED" });
    const fresh = await fixture.adapter.enable(MOCK_SCOPE);
    expect(fresh.revision).toBeGreaterThan(snapshot.revision);
    expect(await fixture.adapter.sendIfCurrent(snapshot, "Old reply", { allowedMentions: [] })).toBe(false);
  });
  it("serializes lazy legacy mutation query execution against AI delivery", async () => {
    const fixture = setup();
    const snapshot = await fixture.adapter.enable(MOCK_SCOPE);
    const query = fixture.model.findOneAndUpdate(MOCK_SCOPE.channelId);
    expect(fixture.rows.get(MOCK_SCOPE.channelId)?.closed).toBe(false);
    await query.exec();
    expect(await fixture.adapter.sendIfCurrent(snapshot, "Do not send", { allowedMentions: [] })).toBe(false);
    expect(fixture.send).not.toHaveBeenCalled();
  });
  it("awaited Mongoose-style thenables execute the decorated guard", async () => {
    const fixture = setup();
    const snapshot = await fixture.adapter.enable(MOCK_SCOPE);
    const model = { findOneAndUpdate: () => ({
      exec: () => Promise.resolve("updated"),
      then(resolve: (value: string) => void) { return this.exec().then(resolve); }
    }) };
    fixture.dispose();
    installLegacyMutationGuard(model, fixture.adapter);
    await fixture.adapter.enable(MOCK_SCOPE);
    expect(await model.findOneAndUpdate()).toBe("updated");
    expect(await fixture.adapter.sendIfCurrent(snapshot, "Old reply", { allowedMentions: [] })).toBe(false);
  });
  it("retires all admitted tickets for broad legacy writes", async () => {
    const fixture = setup();
    await fixture.adapter.enable(MOCK_SCOPE); await fixture.adapter.enable(MOCK_OTHER_SCOPE);
    await fixture.adapter.guardLegacyMutation(() => Promise.resolve(undefined));
    expect(await fixture.adapter.read(MOCK_SCOPE)).toMatchObject({ state: "CLOSED" });
    expect(await fixture.adapter.read(MOCK_OTHER_SCOPE)).toMatchObject({ state: "CLOSED" });
  });
  it("deduplicates confirmed handoff chunks but refuses changed content", async () => {
    const fixture = setup(); await fixture.adapter.enable(MOCK_SCOPE);
    const request = { summary: "Synthetic issue", reason: "Needs staff", attemptedSteps: [] };
    await fixture.bridge.handoff(MOCK_SCOPE, request);
    await fixture.bridge.handoff(MOCK_SCOPE, request);
    expect(fixture.send).toHaveBeenCalledTimes(1);
    expect(fixture.send.mock.calls[0]?.[2]).toEqual({ allowedMentions: { parse: [] } });
    await expect(fixture.bridge.handoff(MOCK_SCOPE, { ...request, summary: "Changed issue" })).rejects.toThrow();
    expect(fixture.send).toHaveBeenCalledTimes(1);
  });
  it("never blindly retries uncertain Discord delivery", async () => {
    const fixture = setup(); await fixture.adapter.enable(MOCK_SCOPE);
    fixture.send.mockRejectedValueOnce(new Error("synthetic uncertainty"));
    const request = { summary: "Synthetic issue", reason: "Needs staff", attemptedSteps: [] };
    await expect(fixture.bridge.handoff(MOCK_SCOPE, request)).rejects.toThrow();
    await expect(fixture.bridge.handoff(MOCK_SCOPE, request)).rejects.toThrow();
    expect(fixture.send).toHaveBeenCalledTimes(1);
    expect(await fixture.adapter.read(MOCK_SCOPE)).toMatchObject({ state: "HUMAN_NEEDED" });
  });
  it("rejects duplicate installation and revokes admission on uninstall", async () => {
    const fixture = setup(); const old = await fixture.adapter.enable(MOCK_SCOPE);
    expect(() => installLegacyMutationGuard(fixture.model, fixture.adapter)).toThrow();
    fixture.dispose();
    expect(await fixture.adapter.read(MOCK_SCOPE)).toBeNull();
    installLegacyMutationGuard(fixture.model, fixture.adapter);
    await fixture.adapter.enable(MOCK_SCOPE);
    expect(await fixture.adapter.sendIfCurrent(old, "Do not revive", { allowedMentions: [] })).toBe(false);
  });
  it("queries only the channel and uses lean records without creating a DB client", async () => {
    const exec = vi.fn().mockResolvedValue(null);
    const findOne = vi.fn().mockReturnValue({ lean: () => ({ exec }) });
    expect(await legacyMongooseReader({ findOne }).readByChannel(MOCK_SCOPE.channelId)).toBeNull();
    expect(findOne).toHaveBeenCalledWith({ channelId: MOCK_SCOPE.channelId });
    expect(exec).toHaveBeenCalledTimes(1);
  });
  it("rejects numeric or out-of-range actor identity before reading a row", async () => {
    const fixture = setup();
    await expect(fixture.adapter.enable({ ...MOCK_SCOPE, discordUserId: "18446744073709551616" })).rejects.toThrow();
    expect(await fixture.adapter.read({ ...MOCK_SCOPE, discordUserId: MOCK_OTHER_SCOPE.discordUserId })).toBeNull();
  });
});
