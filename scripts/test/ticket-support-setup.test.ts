import { describe, expect, it, vi } from "vitest";
import { prepareTicketSupport } from "../lib/ticket-support-setup.js";

function environment(): Record<string, string> { return {
  TICKET_SUPPORT_ACK: "I_HAVE_AUTHORIZATION", TICKET_BASELINE_REVIEW_ACK: "I_HAVE_REVIEWED_BASELINE_CONFIGURATION",
  GETCLIENTID_REVIEW_ACK: "I_HAVE_REVIEWED_IDENTITY_CONTRACT", PTERODACTYL_EXTERNAL_ID_ACK: "WHMCS_SERVICE_ID",
  TICKET_BOT_ROOT: "synthetic-baseline", TEST_TICKET_GUILD_ID: "18446744073709551615", TEST_TICKET_CHANNEL_ID: "18446744073709551614",
  TICKET_STAFF_USER_IDS: "18446744073709551613", TICKET_CONTEXT_KEY: "synthetic-context-key-for-setup-tests",
  WHMCS_BASE_URL: "https://whmcs.example.invalid", WHMCS_API_IDENTIFIER: "synthetic-identifier", WHMCS_API_SECRET: "synthetic-secret",
  PTERODACTYL_BASE_URL: "https://panel.example.invalid", PTERODACTYL_APPLICATION_API_KEY: "synthetic-application",
  PTERODACTYL_CLIENT_API_KEY: "synthetic-client", OPENCLAW_BASE_URL: "http://127.0.0.1:18789", OPENCLAW_GATEWAY_TOKEN: "synthetic-gateway"
}; }
describe("manual baseline launcher setup", () => {
  it.each(["TICKET_SUPPORT_ACK", "TICKET_BASELINE_REVIEW_ACK", "GETCLIENTID_REVIEW_ACK", "PTERODACTYL_EXTERNAL_ID_ACK", "WHMCS_API_SECRET", "OPENCLAW_GATEWAY_TOKEN"])("requires %s before loading a bot or using network", (name) => {
    const env = environment(); delete env[name]; const fetchMock = vi.fn<typeof fetch>();
    expect(() => prepareTicketSupport(env, fetchMock)).toThrow(); expect(fetchMock).not.toHaveBeenCalled();
  });
  it("prepares isolated ports and keys without calling providers", () => {
    const fetchMock = vi.fn<typeof fetch>(); const setup = prepareTicketSupport(environment(), fetchMock);
    expect(setup.port).toBe(3001); expect(setup.staff.size).toBe(1); expect(fetchMock).not.toHaveBeenCalled();
  });
  it.each([{ TEST_TICKET_CHANNEL_ID: "not-a-snowflake" }, { SUPPORT_CORE_PORT: "80" }, { OPENCLAW_BASE_URL: "http://remote.example.invalid" },
    { TICKET_HUMAN_IDLE_MS: "4999" }, { TICKET_HUMAN_IDLE_MS: "not-a-duration" },
    { TICKET_AUDIT_CHANNEL_ID: "18446744073709551612" },
    { TICKET_AUDIT_CHANNEL_ID: "18446744073709551614", TICKET_AUDIT_REVIEW_ACK: "I_HAVE_REVIEWED_STAFF_ONLY_CHANNEL" }])("rejects unsafe configuration %#", (override) => {
    const fetchMock = vi.fn<typeof fetch>(); expect(() => prepareTicketSupport({ ...environment(), ...override }, fetchMock)).toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("accepts and returns the bounded human idle setting", () => {
    const setup = prepareTicketSupport({ ...environment(), TICKET_HUMAN_IDLE_MS: "5000" }, vi.fn<typeof fetch>());
    expect(setup.humanIdleMs).toBe(5000);
  });
  it("captures an absolute knowledge folder without reading files or contacting providers", () => {
    const fetchMock = vi.fn<typeof fetch>();
    const defaultSetup = prepareTicketSupport(environment(), fetchMock);
    expect(defaultSetup.knowledgeRoot).toMatch(/[\\/]knowledge$/);
    const setup = prepareTicketSupport({ ...environment(), SUPPORT_KNOWLEDGE_ROOT: defaultSetup.knowledgeRoot }, fetchMock);
    expect(setup.knowledgeRoot).toBe(defaultSetup.knowledgeRoot);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("rejects model-like relative knowledge paths before loading a bot", () => {
    const fetchMock = vi.fn<typeof fetch>();
    expect(() => prepareTicketSupport({ ...environment(), SUPPORT_KNOWLEDGE_ROOT: "../../private" }, fetchMock)).toThrow("absolute folder");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
