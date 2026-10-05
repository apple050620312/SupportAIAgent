import { Type, type Static } from "@sinclair/typebox";

const serviceRef = Type.String({ pattern: "^whmcs-service:[1-9][0-9]{0,15}$" });
const filePath = Type.String({
  minLength: 1, maxLength: 512,
  pattern: "^/(?!.*(?:^|/)\\.\\.(?:/|$))[^\\u0000\\r\\n]*$"
});
const boundedText = Type.String({ minLength: 1, maxLength: 262_144 });

export const RestartServerRequestSchema = Type.Object({
  serviceRef
}, { additionalProperties: false });
export const RestartServerResponseSchema = Type.Object({
  requested: Type.Literal(true), operation: Type.Literal("restart_server")
}, { additionalProperties: false });
export type RestartServerRequest = Static<typeof RestartServerRequestSchema>;
export type RestartServerResponse = Static<typeof RestartServerResponseSchema>;

const powerAction = Type.Object({
  operation: Type.Literal("power"), serviceRef,
  action: Type.Union([Type.Literal("start"), Type.Literal("stop"), Type.Literal("kill")])
}, { additionalProperties: false });
const writeFile = Type.Object({ operation: Type.Literal("write_file"), serviceRef, path: filePath, content: boundedText }, { additionalProperties: false });
const moveFile = Type.Object({ operation: Type.Literal("move_file"), serviceRef, from: filePath, to: filePath }, { additionalProperties: false });
const startupVariable = Type.Object({ operation: Type.Literal("update_startup_variable"), serviceRef,
  key: Type.String({ minLength: 1, maxLength: 128, pattern: "^[A-Za-z_][A-Za-z0-9_]*$" }),
  value: Type.String({ maxLength: 4096 })
}, { additionalProperties: false });
const dockerImage = Type.Object({ operation: Type.Literal("update_docker_image"), serviceRef,
  image: Type.String({ minLength: 1, maxLength: 512, pattern: "^[A-Za-z0-9][A-Za-z0-9._/:@-]*$" })
}, { additionalProperties: false });
const reinstall = Type.Object({ operation: Type.Literal("reinstall"), serviceRef }, { additionalProperties: false });
const suspension = Type.Object({ operation: Type.Union([Type.Literal("suspend"), Type.Literal("unsuspend")]), serviceRef }, { additionalProperties: false });

/** Model-facing mutation proposal. It never contains a provider ID or credential. */
export const MutationOperationSchema = Type.Union([
  powerAction, writeFile, moveFile, startupVariable, dockerImage, reinstall, suspension
]);
export type MutationOperation = Static<typeof MutationOperationSchema>;

export const MutationProposalResponseSchema = Type.Object({
  requested: Type.Literal(true), approvalId: Type.String({ pattern: "^[0-9a-f-]{36}$" }),
  operationDigest: Type.String({ pattern: "^[0-9a-f]{64}$" }), expiresAt: Type.Integer({ minimum: 0 })
}, { additionalProperties: false });
export type MutationProposalResponse = Static<typeof MutationProposalResponseSchema>;

export const ExecuteMutationRequestSchema = Type.Object({
  approvalId: Type.String({ pattern: "^[0-9a-f-]{36}$" })
}, { additionalProperties: false });
export const ExecuteMutationResponseSchema = Type.Object({
  executed: Type.Literal(true), operation: Type.String({ minLength: 1, maxLength: 64 })
}, { additionalProperties: false });
export type ExecuteMutationRequest = Static<typeof ExecuteMutationRequestSchema>;
export type ExecuteMutationResponse = Static<typeof ExecuteMutationResponseSchema>;

export const FileListEntrySchema = Type.Object({ name: Type.String({ minLength: 1, maxLength: 191 }), directory: Type.Boolean() }, { additionalProperties: false });
export const FileListResponseSchema = Type.Object({ path: filePath, entries: Type.Array(FileListEntrySchema, { maxItems: 1000 }) }, { additionalProperties: false });
export const FileContentsResponseSchema = Type.Object({ path: filePath, content: Type.String({ maxLength: 262_144 }) }, { additionalProperties: false });
export type FileListResponse = Static<typeof FileListResponseSchema>;
export type FileContentsResponse = Static<typeof FileContentsResponseSchema>;
export const StartupVariableSchema = Type.Object({
  key: Type.String({ minLength: 1, maxLength: 128 }), value: Type.String({ maxLength: 4096 }), editable: Type.Boolean()
}, { additionalProperties: false });
export const StartupConfigResponseSchema = Type.Object({
  startupCommand: Type.String({ maxLength: 4096 }), dockerImages: Type.Array(Type.String({ maxLength: 512 }), { maxItems: 32 }),
  variables: Type.Array(StartupVariableSchema, { maxItems: 256 })
}, { additionalProperties: false });
export type StartupConfigResponse = Static<typeof StartupConfigResponseSchema>;
