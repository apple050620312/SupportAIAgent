import { describe, expect, it, vi } from "vitest";
import { isCanonicalDiscordSnowflake, type ActorContext } from "@openclaw-hosting/contracts";
import {
  WhmcsCustomerIdentityResolver,
  WhmcsIdentityResolutionError,
  type WhmcsIdentityFetch
} from "@openclaw-hosting/whmcs";
import type { CustomerIdentityResolver } from "../../apps/support-core/dist/src/ports/index.js";
import { HostingSupportService } from "../../apps/support-core/dist/src/services/hosting-support-service.js";

// Synthetic inputs and responses, not captured WHMCS observations.
const config = {
  baseUrl: "https://whmcs.example.invalid/billing/",
  apiIdentifier: "synthetic-identifier",
  apiSecret: "synthetic-secret"
};
const actor: ActorContext = {
  actor: { discordUserId: "18446744073709551615" },
  correlationId: "synthetic-correlation"
};
function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status, headers: { "content-type": "application/json; charset=utf-8" }
  });
}
function withResponse(response: Response) {
  const fetchMock = vi.fn<WhmcsIdentityFetch>().mockResolvedValue(response);
  return { fetchMock, resolver: new WhmcsCustomerIdentityResolver(config, fetchMock) };
}

describe("provisional WHMCS identity adapter", () => {
  it.each([1, "1", Number.MAX_SAFE_INTEGER, String(Number.MAX_SAFE_INTEGER)])(
    "accepts only a success shape with a canonical positive client ID: %s", async (id) => {
      const { resolver, fetchMock } = withResponse(json({ result: "success", clientid: id }));
      // Structural assignment verifies the inward port without a provider/core dependency.
      const port: CustomerIdentityResolver = resolver;
      expect(await port.resolveActor(actor)).toEqual({ customerRef: `whmcs:${String(id)}` });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0]!;
      expect(url).toBe("https://whmcs.example.invalid/billing/includes/api.php");
      expect(url).not.toContain(config.apiSecret);
      expect(url).not.toContain("?");
      expect(init).toMatchObject({
        method: "POST", redirect: "error",
        headers: { "content-type": "application/x-www-form-urlencoded" }
      });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const body = init?.body as URLSearchParams;
      expect(Object.fromEntries(body)).toEqual({
        action: "GetClientID", discordid: actor.actor.discordUserId,
        identifier: config.apiIdentifier, secret: config.apiSecret, responsetype: "json"
      });
      expect(JSON.stringify(resolver)).toBe("{}");
    }
  );

  it.each([
    { result: "success" }, { result: "error", message: "not linked" },
    { result: "error", message: "authentication failed" }, { clientid: 1 },
    { result: "SUCCESS", clientid: 1 }, { result: true, clientid: 1 },
    null, [], { result: "success", clientid: [1, 2] },
    { result: "success", clientid: 1, matches: 2 },
    { result: "success", clientid: 1, client: { email: "synthetic@example.invalid" } },
    { result: "success", clientid: 1, error: "contradictory" }
  ])("rejects unknown, contradictory or ambiguous response shapes %#", async (value) => {
    const { resolver, fetchMock } = withResponse(json(value));
    await expect(resolver.resolveActor(actor)).rejects.toMatchObject({ reason: "response" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, "0", "01", "-1", "+1",
    " 1", "1 ", "1.0", "1e2", "9007199254740992", "", null, true, {}])(
    "rejects invalid/unsafe client IDs %#", async (id) => {
      const { resolver } = withResponse(json({ result: "success", clientid: id }));
      await expect(resolver.resolveActor(actor)).rejects.toMatchObject({ reason: "response" });
    }
  );

  it.each(["", "123", "18446744073709551616", " 18446744073709551615",
    "+18446744073709551615", "１８４４６７４４０７３７０９５５１６１５"])(
    "rejects noncanonical actors before HTTP %#", async (id) => {
      const fetchMock = vi.fn<WhmcsIdentityFetch>();
      const resolver = new WhmcsCustomerIdentityResolver(config, fetchMock);
      await expect(resolver.resolveActor({ ...actor, actor: { discordUserId: id } }))
        .rejects.toMatchObject({ reason: "actor" });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("does not normalize or convert Discord IDs to Number", () => {
    expect(isCanonicalDiscordSnowflake(actor.actor.discordUserId)).toBe(true);
    expect(isCanonicalDiscordSnowflake(Number(actor.actor.discordUserId))).toBe(false);
    expect(isCanonicalDiscordSnowflake(`0${actor.actor.discordUserId}`)).toBe(false);
  });

  it.each(["http://remote.example.invalid", "http://localhost", "https://user:pass@example.invalid",
    "https://example.invalid/?secret=synthetic", "https://example.invalid/#fragment",
    "https://example.invalid/includes/api.php", "not a URL"])(
    "rejects insecure or malformed configuration before HTTP %#", (baseUrl) => {
      const fetchMock = vi.fn<WhmcsIdentityFetch>();
      expect(() => new WhmcsCustomerIdentityResolver({ ...config, baseUrl }, fetchMock))
        .toThrow(WhmcsIdentityResolutionError);
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it.each(["apiIdentifier", "apiSecret"] as const)("requires runtime %s", (field) => {
    expect(() => new WhmcsCustomerIdentityResolver({ ...config, [field]: " " }, vi.fn()))
      .toThrow(WhmcsIdentityResolutionError);
  });

  it.each([401, 403, 429, 500, 302])("rejects HTTP %s without retry", async (status) => {
    const { resolver, fetchMock } = withResponse(json({ result: "success", clientid: 1 }, status));
    await expect(resolver.resolveActor(actor)).rejects.toMatchObject({ reason: "http" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it.each([
    new Response("{", { headers: { "content-type": "application/json" } }),
    new Response("<html>upstream</html>", { headers: { "content-type": "text/html" } }),
    new Response('{"result":"success","clientid":1}'),
    new Response(" ".repeat(65_537), { headers: { "content-type": "application/json" } })
  ])("rejects malformed, non-JSON and oversized bodies %#", async (response) => {
    const { resolver } = withResponse(response);
    await expect(resolver.resolveActor(actor)).rejects.toMatchObject({ reason: "response" });
  });

  it("discards upstream error details and never retries transport failures", async () => {
    const fetchMock = vi.fn<WhmcsIdentityFetch>().mockRejectedValue(new Error(
      `${config.apiSecret} ${config.apiIdentifier} ${actor.actor.discordUserId} raw customer data`
    ));
    const resolver = new WhmcsCustomerIdentityResolver(config, fetchMock);
    try {
      await resolver.resolveActor(actor);
      expect.fail("Expected a closed failure");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(WhmcsIdentityResolutionError);
      expect(error).toMatchObject({ reason: "transport" });
      expect(error).not.toHaveProperty("cause");
      expect(String(error)).not.toContain(config.apiSecret);
      expect(String(error)).not.toContain(actor.actor.discordUserId);
      expect(JSON.stringify(error)).not.toContain(config.apiIdentifier);
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not expose identifiers or sensitive message fields from an error body", async () => {
    const { resolver } = withResponse(json({
      result: "error", clientid: 999, secret: config.apiSecret,
      message: `${actor.actor.discordUserId} synthetic@example.invalid`
    }));
    await expect(resolver.resolveActor(actor)).rejects.toMatchObject({
      message: "WHMCS identity resolution failed (response)"
    });
  });

  it("reads bounded JSON across chunks and rejects invalid UTF-8", async () => {
    const encoder = new TextEncoder();
    const response = new Response(new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode('{"result":"success",'));
        controller.enqueue(encoder.encode('"clientid":1}'));
        controller.close();
      }
    }), { headers: { "content-type": "application/json" } });
    expect(await withResponse(response).resolver.resolveActor(actor))
      .toEqual({ customerRef: "whmcs:1" });
    const invalid = new Response(new Uint8Array([0xff]), {
      headers: { "content-type": "application/json" }
    });
    await expect(withResponse(invalid).resolver.resolveActor(actor))
      .rejects.toMatchObject({ reason: "response" });
  });

  it("cancels an oversized stream instead of consuming the remaining body", async () => {
    const cancel = vi.fn();
    const response = new Response(new ReadableStream<Uint8Array>({
      start(controller) { controller.enqueue(new Uint8Array(65_537)); },
      cancel
    }), { headers: { "content-type": "application/json" } });
    await expect(withResponse(response).resolver.resolveActor(actor))
      .rejects.toMatchObject({ reason: "response" });
    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it("rejects a followed redirect even if a custom fetch returns success", async () => {
    const response = json({ result: "success", clientid: 1 });
    Object.defineProperty(response, "redirected", { value: true });
    await expect(withResponse(response).resolver.resolveActor(actor))
      .rejects.toMatchObject({ reason: "http" });
  });

  it("passes a ten-second abort signal and fails closed on timeout", async () => {
    const controller = new AbortController();
    controller.abort();
    const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
    try {
      const fetchMock = vi.fn<WhmcsIdentityFetch>().mockImplementation((_url, init) => {
        expect(init?.signal?.aborted).toBe(true);
        return Promise.reject(new DOMException("synthetic timeout", "TimeoutError"));
      });
      await expect(new WhmcsCustomerIdentityResolver(config, fetchMock).resolveActor(actor))
        .rejects.toMatchObject({ reason: "transport" });
      expect(timeout).toHaveBeenCalledWith(10_000);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      timeout.mockRestore();
    }
  });

  it("uses the actor identity even when an unexpected client selector is supplied", async () => {
    const { resolver, fetchMock } = withResponse(json({ result: "success", clientid: 1 }));
    const caller = { ...actor, whmcsClientId: 999, discordUserId: "18446744073709551614" };
    expect(await resolver.resolveActor(caller)).toEqual({ customerRef: "whmcs:1" });
    const body = fetchMock.mock.calls[0]![1]?.body as URLSearchParams;
    expect(body.get("discordid")).toBe(actor.actor.discordUserId);
    expect(body.has("clientid")).toBe(false);
  });

  it("core maps unknown no-match to upstream unavailable and stops service access", async () => {
    const { resolver } = withResponse(json({ result: "error", message: "synthetic no match" }));
    const listForCustomer = vi.fn().mockResolvedValue([]);
    const service = new HostingSupportService({
      identityResolver: resolver,
      hostingServices: { listForCustomer, findByReference: vi.fn() },
      gameServers: { findForOwnedService: vi.fn() }
    });
    await expect(service.listMyServices(actor)).rejects.toMatchObject({ code: "UPSTREAM_UNAVAILABLE" });
    expect(listForCustomer).not.toHaveBeenCalled();
  });
});
