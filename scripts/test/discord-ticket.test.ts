import { describe, expect, it, vi } from "vitest";
import { LegacyTicketAdapter, TicketBridge, installLegacyMutationGuard, DiscordTicketSupport, createOpenClawTicketRunner, type TicketAgentRunner } from "@openclaw-hosting/ticket-bridge";
import { TicketContextTokens } from "@openclaw-hosting/trusted-context";
import { MOCK_SCOPE, MOCK_OTHER_SCOPE } from "../lib/mock-support.js";

function fixture() {
  const row = { guildId: MOCK_SCOPE.guildId, channelId: MOCK_SCOPE.channelId, userId: MOCK_SCOPE.discordUserId,
    closed: false, deleted: false, claimedBy: null };
  const reader = { readByChannel: () => Promise.resolve(row) };
  const send = vi.fn().mockResolvedValue(undefined);
  const adapter = new LegacyTicketAdapter(reader, { send });
  installLegacyMutationGuard({ findOneAndUpdate: () => ({ exec: () => Promise.resolve(undefined) }) }, adapter);
  const bridge = new TicketBridge(adapter, adapter, new TicketContextTokens("synthetic-discord-context-signing-key"));
  const run = vi.fn<TicketAgentRunner["run"]>().mockResolvedValue({ reply: "Synthetic support reply" });
  const controller = new DiscordTicketSupport(reader, adapter, bridge, { run }, new Set([MOCK_OTHER_SCOPE.discordUserId]));
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
