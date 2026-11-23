import { describe, expect, it, vi } from "vitest";
import { WhmcsHostingServiceProvider } from "@support-ai-agent/whmcs";
const config = { baseUrl: "https://whmcs.example.invalid", apiIdentifier: "synthetic-identifier", apiSecret: "synthetic-secret" };
const actor = { actor: { discordUserId: "18446744073709551615" }, correlationId: "synthetic" };
const customer = { customerRef: "whmcs:1" };
const identities = { resolveActor: async () => Promise.resolve(customer) };
describe("private provider transport safety", () => {
  it.each([401, 403, 429, 500])("does not retry HTTP %s or expose response data", async (status) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("synthetic-secret private customer", { status }));
    const provider = new WhmcsHostingServiceProvider(config, identities, fetchMock);
    await expect(provider.listForCustomer(customer, actor)).rejects.toMatchObject({ message: "Provider read failed (http)" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([
    new Response("<html>synthetic-secret</html>", { headers: { "content-type": "text/html" } }),
    new Response("{synthetic-secret", { headers: { "content-type": "application/json" } }),
    new Response(new Uint8Array([255]), { headers: { "content-type": "application/json" } })
  ])("rejects non-JSON, malformed JSON and invalid UTF-8 %#", async (response) => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(response);
    const error: unknown = await new WhmcsHostingServiceProvider(config, identities, fetchMock)
      .listForCustomer(customer, actor).catch((failure: unknown) => failure);
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain("synthetic-secret");
    expect(error).not.toHaveProperty("cause");
  });
  it("cancels an oversized byte stream without continuing to read it", async () => {
    const cancel = vi.fn();
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(524_289)); }, cancel
    }), { headers: { "content-type": "application/json" } }));
    await expect(new WhmcsHostingServiceProvider(config, identities, fetchMock).listForCustomer(customer, actor))
      .rejects.toMatchObject({ reason: "response" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it("redacts transport exceptions and uses a finite timeout", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue(new Error("synthetic-secret private request"));
    const error: unknown = await new WhmcsHostingServiceProvider(config, identities, fetchMock)
      .listForCustomer(customer, actor).catch((failure: unknown) => failure);
    expect(error).toMatchObject({ message: "Provider read failed (transport)" });
    expect(error).not.toHaveProperty("cause");
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
