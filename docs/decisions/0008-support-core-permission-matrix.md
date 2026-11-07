# ADR 0008: Freeze the Support Core tool authorization contract

- Status: Accepted for offline implementation; durable human receipt and channel-confirmation adapters remain deployment gates
- Date: 2026-11-07

Support Core owns the allowlist in `services/permission-matrix.ts`; the agent loop is unchanged. Unknown tools and all T3 capabilities (cross-customer, credential rotation, bulk operations) are absent. No generic provider request/query tool exists.

| Tool | Tier | Required scope and gate |
| --- | --- | --- |
| identify_customer | T0 | customer:read; resolve trusted Discord actor |
| list_my_services | T0 | customer:read; validate all returned ownership |
| get_service_details | T0 | server:read; trusted ticket selection + fresh ownership |
| list_my_servers | T0 | server:read; owned active services only |
| get_my_server_status | T0 | server:read; trusted selection + fresh ownership |
| get_my_server_resources | T0 | server:read; trusted selection + fresh ownership |
| list_my_files | T0 | server:read; trusted selection + fresh ownership; bounded adapter file policy |
| read_my_file | T0 | server:read; trusted selection + fresh ownership; adapter redaction/path policy |
| get_my_startup_config | T0 | server:read; trusted selection + fresh ownership; adapter redaction |
| search_support_knowledge | T0 | knowledge:read; cited, reference-only results |
| read_support_article | T0 | knowledge:read; versioned citations, reference-only contents |
| get_invoice | T0 | invoice:read; empty input, trusted ticket invoice selection, fresh customer ownership |
| get_server_logs | T0 | server:read; empty input, trusted ticket server selection, fresh ownership; bounded redacted untrusted lines |
| handoff_to_staff | T0 | ticket:handoff; authenticated authoritative ticket lifecycle |
| restart_server (existing agent alias restart_my_server) | T1 | server:restart; trusted confirmation in channel for this server OR explicit operator-reviewed autonomous recovery exception; selected owned active server, running state, 2-minute server cooldown, single ticket+server reservation before dispatch |
| propose_mutation | T2 | server:propose; typed operation, trusted selection + fresh customer/server resolution; proposal grants no execution authority |
| execute_approved_mutation | T2 | server:mutate; single-use local proposal plus durable human receipt; exact customer/server/action/amount/currency/digest and ticket scope/revision binding; fresh ownership and server mapping check; readback |

## Trusted inputs and execution

Signed capsules and authoritative ticket snapshots remain mandatory. Every invocation resolves the customer server-side, including knowledge/handoff requests. Grants come only from `ToolPermissionProvider`, never ticket text, log contents or model flags. Absent a grant adapter, only T0 scopes exist. Caller-supplied service references in legacy narrow routes are compatibility hints: Core requires equality with `SelectedResourceProvider`'s trusted ticket selection before ownership lookup. They cannot select a different resource. No customer IDs or server UUIDs are tool inputs. Missing selection fails closed. Unknown and wrong-owner resources return the same 404 response.

The new invoice/log routes accept only `{}`. Their ports have no live adapters or agent registration in this step. Shared contracts remain pure TypeBox, per AGENTS.md/ADR 0001. Support Core additionally validates normalized tool inputs with local strict Zod schemas; complex existing discriminated contracts use Zod refinements over their TypeBox validators to avoid divergent definitions. A future loop adapter may reuse these fixed schemas without owning authorization.

Restart confirmation must come from an authenticated in-channel customer event bound to the ticket/server, not a sentence claiming confirmation. The trusted adapter controls the narrowly reviewed recovery exception. Cooldown is keyed by resolved server (so different actors cannot bypass it). Idempotency reservation is per guild+ticket+server and remains reserved after uncertain execution. These process-local restart guards are an offline prototype, not cross-process/restart guarantees.

## Durable approvals without adding a store

ADR 0006's process-local approval is insufficient for T2 execution. `DurableHumanApprovalProvider.consume` must atomically validate the exact transaction, trusted human approval, expiry, ticket scope/revision and single-use state in an existing authoritative external approval system. The port receives Core-resolved customer and server, the action and full operation digest. The local store deep-copies proposals and outputs so callers cannot alter approved operations through shared references. Changed ownership or server mapping requires a new proposal/approval. Consuming before execution is intentional: uncertainty never permits automatic retry.

There is deliberately no production durable adapter, database, Redis or queue. Without a durable receipt adapter, T2 fails closed even after local staff approval. Offline tests use a synthetic receipt double, which does not claim durability. Existing hosting mutations carry amount zero and currency NONE. Refunds, charged plan changes, world reset and deletion have no execution contract/provider implementation and remain unavailable, rather than silently reusing a hosting approval. Any future monetary tool must supply exact amount/currency and its own port/tests before inclusion. Suspension is conservatively T2; cross-customer and bulk variants remain absent.

## Append-only audit

`ToolInvocationAudit` is a separate protected staff-only append sink, not the existing privacy-minimal best-effort telemetry. Each invocation has an attempt and completion record with invocation ID, trusted actor/customer where known, tool, input digest, policy decision, approval reference when consumed, and outcome. Authentication failures have null actor/customer. Inputs are serialized structured request snapshots hashed with SHA-256; raw ticket/log/file/knowledge text and bearer tokens are excluded to avoid recording secrets. The initial attempt hashes the request URL; validated inputs have a subsequent digest. No raw errors are recorded. Policy/approval checks and a successful audit append precede dispatch; missing/failing audit denies execution. A sink outage after provider dispatch cannot roll back a provider action; the preceding append remains evidence of an uncertain attempt. Production sink durability, restricted retention/access and alerting remain operator responsibilities.

Existing normal startup remains health-only. Opt-in delivery now also needs an invocation audit sink and trusted resource selection; the manual live launcher is intentionally not wired with invented adapters here. No provider/Discord/model/OpenClaw requests were made. No agent-loop changes, SDK migration, tracing service or golden ticket dataset are included in this step.
