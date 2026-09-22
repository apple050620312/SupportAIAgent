export const CHARACTERIZATION_ACKNOWLEDGEMENT = "I_HAVE_AUTHORIZATION";

const MAX_DISCORD_SNOWFLAKE = 18_446_744_073_709_551_615n;
const MAX_RESPONSE_LENGTH = 65_536;
const REQUEST_TIMEOUT_MS = 10_000;

export type CharacterizationCase =
  | "linked"
  | "unlinked"
  | "malformed"
  | "empty"
  | "invalid-authentication"
  | "missing-authentication"
  | "closed-client"
  | "inactive-client";

export type ObservableValueType =
  | "absent"
  | "null"
  | "string"
  | "number"
  | "boolean"
  | "array"
  | "object";

export type ResponseClassification =
  | "json-object"
  | "json-non-object"
  | "json-with-non-json-content-type"
  | "malformed-json"
  | "non-json"
  | "http-error"
  | "network-error"
  | "response-too-large";

export interface CharacterizationResult {
  readonly case: CharacterizationCase;
  readonly httpStatus: number | null;
  readonly contentType: string | null;
  readonly parseableJson: boolean;
  readonly resultPresence: boolean;
  readonly resultType: ObservableValueType;
  readonly resultValue: string | null;
  readonly clientIdPresence: boolean;
  readonly clientIdType: ObservableValueType;
  readonly messagePresence: boolean;
  readonly errorPresence: boolean;
  readonly unexpectedFields: readonly string[];
  readonly classification: ResponseClassification;
}

export interface ResponseObservation {
  readonly case: CharacterizationCase;
  readonly httpStatus: number;
  readonly contentType: string | null;
  readonly body: string;
  readonly bodyTruncated: boolean;
}

export interface CharacterizationEnvironment {
  readonly [name: string]: string | undefined;
}

interface PlannedCase {
  readonly name: CharacterizationCase;
  readonly discordUserId: string;
  readonly authentication: "valid" | "invalid" | "missing";
}

interface CharacterizationConfig {
  readonly endpoint: URL;
  readonly identifier: string;
  readonly secret: string;
  readonly cases: readonly PlannedCase[];
}

export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit
) => Promise<Response>;

export class CharacterizationSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CharacterizationSetupError";
  }
}

export function isCanonicalDiscordSnowflake(value: string): boolean {
  if (!/^[1-9][0-9]{16,19}$/.test(value)) {
    return false;
  }

  return BigInt(value) <= MAX_DISCORD_SNOWFLAKE;
}

function requireValue(
  environment: CharacterizationEnvironment,
  name: string
): string {
  const value = environment[name];
  if (value === undefined || value.length === 0) {
    throw new CharacterizationSetupError(`${name} is required`);
  }
  return value;
}

function requireSnowflake(
  environment: CharacterizationEnvironment,
  name: string
): string {
  const value = requireValue(environment, name);
  if (!isCanonicalDiscordSnowflake(value)) {
    throw new CharacterizationSetupError(
      `${name} must be a canonical 17-20 digit Discord snowflake`
    );
  }
  return value;
}

function optionalSnowflake(
  environment: CharacterizationEnvironment,
  name: string
): string | null {
  const value = environment[name];
  if (value === undefined || value.length === 0) {
    return null;
  }
  if (!isCanonicalDiscordSnowflake(value)) {
    throw new CharacterizationSetupError(
      `${name} must be a canonical 17-20 digit Discord snowflake when provided`
    );
  }
  return value;
}

function createEndpoint(baseUrlValue: string): URL {
  let baseUrl: URL;
  try {
    baseUrl = new URL(baseUrlValue);
  } catch {
    throw new CharacterizationSetupError("WHMCS_BASE_URL must be a valid URL");
  }

  if (baseUrl.username !== "" || baseUrl.password !== "") {
    throw new CharacterizationSetupError(
      "WHMCS_BASE_URL must not contain credentials"
    );
  }
  if (baseUrl.search !== "" || baseUrl.hash !== "") {
    throw new CharacterizationSetupError(
      "WHMCS_BASE_URL must not contain a query string or fragment"
    );
  }

  const localhostNames = new Set(["localhost", "127.0.0.1", "[::1]"]);
  const isLocalHttp =
    baseUrl.protocol === "http:" && localhostNames.has(baseUrl.hostname);
  if (baseUrl.protocol !== "https:" && !isLocalHttp) {
    throw new CharacterizationSetupError(
      "WHMCS_BASE_URL must use HTTPS unless the host is localhost"
    );
  }
  if (baseUrl.pathname.endsWith(".php")) {
    throw new CharacterizationSetupError(
      "WHMCS_BASE_URL must be the WHMCS installation base, not an API file"
    );
  }

  baseUrl.pathname = `${baseUrl.pathname.replace(/\/+$/, "")}/`;
  return new URL("includes/api.php", baseUrl);
}

function loadConfiguration(
  environment: CharacterizationEnvironment
): CharacterizationConfig {
  if (environment.CHARACTERIZATION_ACK !== CHARACTERIZATION_ACKNOWLEDGEMENT) {
    throw new CharacterizationSetupError(
      `CHARACTERIZATION_ACK must equal ${CHARACTERIZATION_ACKNOWLEDGEMENT}`
    );
  }

  const endpoint = createEndpoint(requireValue(environment, "WHMCS_BASE_URL"));
  const identifier = requireValue(environment, "WHMCS_API_IDENTIFIER");
  const secret = requireValue(environment, "WHMCS_API_SECRET");
  const linked = requireSnowflake(environment, "TEST_LINKED_DISCORD_ID");
  const unlinked = requireSnowflake(environment, "TEST_UNLINKED_DISCORD_ID");
  const closed = optionalSnowflake(
    environment,
    "TEST_CLOSED_CLIENT_DISCORD_ID"
  );
  const inactive = optionalSnowflake(
    environment,
    "TEST_INACTIVE_CLIENT_DISCORD_ID"
  );

  const cases: PlannedCase[] = [
    { name: "linked", discordUserId: linked, authentication: "valid" },
    { name: "unlinked", discordUserId: unlinked, authentication: "valid" },
    {
      name: "malformed",
      discordUserId: "not-a-discord-snowflake",
      authentication: "valid"
    },
    { name: "empty", discordUserId: "", authentication: "valid" },
    {
      name: "invalid-authentication",
      discordUserId: linked,
      authentication: "invalid"
    },
    {
      name: "missing-authentication",
      discordUserId: linked,
      authentication: "missing"
    }
  ];

  if (closed !== null) {
    cases.push({
      name: "closed-client",
      discordUserId: closed,
      authentication: "valid"
    });
  }
  if (inactive !== null) {
    cases.push({
      name: "inactive-client",
      discordUserId: inactive,
      authentication: "valid"
    });
  }

  return { endpoint, identifier, secret, cases };
}

function observableType(value: unknown, present: boolean): ObservableValueType {
  if (!present) return "absent";
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (typeof value === "object") return "object";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  return "object";
}

function safeResultValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value === "success" || value === "error" ? value : "<redacted>";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeUnexpectedFields(record: Record<string, unknown>): readonly string[] {
  const expected = new Set(["result", "clientid", "message", "error"]);
  return Object.keys(record)
    .filter(
      (name) =>
        !expected.has(name) && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)
    )
    .sort();
}

function safeContentType(value: string | null): string | null {
  if (value === null) return null;
  const mediaType = value.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  return /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/.test(mediaType)
    ? mediaType
    : "<redacted>";
}

function emptyResult(
  caseName: CharacterizationCase,
  classification: ResponseClassification,
  overrides: Partial<CharacterizationResult> = {}
): CharacterizationResult {
  return {
    case: caseName,
    httpStatus: null,
    contentType: null,
    parseableJson: false,
    resultPresence: false,
    resultType: "absent",
    resultValue: null,
    clientIdPresence: false,
    clientIdType: "absent",
    messagePresence: false,
    errorPresence: false,
    unexpectedFields: [],
    classification,
    ...overrides
  };
}

export function parseGetClientIdResponse(
  observation: ResponseObservation
): CharacterizationResult {
  const contentType = safeContentType(observation.contentType);

  if (observation.bodyTruncated) {
    return emptyResult(observation.case, "response-too-large", {
      httpStatus: observation.httpStatus,
      contentType
    });
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(observation.body) as unknown;
  } catch {
    const isHttpError =
      observation.httpStatus < 200 || observation.httpStatus >= 300;
    const claimsJson = /(?:^|\/|\+)json(?:;|$)/i.test(
      contentType ?? ""
    );
    return emptyResult(
      observation.case,
      isHttpError ? "http-error" : claimsJson ? "malformed-json" : "non-json",
      {
        httpStatus: observation.httpStatus,
        contentType
      }
    );
  }

  const isHttpError =
    observation.httpStatus < 200 || observation.httpStatus >= 300;
  if (!isRecord(parsed)) {
    return emptyResult(
      observation.case,
      isHttpError ? "http-error" : "json-non-object",
      {
        httpStatus: observation.httpStatus,
        contentType,
        parseableJson: true
      }
    );
  }

  const resultPresence = Object.hasOwn(parsed, "result");
  const clientIdPresence = Object.hasOwn(parsed, "clientid");
  const contentTypeIsJson = /(?:^|\/|\+)json(?:;|$)/i.test(
    contentType ?? ""
  );

  return {
    case: observation.case,
    httpStatus: observation.httpStatus,
    contentType,
    parseableJson: true,
    resultPresence,
    resultType: observableType(parsed.result, resultPresence),
    resultValue: resultPresence ? safeResultValue(parsed.result) : null,
    clientIdPresence,
    clientIdType: observableType(parsed.clientid, clientIdPresence),
    messagePresence: Object.hasOwn(parsed, "message"),
    errorPresence: Object.hasOwn(parsed, "error"),
    unexpectedFields: safeUnexpectedFields(parsed),
    classification: isHttpError
      ? "http-error"
      : contentTypeIsJson
        ? "json-object"
        : "json-with-non-json-content-type"
  };
}

function createNetworkError(caseName: CharacterizationCase): CharacterizationResult {
  return emptyResult(caseName, "network-error", { errorPresence: true });
}

async function executeCase(
  config: CharacterizationConfig,
  plannedCase: PlannedCase,
  fetchImplementation: FetchLike
): Promise<CharacterizationResult> {
  const body = new URLSearchParams({
    action: "GetClientID",
    discordid: plannedCase.discordUserId,
    responsetype: "json"
  });

  if (plannedCase.authentication !== "missing") {
    body.set("identifier", config.identifier);
    body.set(
      "secret",
      plannedCase.authentication === "invalid"
        ? `${config.secret}__INTENTIONALLY_INVALID__`
        : config.secret
    );
  }

  try {
    const response = await fetchImplementation(config.endpoint, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/x-www-form-urlencoded"
      },
      body: body.toString(),
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });
    const responseBody = await response.text();
    return parseGetClientIdResponse({
      case: plannedCase.name,
      httpStatus: response.status,
      contentType: response.headers.get("content-type"),
      body: responseBody.length > MAX_RESPONSE_LENGTH ? "" : responseBody,
      bodyTruncated: responseBody.length > MAX_RESPONSE_LENGTH
    });
  } catch {
    return createNetworkError(plannedCase.name);
  }
}

export async function characterizeGetClientId(
  environment: CharacterizationEnvironment,
  fetchImplementation: FetchLike = fetch
): Promise<readonly CharacterizationResult[]> {
  const config = loadConfiguration(environment);
  const results: CharacterizationResult[] = [];

  for (const plannedCase of config.cases) {
    results.push(
      await executeCase(config, plannedCase, fetchImplementation)
    );
  }

  return results;
}
