import { describe, expect, it, vi } from "vitest";
import { LegacyTicketAdapter, TicketBridge, installLegacyMutationGuard, DiscordTicketSupport, createOpenClawTicketRunner, type TicketAgentRunner, type ShadowMode } from "@support-ai-agent/ticket-bridge";
import { TicketContextTokens } from "@support-ai-agent/trusted-context";
import { MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

function fixture(shadow?: ShadowMode) {
  const row = { guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId, userId: MOCK_SCOPE.discordUserId,
    closed: false, deleted: false, claimedBy: null };
  const reader = { readByChannel: () => Promise.resolve(row) };
  const send = vi.fn().mockResolvedValue(undefined);
  const adapter = new LegacyTicketAdapter(reader, { send });
  installLegacyMutationGuard({ findOneAndUpdate: () => ({ exec: () => Promise.resolve(undefined) }) }, adapter);
  const bridge = new TicketBridge(adapter, adapter, new TicketContextTokens("synthetic-discord-context-signing-key"));
  const run = vi.fn<TicketAgentRunner["run"]>().mockResolvedValue({ reply: "Synthetic support reply" });
  const controller = new DiscordTicketSupport(reader, adapter, bridge, { run }, new Set([MOCK_OTHER_SCOPE.discordUserId]), undefined, shadow ? { shadow } : {});
  const message = { guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId,
    author: { id: MOCK_SCOPE.discordUserId, bot: false }, content: "Synthetic question" };
  return { row, reader, send, adapter, bridge, run, controller, message };
}

describe("Discord ticket-main message ingress", () => {
  it("does nothing until the operator enables a channel", async () => {
    const f = fixture(); expect(await f.controller.receive(f.message)).toBe("ignored"); expect(f.run).not.toHaveBeenCalled();
  });
  it("derives actor from the legacy row and retains the session across customer turns", async () => {
    const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    expect(await f.controller.receive(f.message)).toBe("sent");
    expect(await f.controller.receive({ ...f.message, content: "Synthetic follow-up" })).toBe("sent");
    expect(f.run.mock.calls[0]?.[0].sessionId).toBe(f.run.mock.calls[1]?.[0].sessionId);
    expect(f.run.mock.calls[0]?.[0]).not.toHaveProperty("clientid");
    expect(await f.bridge.read(MOCK_SCOPE)).toMatchObject({ state: "WAITING_CUSTOMER" });
  });
  it.each(["bot", "guild", "guest"])("ignores %s without granting customer identity", async (kind) => {
    const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    const message = { ...f.message, author: { ...f.message.author } };
    if (kind === "bot") message.author.bot = true;
    if (kind === "guild") message.guildId = MOCK_OTHER_SCOPE.channelId;
    if (kind === "guest") message.author.id = "18446744073709551610";
    expect(await f.controller.receive(message)).toBe("ignored"); expect(f.run).not.toHaveBeenCalled();
  });
  it("aborts generation immediately on authorized staff takeover", async () => {
    const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    let finish!: (value: { reply: string }) => void;
    const started = new Promise<void>((resolve) => {
      f.run.mockImplementationOnce(() => { resolve(); return new Promise((done) => { finish = done; }); });
    });
    const pending = f.controller.receive(f.message); await started;
    expect(await f.controller.receive({ ...f.message, author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false } })).toBe("staff-takeover");
    expect(f.run.mock.calls[0]?.[1].aborted).toBe(true);
    finish({ reply: "Do not send this" }); expect(await pending).toBe("silenced"); expect(f.send).not.toHaveBeenCalled();
  });

  it("re-enters AI after a customer follow-up only when staff has been idle", async () => {
    vi.useFakeTimers();
    try {
      const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
      let finish!: (value: { reply: string }) => void;
      const started = new Promise<void>((resolve) => {
        f.run.mockImplementationOnce(() => { resolve(); return new Promise((done) => { finish = done; }); });
      });
      const first = f.controller.receive(f.message); await started;
      expect(await f.controller.receive({ ...f.message, author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false } })).toBe("staff-takeover");
      finish({ reply: "stale" }); await expect(first).resolves.toBe("silenced");

      f.run.mockResolvedValue({ reply: "Resumed support reply" });
      const followUp = f.controller.receive({ ...f.message, content: "Still waiting" });
      await vi.advanceTimersByTimeAsync(119_999);
      expect(f.run).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      await expect(followUp).resolves.toBe("sent");
      expect(f.run).toHaveBeenCalledTimes(2);
    } finally { vi.useRealTimers(); }
  });

  it("refreshes the human idle window when staff sends another message", async () => {
    vi.useFakeTimers();
    try {
      const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
      await f.controller.receive({ ...f.message, author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false } });
      f.run.mockResolvedValue({ reply: "Resumed support reply" });
      const followUp = f.controller.receive({ ...f.message, content: "Still waiting" });
      await vi.advanceTimersByTimeAsync(60_000);
      await f.controller.receive({ ...f.message, author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false }, content: "Staff is checking" });
      await vi.advanceTimersByTimeAsync(119_999);
      expect(f.run).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await expect(followUp).resolves.toBe("sent");
    } finally { vi.useRealTimers(); }
  });
  it("uses the configured human idle window instead of a fixed timeout", async () => {
    vi.useFakeTimers();
    try {
      const f = fixture();
      const configured = new DiscordTicketSupport(f.reader, f.adapter, f.bridge, { run: f.run }, new Set([MOCK_OTHER_SCOPE.discordUserId]), undefined, { humanIdleMs: 5_000 });
      await configured.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
      await configured.receive({ ...f.message, author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false } });
      f.run.mockResolvedValue({ reply: "Configured resume" });
      const followUp = configured.receive({ ...f.message, content: "Still waiting" });
      await vi.advanceTimersByTimeAsync(4_999);
      expect(f.run).not.toHaveBeenCalled();
      await vi.advanceTimersByTimeAsync(1);
      await expect(followUp).resolves.toBe("sent");
    } finally { vi.useRealTimers(); }
  });
  it("rejects old output after legacy close and reopen", async () => {
    const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    f.run.mockImplementationOnce(async () => {
      await f.adapter.guardLegacyMutation(() => { f.row.closed = true; return Promise.resolve(); });
      f.row.closed = false;
      return { reply: "Do not revive" };
    });
    expect(await f.controller.receive(f.message)).toBe("silenced"); expect(f.send).not.toHaveBeenCalled();
  });
  it("chunks long replies and stops between chunks if staff takes over", async () => {
    const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    f.run.mockResolvedValueOnce({ reply: "測".repeat(4000) });
    f.send.mockImplementationOnce(() => { void f.bridge.humanTakeover(MOCK_SCOPE); return Promise.resolve(); });
    expect(await f.controller.receive(f.message)).toBe("silenced");
    expect(f.send).toHaveBeenCalledTimes(1); expect(f.send.mock.calls[0]?.[1]).toHaveLength(1800);
  });
  it("hands off a failed run without repeating the model or provider work", async () => {
    const f = fixture(); await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    f.run.mockRejectedValueOnce(new Error("synthetic-private-runtime-detail"));
    expect(await f.controller.receive(f.message)).toBe("silenced");
    expect(f.run).toHaveBeenCalledTimes(1); expect(await f.bridge.read(MOCK_SCOPE)).toMatchObject({ state: "HUMAN_NEEDED" });
    expect(JSON.stringify(f.send.mock.calls)).not.toContain("synthetic-private-runtime-detail");
  });
});

describe("Discord shadow drafts", () => {
  function shadowFixture(allowed = true) {
    const threadId = "18446744073709551610";
    const discard = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const publish = vi.fn<Awaited<ReturnType<ShadowMode["openThread"]>>["publish"]>()
      .mockImplementation(async (_id, _text, assertCurrent) => { await assertCurrent(); return discard; });
    const openThread = vi.fn<ShadowMode["openThread"]>().mockResolvedValue({ id: threadId, publish });
    const recordVerdict = vi.fn<ShadowMode["recordVerdict"]>().mockResolvedValue(undefined);
    const f = fixture({ channelIds: new Set(allowed ? [MOCK_SCOPE.channelId] : []), openThread, recordVerdict });
    const staff = { ...f.message, author: { id: MOCK_OTHER_SCOPE.discordUserId, bot: false } };
    return { ...f, staff, threadId, discard, publish, openThread, recordVerdict };
  }

  it("rejects admission when the allowlist is empty", async () => {
    const f = shadowFixture(false);
    await expect(f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId)).rejects.toThrow();
    expect(await f.controller.receive(f.message)).toBe("ignored");
    expect(f.run).not.toHaveBeenCalled();
  });

  it.each([
    ["accept", "accepted-as-is"], ["edit Synthetic replacement", "accepted-with-edits"], ["reject", "rejected"]
  ])("records a private, authorized %s only once", async (command, verdict) => {
    const f = shadowFixture();
    await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    expect(await f.controller.receive(f.message)).toBe("drafted");
    const id = f.publish.mock.calls[0]?.[0];
    const content = `!draft ${id} ${command}`;
    expect(await f.controller.receive({ ...f.message, channelId: f.threadId, content })).toBe("ignored");
    const review = { ...f.staff, channelId: f.threadId, content };
    expect(await Promise.all([f.controller.receive(review), f.controller.receive(review)])).toEqual(["reviewed", "ignored"]);
    expect(f.recordVerdict.mock.calls[0]?.[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(f.recordVerdict).toHaveBeenCalledExactlyOnceWith({
      timestamp: f.recordVerdict.mock.calls[0]?.[0].timestamp,
      verdict, channelId: MOCK_SCOPE.channelId, staffId: f.staff.author.id
    });
    expect(f.send).not.toHaveBeenCalled();
  });

  it.each(["staff replies", "ticket closes"])("discards an unreviewed draft when %s", async (event) => {
    const f = shadowFixture();
    await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    expect(await f.controller.receive(f.message)).toBe("drafted");
    if (event === "staff replies") {
      expect(await f.controller.receive(f.staff)).toBe("staff-takeover");
      expect(await f.bridge.read(MOCK_SCOPE)).toMatchObject({ state: "HUMAN_ACTIVE" });
    } else {
      await f.adapter.guardLegacyMutation(() => { f.row.closed = true; return Promise.resolve(); });
    }
    expect(f.discard).toHaveBeenCalledOnce();
    const id = f.publish.mock.calls[0]?.[0];
    expect(await f.controller.receive({ ...f.staff, channelId: f.threadId, content: `!draft ${id} accept` })).toBe("ignored");
    expect(await f.controller.receive(f.message)).not.toBe("drafted");
    expect(f.run).toHaveBeenCalledOnce();
    expect(f.send).not.toHaveBeenCalled();
  });

  it("discards a draft if staff replies while Discord is publishing it", async () => {
    const f = shadowFixture();
    await f.controller.enableChannel(MOCK_SCOPE.guildId, MOCK_SCOPE.channelId);
    f.publish.mockImplementationOnce(async () => {
      await f.controller.receive(f.staff);
      return f.discard;
    });
    expect(await f.controller.receive(f.message)).toBe("silenced");
    expect(f.discard).toHaveBeenCalledOnce();
    expect(f.run.mock.calls[0]?.[1].aborted).toBe(true);
    expect(f.send).not.toHaveBeenCalled();
  });
});

describe("bot to OpenClaw native HTTP transport", () => {
  it("formulates the fixed request with body-only capsule and header-only Gateway auth", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response('{"reply":"Synthetic reply"}', { headers: { "content-type": "application/json" } }));
    const runner = createOpenClawTicketRunner("http://127.0.0.1:18789", "synthetic-gateway-key", fetchMock);
    const request = { sessionId: "synthetic-session", ticketToken: "synthetic-ticket-capsule", prompt: "Synthetic input" };
    expect(await runner.run(request, new AbortController().signal)).toEqual({ reply: "Synthetic reply" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://127.0.0.1:18789/hosting-support/turn");
    expect(init?.headers).toMatchObject({ authorization: "Bearer synthetic-gateway-key" });
    expect(JSON.parse(init?.body as string)).toEqual(request); expect(init?.redirect).toBe("error");
  });
  it.each([401, 403, 500])("does not retry HTTP %s or expose raw error", async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("synthetic-private-error", { status }));
    const runner = createOpenClawTicketRunner("https://gateway.example.invalid", "synthetic-key", fetchMock);
    await expect(runner.run({ sessionId: "synthetic", ticketToken: "synthetic", prompt: "Synthetic" }, new AbortController().signal)).rejects.toThrow("Ticket operation");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it("rejects remote HTTP and stops before network when cancelled", async () => {
    const fetchMock = vi.fn<typeof fetch>();
    expect(() => createOpenClawTicketRunner("http://remote.example.invalid", "synthetic", fetchMock)).toThrow();
    const controller = new AbortController(); controller.abort();
    await expect(createOpenClawTicketRunner("https://gateway.example.invalid", "synthetic", fetchMock)
      .run({ sessionId: "synthetic", ticketToken: "synthetic", prompt: "Synthetic" }, controller.signal)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
