# WHMCS Discord Link Integration

## Investigation status

This investigation inspected the supplied `AndrezzzLinkDiscord` version 1.7 source tree and the supplied Ticket Bot and PteroAI source archives. The addon implementation is not available as readable PHP: `AndrezzzLinkDiscord.php`, `functions.php`, `hooks.php`, `public.php`, and every event hook under `hooks/` are ionCube-encoded. The readable addon material is limited to `whmcs.json`, Smarty templates, and third-party vendor code.

The internal projects reveal the external lookup contract their consumers rely on, but not the addon's storage schema, lookup implementation, cardinality, lifecycle semantics, or complete failure behavior. This document separates facts verified from readable files from recommendations and unresolved questions. No production adapter is implemented here.

## Current addon behavior

### Verified from readable source

- `whmcs.json` identifies the package as Andrezzz Link Discord and describes it as linking a WHMCS client account with Discord. The addon and template headers identify version 1.7.
- The metadata advertises client lookup by Discord ID, editing and deleting a linked client, and a "Backend API".
- `templates/admin-clientsummary.tpl` receives a single `discordID` and a single `discordInfo` value for the displayed WHMCS client. It renders that identity and exposes edit and unlink actions.
- `templates/linked.tpl` renders one Discord identity with an `id`, username, discriminator, and avatar for the current client-area view. It also optionally allows the client to change a notification preference.
- `templates/base.tpl` posts admin UI actions named `Edit client` and `Unlink client` to `addonmodules.php?module=AndrezzzLinkDiscord&ajax=1&action=...`. Editing submits both `clientID` and `discordID`; unlinking submits `clientID`.
- The edit dialog treats the Discord ID as browser form text and shows the example `1014159062302195792`, which has the shape of a decimal Discord snowflake. This verifies only the UI input shape, not validation or database representation.
- `templates/admin.tpl` exposes a `Relink All Clients` admin action. Its server-side meaning cannot be verified; it may concern Discord role synchronization rather than identity replacement.

### Not verified

The encoded PHP prevents tracing OAuth/link callbacks, database reads and writes, WHMCS client lookup, status checks, error handling, or Discord bot calls. Template variable names and feature descriptions are not sufficient evidence for those behaviors.

## Existing internal integrations

### Verified shared external contract

Both internal projects call the WHMCS external API endpoint `/includes/api.php` over HTTPS with:

- `action=GetClientID`;
- `discordid=<Discord user ID>`;
- `identifier=<WHMCS API identifier>`;
- `secret=<WHMCS API secret>`;
- `responsetype=json`.

Both consumers expect the JSON response to contain `clientid`. Ticket Bot additionally checks `result === "success"` in two paths. The action name and Discord-specific parameter show that this is a custom action exposed through the generic WHMCS API endpoint. Given the surrounding system and matching addon feature description, the Link Discord addon is the likely provider, but the encoded addon source does not prove which PHP registration code implements it.

The verified consumer flow is:

```text
trusted Discord event user ID
  -> POST /includes/api.php action=GetClientID, discordid=<ID>
  -> JSON { result, clientid, ...unknown fields }
  -> standard WHMCS API calls using the returned clientid
```

No observed resolver request supplies a WHMCS client ID. The client ID is response data and becomes input only to subsequent WHMCS calls.

### Ticket Bot

#### Facts observed from code

- `src/api.js`, exported `get(action, params)`, performs an Axios `POST` with a null body. It places the action, `responsetype`, WHMCS API credentials, and operation parameters in the URL query parameters.
- `src/config.js` contains the WHMCS API URI and credentials directly in the supplied source file. It also contains other embedded credentials. Values are intentionally not reproduced here.
- `src/buttons/ticket/cat/service.js`, exported `menu`, resolves `interaction.user.id`, extracts `res.data.clientid`, then calls `GetClientsProducts` with that client ID.
- `src/buttons/ticket/cat/billing/index.js`, exported `run`, resolves `interaction.user.id` and denies the billing workflow unless `result` is `success`. Its exported `menu` resolves the same actor again before listing products or invoices.
- `src/buttons/ticket/cat/billing/inquiry.js` and `pay.js`, exported `menu` functions, resolve `interaction.user.id` before calling `GetInvoices`.
- `src/buttons/ticket/open/general.js`, exported `run`, resolves `interaction.user.id`; on `result === "success"`, it calls `GetClientsDetails` with the returned `clientid` and places the customer's full name and an admin link in the staff ticket channel.
- The interaction router in `src/events/interactions.js` catches thrown handler errors and logs them. It does not translate resolver failures into stable domain outcomes.

The Discord identifier is always taken from the authenticated Discord interaction actor in the observed resolver calls. The Ticket Bot does not pass a caller-selected WHMCS client ID to `GetClientID`.

#### Observed failure behavior

- The billing entry point treats any response whose `result` is not `success` as “not linked.” It does not distinguish an invalid Discord ID, authentication failure, addon error, or upstream failure.
- The general ticket path simply omits customer details when `result` is not `success`.
- Most service and billing subflows extract `clientid` without checking `result`, then make another WHMCS call. Missing or error responses can therefore become invalid downstream requests or thrown JavaScript errors.
- Axios transport, parsing, and authentication failures reject the promise. The interaction router logs the error and provides no resolver-specific recovery.
- Duplicate mappings, missing WHMCS clients, closed/inactive clients, and the exact not-linked response are not handled explicitly.

#### Assessment

**USEFUL ONLY AS REFERENCE.** The working call sites verify the custom action, request field, authentication scheme, and success field. The implementation should not be reused unchanged because credentials are embedded in source and sent in the URL query string, error handling is inconsistent, errors may be logged with request details, and some flows retrieve and display more customer data than identity resolution requires.

### PteroAI

#### Facts observed from code

- `core/classes.py`, `Request.whmcs_request(data)`, form-posts to `/includes/api.php`. It adds WHMCS API identifier and secret values loaded from environment variables plus `responsetype=json`.
- The wrapper parses JSON and converts every response with `result == "error"` to an empty object. It does not check the HTTP status before parsing.
- `cmds/cmd.py`, `Cmd.ai`, sets `uid` to the optional command argument or `ctx.author.id`, calls `GetClientID`, and reads `clientid`. If absent, it replies `Client not found.`; otherwise it calls `GetClientsProducts` and filters for active Pterodactyl services.
- `Cmd.ai` is owner-only, but an unconditional `return` at the first line of the function makes the entire lookup and service workflow unreachable in the supplied source.
- Because `uid` is an optional command argument, removing the early return would allow the bot owner to resolve an arbitrary Discord user rather than only the invoking actor.

#### Observed failure behavior

- Missing `clientid` is reported as `Client not found.`
- Every WHMCS JSON error, including a possible authentication or authorization failure, is collapsed to the same empty-object result.
- Network, non-JSON, and HTTP failures are not explicitly translated and can raise exceptions.
- Duplicate mappings, missing WHMCS clients, closed/inactive clients, and the exact not-linked response are not handled explicitly.

#### Assessment

**UNSAFE FOR NEW SUPPORT CORE.** The transport pattern is cleaner than Ticket Bot because credentials come from environment variables and are sent in the POST body, but the current feature is disabled, conflates all WHMCS errors with “not found,” and permits an operator-supplied Discord ID. Its request pattern is useful evidence; its code and authorization behavior should not be reused.

### Comparison and recommendation

Ticket Bot appears actively wired into Discord interaction handlers; PteroAI's only resolver path is unreachable. The archives do not include reliable version-control history, deployment data, or release metadata, so which project is newer or currently deployed cannot be established responsibly from file timestamps.

Both projects use the same WHMCS custom API action and receive the same minimal identity field. PteroAI has better credential placement and transport, while Ticket Bot demonstrates active actor-derived lookup and a `result` success check. Neither has adequate failure classification or ambiguity handling. The custom `GetClientID` API contract is **REUSABLE WITH WRAPPER**, subject to verification of its failure and cardinality semantics; neither client implementation is suitable for direct reuse.

## Observed GetClientID API contract

### Characterization status

Live characterization is still pending. No WHMCS request was made while building the harness, and no response row is documented until an operator runs it against an explicitly authorized environment and manually reviews the sanitized output.

The isolated harness is `scripts/characterize-get-client-id.ts`. Its parsing, validation, request planning, and sanitization logic lives under `scripts/lib/` and is not imported by Support Core or any production package.

### Prepared request contract

The harness is limited to sequential, non-retried `POST` requests to `<WHMCS_BASE_URL>/includes/api.php` using `application/x-www-form-urlencoded`. Authentication and action parameters are placed only in the request body:

- `action=GetClientID`;
- `discordid=<test Discord snowflake>`;
- `identifier=<WHMCS API identifier>`, except for the missing-authentication case;
- `secret=<WHMCS API secret>`, except for the missing-authentication case;
- `responsetype=json`.

The invalid-authentication case derives a deliberately invalid secret in memory. The harness uses a ten-second timeout, does not retry, rejects redirects, requires HTTPS for remote hosts, and permits plain HTTP only for `localhost`, `127.0.0.1`, or `::1`.

### Operator configuration

Copy `.env.characterization.example` to the Git-ignored `.env.characterization` file and replace every required placeholder:

- `CHARACTERIZATION_ACK=I_HAVE_AUTHORIZATION`;
- `WHMCS_BASE_URL`;
- `WHMCS_API_IDENTIFIER`;
- `WHMCS_API_SECRET`;
- `TEST_LINKED_DISCORD_ID`;
- `TEST_UNLINKED_DISCORD_ID`.

`TEST_CLOSED_CLIENT_DISCORD_ID` and `TEST_INACTIVE_CLIENT_DISCORD_ID` are optional and should be set only when safe fixtures already exist. The harness does not generate IDs, enumerate mappings, probe duplicates, or create test data.

Run it manually with:

```sh
corepack pnpm characterize:get-client-id
```

Without the exact acknowledgement and complete required configuration, the command exits before reaching `fetch`.

### Input and output safety

Configured test identities must be canonical strings of 17-20 ASCII decimal digits, without signs, decimal points, whitespace, or leading zeroes, and must fit within the unsigned 64-bit snowflake range. Validation uses `BigInt`; Discord IDs are never converted through JavaScript `Number`. The explicit malformed and empty cases bypass this local validation so the authorized endpoint behavior can be observed.

The stdout table records only:

- case name, HTTP status, and content type;
- whether JSON parsing succeeded;
- presence and primitive type of `result` and `clientid`;
- a conservatively sanitized `result` value;
- presence of `message` and `error` fields;
- safe unexpected field names;
- transport/shape classification.

It never retains or prints credentials, Discord IDs, client ID values, raw bodies, message/error values, or customer data. Responses larger than 64 KiB are not parsed. `characterization-results/` is reserved and Git-ignored for any operator-captured sanitized output; the current harness writes only to stdout.

### Prepared cases

The harness prepares linked, unlinked, malformed, empty, invalid-authentication, and missing-authentication cases. Closed-client and inactive-client cases are included only when their optional variables are supplied. It deliberately has no duplicate-account or enumeration behavior.

These cases remain unobserved. In particular, no response may be interpreted as `IDENTITY_NOT_LINKED` until live results demonstrate a distinct no-match contract. Sanitized results must be manually reviewed before ADR 0003 is created or production adapter behavior is specified.

## Storage model

The storage model is **unknown**. No readable migration, activation function, schema builder, SQL statement, model, or table definition is present.

The supplied source cannot establish whether the Discord ID is stored in a WHMCS custom client field, an addon-owned table, client metadata, or another service. It also cannot establish:

- table and column names;
- SQL data types;
- indexes, foreign keys, or uniqueness constraints;
- whether a snowflake is persisted as text, an integer, or another representation;
- whether the displayed Discord profile or notification preference is stored with the link;
- install, upgrade, or uninstall schema behavior.

The UI passes a decimal-looking Discord ID as a form value. A future contract should preserve Discord snowflakes as canonical decimal strings, but that is a recommendation, not a verified description of addon storage.

## Link cardinality

Exact cardinality is **unknown**.

The client summary and linked-client templates present one Discord identity for one WHMCS client, but presentation does not prove database constraints. The encoded implementation and unavailable schema leave all of the following unresolved:

- whether one Discord account can link to multiple WHMCS clients;
- whether one WHMCS client can link to multiple Discord accounts;
- whether duplicate Discord IDs or duplicate client IDs can exist;
- how an ambiguous lookup is resolved;
- whether owner, primary account, team member, sub-account, or additional Discord-user relationships exist.

Any resolver must fail closed if more than one mapping is returned until uniqueness is proven and enforced.

## Link lifecycle

### Verified from readable source

- A WHMCS admin UI can request an edit by submitting a `clientID` and replacement `discordID`.
- A WHMCS admin UI can request unlinking by submitting a `clientID`.
- The package presents a linked-client view and an optional notification setting.
- The package metadata describes role assignment and removal based on active services.

### Unknown

The server-side effects of edit and unlink are encoded. It is therefore unknown whether relinking replaces or adds a mapping, whether unlink deletes or marks a row, whether stale links can remain, and whether Discord roles or cached profile data are removed. Behavior for deleted, merged, inactive, or closed WHMCS clients is also unknown. The event-hook filenames cannot be used to infer their implementation.

## Available integration interfaces

### Verified interfaces

The internal consumers verify a callable custom action named `GetClientID` at the standard WHMCS external API endpoint `/includes/api.php`. It accepts `discordid` and, on the observed success path, returns `result: "success"` and `clientid`. Both internal projects use this action before standard WHMCS API calls.

The addon templates separately expose a WHMCS admin-page AJAX handler at `addonmodules.php?module=AndrezzzLinkDiscord&ajax=1&action=...`. The readable templates use it for administrative mutations, including arbitrary `clientID` input. This admin AJAX surface is not the resolver used by the internal integrations and is not suitable for Support Core.

### Still unverified

The `GetClientID` server implementation and documentation are not readable. The supplied sources do not reveal:

- how the custom action is registered or whether the addon vendor treats it as a supported, versioned interface;
- the complete response schema and error messages;
- authorization beyond standard WHMCS API credential validation;
- mapping query, ambiguity, status, or stale-link behavior;
- rate limits and intended callers.

No callable PHP service/class, lookup hook, or stable database query could be verified.

## Authentication model

The consumer-side authentication contract is verified: both projects authenticate to `/includes/api.php` with a WHMCS API identifier and secret. PteroAI sends them as form body fields; Ticket Bot sends them as URL query parameters on a POST request. The latter risks credential exposure through URL, proxy, error, and access logs.

The visible administrative AJAX calls are emitted from WHMCS admin templates through `WHMCS.http.jqClient`, but session checks, administrator permissions, CSRF validation, and server-side input validation are encoded. Their presence or strength must not be assumed.

Server-side authorization logic for `GetClientID` and authentication for the Discord linking flow remain encoded. No secret values are reproduced in this documentation.

## Failure cases

The clients establish only two broad outcomes: a success response containing `clientid`, or a non-success/missing field. Ticket Bot and PteroAI do not reliably distinguish failure causes. Actual addon behavior remains unknown for:

- an unlinked Discord account;
- malformed, non-decimal, empty, or out-of-range Discord IDs;
- duplicate or ambiguous mappings;
- a mapping whose WHMCS client no longer exists;
- closed or inactive WHMCS clients;
- stale mappings after unlinking or account deletion;
- Discord or WHMCS upstream unavailability;
- unauthorized or replayed API requests.

The Support Core resolver must define these outcomes explicitly rather than copy either client's broad “not linked” behavior. At minimum, a verified no-match should become `IDENTITY_NOT_LINKED`, ambiguity must fail closed, and authentication, transport, parsing, and provider failures must become `UPSTREAM_UNAVAILABLE`. Whether a closed or inactive client resolves to a status-bearing identity or is rejected requires a verified product policy and addon behavior.

## Security observations

### Verified observations

- The admin UI mutation handler accepts caller-supplied `clientID` values. That is expected for a privileged WHMCS administration surface, but it would be dangerous to expose directly to OpenClaw or an AI-generated tool argument.
- The readable client-summary template injects Discord profile data and identifiers into an administrator page. It does not provide a minimal server-to-server response contract.
- The addon implementation cannot be audited from this package for SQL parameterization, authorization checks, secret handling, response minimization, or ambiguity handling.
- Ticket Bot stores multiple live-looking credentials directly in the supplied source archive, including the credentials used for WHMCS calls, and sends WHMCS credentials in query parameters. Those credentials should be considered exposed and rotated outside this documentation task.
- Ticket Bot logs caught request errors; Axios errors can include request configuration. Combined with query-string authentication, this creates an additional credential-disclosure risk.
- PteroAI loads WHMCS credentials from environment variables and form-posts them, but collapses all WHMCS JSON errors into an empty object.
- PteroAI's disabled owner command accepts an optional Discord ID. That operator capability must not become an agent-facing resolver argument.

### Required safeguards

- OpenClaw must never choose a WHMCS client ID.
- The authorization Discord ID must come from trusted request context, not a model-authored argument.
- Support Core must resolve that Discord ID through a narrowly scoped provider port and receive only the WHMCS client ID plus the status needed for policy.
- A resolver must not expose arbitrary addon commands, unrestricted SQL, complete WHMCS customer records, bot credentials, or WHMCS administrative credentials.
- Duplicate mappings, invalid responses, and unavailable upstreams must fail closed and must not leak raw upstream bodies or secrets into logs.

## Integration options

### A. Existing safe server-to-server addon API

The internal integrations verify that `GetClientID` exists at `/includes/api.php`, uses standard WHMCS API credentials, accepts `discordid`, and returns `clientid` on their success path. This is the preferred candidate because it keeps storage access inside WHMCS and already supports the required lookup direction. It is not yet proven safe for production until its no-match, authentication-error, ambiguity, client-status, and compatibility behavior is characterized.

### B. Small authenticated resolver in the existing addon

If the existing API is absent or unsuitable and the addon can be extended without modifying vendor-protected files, a narrow resolver is the next preferred option. It should accept only a canonical Discord user ID, execute the lookup beside the addon-owned storage, reject ambiguity, validate the WHMCS client, and return only `{ whmcsClientId, status }`. Deployment and upgrade ownership must be established first.

### C. WHMCS-side custom API action

A custom WHMCS API action can provide the same narrow contract while keeping WHMCS data access inside WHMCS. This is preferable to direct database coupling if it can reuse a supported addon service or a documented schema. It must not accept arbitrary client IDs and must use dedicated server-to-server authentication and least privilege.

### D. Direct addon-storage access from Support Core

This is the least desirable option. It would couple Support Core to an unknown private schema, bypass addon lifecycle logic, require database credentials and network access, and make upgrades risky. It cannot be evaluated until the schema and lifecycle are documented, and no MySQL dependency should be introduced for it in Task 2B.

## Recommended integration boundary

The stable boundary remains `CustomerIdentityResolver.resolveActor(actorContext)` in Support Core. Its implementation must derive the Discord ID from trusted `ActorContext` and call a WHMCS-side resolver that conceptually returns only:

```text
{
  whmcsClientId,
  status
}
```

The preferred implementation candidate is a dedicated adapter around the existing `GetClientID` custom WHMCS API action. It must form-post credentials and `discordid` server-side, take the Discord ID only from trusted `ActorContext`, validate a minimal response, and never expose the generic WHMCS API or accept a client ID from OpenClaw.

Do not reuse either internal client unchanged. Before production implementation, characterize the action's error and ambiguity semantics in an authorized non-production environment and establish whether it is a supported addon contract. Direct database access is not recommended.

No `0003` architecture decision is created by Task 2A.1. The interface is now known, but major security-relevant response semantics remain unresolved; committing to it as the production authority before those checks would be speculative.

## Remaining unknowns

The next investigation needs authoritative evidence for the remaining protected behavior:

1. Vendor documentation or a controlled test of `GetClientID`, including version support, exact success/no-match/authentication/error responses, intended callers, and rate limits.
2. Readable source or maintainer documentation for link creation, edit, lookup, unlink, and WHMCS-client validation paths.
3. The addon activation/migration definitions or a redacted `SHOW CREATE TABLE` result for addon-owned link tables, if any, including indexes and uniqueness constraints. A read-only schema description is sufficient; no database mutation is required.
4. Confirmed behavior for duplicates, relinking, unlink deletion, stale links, missing clients, and inactive/closed clients.
5. Confirmation of whether the addon supports multiple Discord identities, owners, team members, contacts, or sub-accounts.
6. Confirmation that the custom action is provided and supported by the Link Discord addon rather than another WHMCS customization.
7. A test environment or vendor-supported fixture that can exercise lookup and failure cases without production customer data.

## Task 2B implementation plan

Task 2B should be gated on characterizing the `GetClientID` response semantics above. Its proposed scope is:

1. Configure and manually run the characterization harness in an authorized non-production environment for linked, unlinked, malformed, empty, invalid-authentication, missing-authentication, and any already-available inactive/closed-client fixtures; record and review only sanitized results.
2. Confirm vendor support/ownership of the action and create ADR 0003 if the results establish a reliable authority contract.
3. Define a minimal internal response and explicit status/error mapping without exposing generic WHMCS actions or client selection to OpenClaw.
4. Implement a read-only `CustomerIdentityResolver` adapter in `packages/whmcs` that form-posts to `/includes/api.php`, accepts the trusted Discord ID from `ActorContext` only, and keeps credentials in runtime configuration.
5. Validate the Discord ID as a canonical decimal string, validate the response shape, reject ambiguity or inconsistent data, and distinguish not-linked from authentication/provider failure.
6. Optionally validate the returned client and obtain the required status through the narrowest supported WHMCS call, according to the verified policy.
7. Add contract tests for every characterized response and failure case.
8. Redact request credentials and sensitive identifiers from errors and logs, and add no database, Redis, queue, OpenClaw runtime dependency, or agent-facing customer-ID parameter.

Until the response semantics are verified, Task 2B must not treat every WHMCS error as `IDENTITY_NOT_LINKED`, implement table queries, or copy either internal client's credential handling.
