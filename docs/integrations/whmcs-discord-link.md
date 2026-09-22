# WHMCS Discord Link Integration

## Investigation status

This investigation inspected the supplied `AndrezzzLinkDiscord` version 1.7 source tree. The addon implementation is not available as readable PHP: `AndrezzzLinkDiscord.php`, `functions.php`, `hooks.php`, `public.php`, and every event hook under `hooks/` are ionCube-encoded. The readable material is limited to `whmcs.json`, Smarty templates, and third-party vendor code.

Consequently, the package does not contain enough readable source to verify the storage schema, lookup implementation, cardinality, lifecycle semantics, or backend API authentication. This document separates the limited facts verified from readable files from recommendations and unresolved questions. No production adapter or architecture decision is justified yet.

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

The only concrete callable surface visible in readable files is the WHMCS admin-page AJAX handler at `addonmodules.php?module=AndrezzzLinkDiscord&ajax=1&action=...`. The readable templates use it for administrative mutations, including arbitrary `clientID` input. No readable template invokes a Discord-ID-to-client resolver action.

This admin AJAX surface is not a verified or suitable server-to-server identity resolver.

### Advertised but unverified

`whmcs.json` says "Backend API available to use." The implementation or documentation for that API is not present in readable form. The supplied source does not reveal:

- its URL or WHMCS Local API action name;
- supported commands and whether Discord-ID lookup exists;
- request and response schemas;
- authentication, authorization, replay protection, or network assumptions;
- whether it is public, internal, or intended only for the existing Discord bot;
- whether it accepts a caller-selected WHMCS client ID;
- whether it returns a minimal client reference or a complete customer record.

No readable public/internal API, WHMCS Local API extension, callable PHP service/class, lookup hook, or stable database query could be verified.

## Authentication model

The authentication model is **unknown**.

The visible administrative AJAX calls are emitted from WHMCS admin templates through `WHMCS.http.jqClient`, but session checks, administrator permissions, CSRF validation, and server-side input validation are encoded. Their presence or strength must not be assumed.

Authentication for the advertised Backend API and the Discord linking flow is also encoded. No server-to-server credential format or trust boundary can be documented from the supplied package. No secret values were inspected or reproduced during this investigation.

## Failure cases

Actual addon behavior is unknown for:

- an unlinked Discord account;
- malformed, non-decimal, empty, or out-of-range Discord IDs;
- duplicate or ambiguous mappings;
- a mapping whose WHMCS client no longer exists;
- closed or inactive WHMCS clients;
- stale mappings after unlinking or account deletion;
- Discord or WHMCS upstream unavailability;
- unauthorized or replayed API requests.

The Support Core resolver must eventually define these outcomes explicitly. At minimum, no match should become `IDENTITY_NOT_LINKED`, ambiguity must fail closed, and transport/provider failures must become `UPSTREAM_UNAVAILABLE`. Whether a closed or inactive client resolves to a status-bearing identity or is rejected requires a verified product policy and addon behavior.

## Security observations

### Verified observations

- The admin UI mutation handler accepts caller-supplied `clientID` values. That is expected for a privileged WHMCS administration surface, but it would be dangerous to expose directly to OpenClaw or an AI-generated tool argument.
- The readable client-summary template injects Discord profile data and identifiers into an administrator page. It does not provide a minimal server-to-server response contract.
- The addon implementation cannot be audited from this package for SQL parameterization, authorization checks, secret handling, response minimization, or ambiguity handling.

### Required safeguards

- OpenClaw must never choose a WHMCS client ID.
- The authorization Discord ID must come from trusted request context, not a model-authored argument.
- Support Core must resolve that Discord ID through a narrowly scoped provider port and receive only the WHMCS client ID plus the status needed for policy.
- A resolver must not expose arbitrary addon commands, unrestricted SQL, complete WHMCS customer records, bot credentials, or WHMCS administrative credentials.
- Duplicate mappings, invalid responses, and unavailable upstreams must fail closed and must not leak raw upstream bodies or secrets into logs.

## Integration options

### A. Existing safe server-to-server addon API

This remains the preferred option only if the advertised Backend API is documented and verified to support Discord ID to WHMCS client ID lookup with strong server-to-server authentication and a minimal response. The supplied package does not provide enough evidence to select it.

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

There is not enough verified information to decide whether that WHMCS-side resolver should use the addon's existing Backend API or a new narrow addon/custom API action. Do not implement an adapter until that interface is verified. Direct database access is not recommended.

No `0003` architecture decision is created by Task 2A because choosing an interface without the missing API and storage facts would be speculative.

## Remaining unknowns

The next investigation needs at least one authoritative source that exposes the protected behavior:

1. Vendor documentation for the advertised Backend API, including version, commands, URL/action, authentication, authorization, request/response examples with redacted credentials, error semantics, and intended callers.
2. Readable source or maintainer documentation for link creation, edit, lookup, unlink, and WHMCS-client validation paths.
3. The addon activation/migration definitions or a redacted `SHOW CREATE TABLE` result for addon-owned link tables, if any, including indexes and uniqueness constraints. A read-only schema description is sufficient; no database mutation is required.
4. Confirmed behavior for duplicates, relinking, unlink deletion, stale links, missing clients, and inactive/closed clients.
5. Confirmation of whether the addon supports multiple Discord identities, owners, team members, contacts, or sub-accounts.
6. A test environment or vendor-supported fixture that can exercise lookup and failure cases without production customer data.

## Task 2B implementation plan

Task 2B should be gated on resolving the unknowns above. Its proposed scope is:

1. Select and document the verified WHMCS-side resolver interface; create ADR 0003 at that point.
2. Define the minimal adapter request/response and explicit status/error mapping without exposing WHMCS client selection to OpenClaw.
3. Implement a read-only `CustomerIdentityResolver` adapter in `packages/whmcs` that accepts the trusted Discord ID from `ActorContext` only.
4. Validate the Discord ID as a canonical decimal string, reject malformed or ambiguous responses, and map not-linked and upstream failures to the existing domain behavior.
5. Add contract tests for linked, unlinked, malformed, duplicate/ambiguous, missing-client, inactive/closed-client, unauthorized, and upstream-unavailable cases according to the verified interface.
6. Keep provider credentials inside the adapter, redact identifiers as required by logging policy, and add no database, Redis, queue, OpenClaw runtime dependency, or agent-facing customer-ID parameter.

Until the authoritative API or storage information is available, Task 2B must not implement speculative endpoint names, table queries, or authentication.
