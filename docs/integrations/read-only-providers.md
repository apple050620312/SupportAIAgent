# Read-only provider contract evidence

## Target versions

The operator reports WHMCS **9.0.9** and Pterodactyl **1.15.1**. This is deployment information, not proof that a live endpoint response matches the prototype. No live provider calls were made while implementing it.

## WHMCS

The existing Ticket Bot and disabled PteroAI call `GetClientsProducts` with a resolved `clientid`. Readable call sites use `products.product`, `id`, `name`, `clientid`/customer scoping, `status` and `servername`. PteroAI filters the marker `Pterodactyl`; Ticket Bot also supports other hosting backends. We do not copy their credential handling or mutation methods.

The official [GetClientsProducts reference](https://developers.whmcs.com/api-reference/getclientsproducts/) confirms the POST action, `clientid`, `limitstart`, `limitnum`, response pagination counters and example nested product list. The [GetClientsDetails reference](https://developers.whmcs.com/api-reference/getclientsdetails/) confirms a nested `client` record containing `id` and `status`; deprecated top-level client fields are not consumed. These documents describe the legacy action API currently used by the internal applications, not a switch to the new REST API.

Implementation rules in `packages/whmcs`:

- `VerifiedWhmcsCustomerResolver` wraps the provisional GetClientID candidate and performs one `GetClientsDetails` call. It requires the exact returned client ID, rejects inconsistent client ID aliases and allows `Active` only. It does not request optional statistics or retain names, emails or other client details. This Active-only access policy is a prototype recommendation for operator review, not discovered addon behavior.
- `WhmcsHostingServiceProvider` always includes the resolved `clientid`, reads all pages, checks page counters and a stable total, rejects duplicate service IDs and any row whose `clientid` differs. It caps reads at 1000 services with 50 per page, failing instead of returning a misleading partial result.
- The minimal domain object contains `serviceRef`, `customerRef`, `displayName`, mapped status and the optional `runtimeProvider: pterodactyl` marker. Passwords, billing fields, addresses, custom fields and raw rows are discarded.
- `findByReference` resolves the actor again and searches only that actor's scoped list. It never performs a global service lookup. A changed identity between Core and provider lookup fails Core's ownership comparison.
- Closed/inactive/missing client errors remain safe provider failures, not `IDENTITY_NOT_LINKED`. GetClientID ambiguity and no-match behavior are still unresolved.

The internal reference encodings are `whmcs:<client ID>` and `whmcs-service:<service ID>`. Only service references cross the agent-facing API. Positive IDs are canonical safe integer strings; Discord snowflakes use the separate unsigned-64-bit string policy.

## Pterodactyl 1.15.1

`PteroAI-main/cmds/cmd.py`, `Cmd.ai`, uses the selected WHMCS product's `id` at `/application/servers/external/<service ID>`, then consumes returned server identifiers. That function is disabled in the supplied archive, so it is evidence of a mapping convention, not proof of the current deployment.

Official tagged source inspected:

- [application routes](https://github.com/pterodactyl/panel/blob/v1.15.1/routes/api-application.php) and [ExternalServerController](https://github.com/pterodactyl/panel/blob/v1.15.1/app/Http/Controllers/Api/Application/Servers/ExternalServerController.php) establish `GET /api/application/servers/external/{external_id}`. It queries the server by external ID and uses `firstOrFail`.
- [ServerTransformer](https://github.com/pterodactyl/panel/blob/v1.15.1/app/Transformers/Api/Application/ServerTransformer.php) establishes returned `id`, `external_id`, `uuid`, name, status, suspended flag and memory/disk limits. It also returns sensitive container environment data; that data is never projected out of the adapter.
- [client routes](https://github.com/pterodactyl/panel/blob/v1.15.1/routes/api-client.php) establish `GET /api/client/servers/{server}/resources`.
- [SubstituteClientBindings](https://github.com/pterodactyl/panel/blob/v1.15.1/app/Http/Middleware/Api/Client/SubstituteClientBindings.php) accepts full UUIDs, older short UUIDs and `serv_` identifiers. The adapter uses the full UUID returned by the application lookup, avoiding the version-dependent short identifier format.
- [StatsTransformer](https://github.com/pterodactyl/panel/blob/v1.15.1/app/Transformers/Api/Client/StatsTransformer.php) establishes `current_state`, `is_suspended` and `resources.memory_bytes`, `cpu_absolute`, `disk_bytes`.
- [ServerDetailsBlock](https://github.com/pterodactyl/panel/blob/v1.15.1/resources/scripts/components/server/console/ServerDetailsBlock.tsx) compares byte usage with configured limits using 1024-based conversions, supporting the MiB-to-byte projection used here.
- [Server model](https://github.com/pterodactyl/panel/blob/v1.15.1/app/Models/Server.php) declares an external-ID uniqueness validation rule. This does not prove deployed database constraints or WHMCS Discord mapping uniqueness.

`PterodactylGameServerProvider` requires explicit `externalIdStrategy: whmcs-service-id`. The operator must confirm that convention. It queries only an active, proven-owned Pterodactyl service, verifies the returned external ID and UUID, and separately uses application and client API credentials. Credentials stay in Authorization headers, never URLs or agent tools.

Application lookup 404 means no corresponding server; 401/403/429/5xx and client resources 404 are upstream failures. Suspended/installing/transfer states fail closed. Unknown runtime states remain `unknown`. Resource values must be nonnegative and safely representable; CPU may exceed 100 percent. Memory/disk limits are converted from MiB to bytes and zero limits are omitted as unlimited.

The application's Core-owned ownership chain is still essential even if the panel key can see many servers. No global server listing, WebSocket console, file read/write, command, power, reinstall, suspend or delete call is implemented.

## Transport and remaining live checks

`packages/provider-http` is internal transport shared by provider adapters, not an agent capability. It enforces HTTPS installation bases, ten-second abort signals, no redirects/retries, bounded 512 KiB streamed JSON, and static sanitized errors without request/response causes. Core business logic continues to depend only on ports.

The live operator tests must verify 9.0.9 client/product response nesting and empty/pagination forms, the exact backend marker, deployed external IDs, Pterodactyl key scopes and availability, state policy and least privilege. Source evidence and synthetic mocks are not live compatibility certification. Follow [the manual test guide](../testing-read-only-support.md) before enabling anything.
