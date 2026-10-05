import { describe, expect, it, vi } from "vitest";
import {
  CHARACTERIZATION_ACKNOWLEDGEMENT,
  CharacterizationSetupError,
  characterizeGetClientId,
  isCanonicalDiscordSnowflake,
  parseGetClientIdResponse
} from "../lib/get-client-id-characterization.js";

const LINKED_DISCORD_ID = "18446744073709551615";
const UNLINKED_DISCORD_ID = "18446744073709551614";

function validEnvironment(): Record<string, string> {
  return {
    CHARACTERIZATION_ACK: CHARACTERIZATION_ACKNOWLEDGEMENT,
    WHMCS_BASE_URL: "https://whmcs-test.example.invalid",
    WHMCS_API_IDENTIFIER: "synthetic-identifier",
    WHMCS_API_SECRET: "synthetic-secret",
    TEST_LINKED_DISCORD_ID: LINKED_DISCORD_ID,
    TEST_UNLINKED_DISCORD_ID: UNLINKED_DISCORD_ID
  };
}

describe("Discord snowflake validation", () => {
  it("accepts a canonical snowflake without Number conversion", () => {
    expect(isCanonicalDiscordSnowflake(LINKED_DISCORD_ID)).toBe(true);
    expect(BigInt(LINKED_DISCORD_ID)).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER));
  });

  it.each([
    "",
    "123",
    "012345678901234567",
    "+12345678901234567",
    "-12345678901234567",
    "12345678901234567.0",
    " 12345678901234567",
    "12345678901234567 ",
    "1234567890123456a",
    "18446744073709551616"
  ])("rejects non-canonical value without echoing it: %s", (value) => {
    expect(isCanonicalDiscordSnowflake(value)).toBe(false);
  });
});

describe("GetClientID response parsing", () => {
  it.each([
    [1, "positive-safe-integer"], ["1", "positive-safe-integer"],
    [0, "zero"], ["0", "zero"], [null, "invalid"], [-1, "invalid"],
    ["01", "invalid"], ["9007199254740992", "invalid"], [1.5, "invalid"],
    [[1, 2], "invalid"]
  ])("records client ID validation without retaining its value %#", (id, validation) => {
    const result = parseGetClientIdResponse({
      case: "linked", httpStatus: 200, contentType: "application/json",
      body: JSON.stringify({ result: "success", clientid: id }), bodyTruncated: false
    });
    expect(result.clientIdValidation).toBe(validation);
    expect(result).not.toHaveProperty("clientid");
    expect(result).not.toHaveProperty("clientId");
  });

  it("records a successful-looking shape without retaining clientid", () => {
    const result = parseGetClientIdResponse({
      case: "linked",
      httpStatus: 200,
      contentType: "application/json; charset=utf-8",
      body: JSON.stringify({
        result: "success",
        clientid: "987654",
        additional_safe_field: "value"
      }),
      bodyTruncated: false
    });

    expect(result).toMatchObject({
      parseableJson: true,
      resultPresence: true,
      resultType: "string",
      resultValue: "success",
      clientIdPresence: true,
      clientIdType: "string",
      classification: "json-object"
    });
    expect(result.unexpectedFields).toEqual(["<redacted-field>"]);
    expect(JSON.stringify(result)).not.toContain("987654");
  });

  it("records a missing clientid without assigning domain meaning", () => {
    const result = parseGetClientIdResponse({
      case: "unlinked",
      httpStatus: 200,
      contentType: "application/json",
      body: JSON.stringify({ result: "success" }),
      bodyTruncated: false
    });

    expect(result.clientIdPresence).toBe(false);
    expect(result.clientIdType).toBe("absent");
    expect(result.clientIdValidation).toBe("absent");
    expect(result.classification).toBe("json-object");
  });

  it("records error field presence without retaining its value", () => {
    const result = parseGetClientIdResponse({
      case: "invalid-authentication",
      httpStatus: 200,
      contentType: "application/json; reflected-secret=credential-specific-details",
      body: JSON.stringify({
        result: "error",
        error: "credential-specific details"
      }),
      bodyTruncated: false
    });

    expect(result).toMatchObject({
      resultValue: "error",
      errorPresence: true,
      clientIdPresence: false
    });
    expect(JSON.stringify(result)).not.toContain("credential-specific details");
    expect(JSON.stringify(result)).not.toContain("reflected-secret");
  });

  it("distinguishes malformed JSON from non-JSON", () => {
    const malformed = parseGetClientIdResponse({
      case: "malformed",
      httpStatus: 200,
      contentType: "application/json",
      body: "{not-json",
      bodyTruncated: false
    });
    const nonJson = parseGetClientIdResponse({
      case: "missing-authentication",
      httpStatus: 200,
      contentType: "text/html",
      body: "<html>unauthorized</html>",
      bodyTruncated: false
    });

    expect(malformed.classification).toBe("malformed-json");
    expect(nonJson.classification).toBe("non-json");
    expect(JSON.stringify(nonJson)).not.toContain("unauthorized");
  });

  it("classifies a non-2xx response as an HTTP failure", () => {
    const result = parseGetClientIdResponse({
      case: "missing-authentication",
      httpStatus: 401,
      contentType: "application/json",
      body: JSON.stringify({ result: "error" }),
      bodyTruncated: false
    });

    expect(result.classification).toBe("http-error");
    expect(result.resultValue).toBe("error");
  });

  it("redacts credentials and personal data reflected in field names and media types", () => {
    const result = parseGetClientIdResponse({
      case: "linked", httpStatus: 200,
      contentType: "synthetic-secret/plain; charset=utf-8",
      body: JSON.stringify({
        result: "success", clientid: 1, client: { email: "synthetic@example.invalid" },
        "synthetic-secret": "credential", "synthetic-identifier": "credential",
        [LINKED_DISCORD_ID]: "identity", "synthetic@example.invalid": "email"
      }), bodyTruncated: false
    });
    expect(result.contentType).toBe("<redacted>");
    expect(result.unexpectedFields).toContain("client");
    const output = JSON.stringify(result);
    for (const sensitive of ["synthetic-secret", "synthetic-identifier", LINKED_DISCORD_ID,
      "synthetic@example.invalid"]) {
      expect(output).not.toContain(sensitive);
    }
  });
});

describe("characterization execution safety", () => {
  it("rejects identical linked/unlinked fixtures before making a request", async () => {
    const environment = validEnvironment();
    environment.TEST_UNLINKED_DISCORD_ID = LINKED_DISCORD_ID;
    const fetchMock = vi.fn();
    await expect(characterizeGetClientId(environment, fetchMock))
      .rejects.toThrow("must be different");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("uses optional fixtures only when provided and makes no extra probes", async () => {
    const environment = validEnvironment();
    environment.TEST_CLOSED_CLIENT_DISCORD_ID = "18446744073709551613";
    environment.TEST_INACTIVE_CLIENT_DISCORD_ID = "18446744073709551612";
    const fetchMock = vi.fn(async () => Promise.resolve(new Response(
      '{"result":"success","clientid":1}',
      { headers: { "content-type": "application/json" } }
    )));
    const results = await characterizeGetClientId(environment, fetchMock);
    expect(results.map((result) => result.case)).toEqual([
      "linked", "unlinked", "malformed", "empty", "invalid-authentication",
      "missing-authentication", "closed-client", "inactive-client"
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(8);
  });

  it("cancels oversized streamed responses at the byte limit", async () => {
    const cancellations = vi.fn();
    const fetchMock = vi.fn(async () => Promise.resolve(new Response(
      new ReadableStream<Uint8Array>({
        start(controller) { controller.enqueue(new Uint8Array(65_537)); },
        cancel: cancellations
      }), { headers: { "content-type": "application/json" } }
    )));
    const results = await characterizeGetClientId(validEnvironment(), fetchMock);
    expect(results.every((result) => result.classification === "response-too-large")).toBe(true);
    expect(cancellations).toHaveBeenCalledTimes(6);
  });

  it("parses UTF-8 JSON across stream boundaries without retaining identifiers", async () => {
    const bytes = new TextEncoder().encode(JSON.stringify({ result: "error", message: "測試" }));
    const splitAt = bytes.findIndex((byte) => byte > 127) + 1;
    const fetchMock = vi.fn(async () => Promise.resolve(new Response(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(bytes.slice(0, splitAt));
          controller.enqueue(bytes.slice(splitAt));
          controller.close();
        }
      }), { headers: { "content-type": "application/json" } }
    )));
    const results = await characterizeGetClientId(validEnvironment(), fetchMock);
    expect(results.every((result) => result.resultValue === "error" && result.messagePresence)).toBe(true);
    expect(JSON.stringify(results)).not.toContain("測試");
  });

  it("stops before fetch when authorization acknowledgement is absent", async () => {
    const environment = validEnvironment();
    delete environment.CHARACTERIZATION_ACK;
    const fetchMock = vi.fn();

    await expect(characterizeGetClientId(environment, fetchMock)).rejects.toThrow(
      CharacterizationSetupError
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects remote HTTP and allows localhost HTTP", async () => {
    const remoteEnvironment = validEnvironment();
    remoteEnvironment.WHMCS_BASE_URL = "http://whmcs-test.example.invalid";
    const remoteFetch = vi.fn();
    await expect(
      characterizeGetClientId(remoteEnvironment, remoteFetch)
    ).rejects.toThrow("must use HTTPS");
    expect(remoteFetch).not.toHaveBeenCalled();

    const localEnvironment = validEnvironment();
    localEnvironment.WHMCS_BASE_URL = "http://localhost:8080/whmcs";
    const localFetch = vi.fn(async () =>
      Promise.resolve(
        new Response('{"result":"error"}', {
          status: 200,
          headers: { "content-type": "application/json" }
        })
      )
    );
    await expect(
      characterizeGetClientId(localEnvironment, localFetch)
    ).resolves.toHaveLength(6);
    expect(localFetch).toHaveBeenCalledTimes(6);
  });

  it("keeps snowflakes exact and credentials out of sanitized results", async () => {
    const environment = validEnvironment();
    const requestBodies: string[] = [];
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      if (typeof init?.body !== "string") {
        throw new TypeError("Expected an encoded form body");
      }
      requestBodies.push(init.body);
      return Promise.resolve(
        new Response(
          JSON.stringify({
            result: "success",
            clientid: "987654321",
            message: environment.WHMCS_API_SECRET,
            identifierEcho: environment.WHMCS_API_IDENTIFIER
          }),
          {
            status: 200,
            headers: { "content-type": "application/json" }
          }
        )
      );
    });

    const results = await characterizeGetClientId(environment, fetchMock);
    const firstBody = new URLSearchParams(requestBodies[0]);
    const sanitized = JSON.stringify(results);

    expect(firstBody.get("discordid")).toBe(LINKED_DISCORD_ID);
    expect(firstBody.get("discordid")).not.toBe(
      String(Number(LINKED_DISCORD_ID))
    );
    const firstInput = fetchMock.mock.calls[0]?.[0];
    expect(firstInput).toBeInstanceOf(URL);
    if (!(firstInput instanceof URL)) {
      throw new TypeError("Expected a URL request target");
    }
    expect(firstInput.pathname).toBe("/includes/api.php");
    expect(firstInput.search).toBe("");
    expect(firstInput.href).not.toContain(environment.WHMCS_API_SECRET);
    expect(firstInput.href).not.toContain(environment.WHMCS_API_IDENTIFIER);
    expect(sanitized).not.toContain("987654321");
    expect(sanitized).not.toContain(environment.WHMCS_API_SECRET);
    expect(sanitized).not.toContain(environment.WHMCS_API_IDENTIFIER);
    expect(sanitized).not.toContain(LINKED_DISCORD_ID);
    expect(sanitized).not.toContain(UNLINKED_DISCORD_ID);

    const invalidAuth = new URLSearchParams(requestBodies[4]);
    expect(invalidAuth.get("secret")).not.toBe(environment.WHMCS_API_SECRET);
    const missingAuth = new URLSearchParams(requestBodies[5]);
    expect(missingAuth.has("identifier")).toBe(false);
    expect(missingAuth.has("secret")).toBe(false);
  });
});
