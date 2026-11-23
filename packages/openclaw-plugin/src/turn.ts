import { createHash, randomUUID } from "node:crypto";
import { HostingToolContracts } from "@support-ai-agent/contracts";
import { createHostingTools, HostingToolError } from "./index.js";
import { SUPPORT_KNOWLEDGE_WORKFLOW } from "./knowledge-workflow.js";

export interface HostingTurnRequest { sessionId: string; ticketToken: string; prompt: string; }
/** Narrow reviewed subset of v2026.9.8 PluginRuntimeCore and RunEmbeddedAgentParams. */
export interface OpenClawHostingRuntime {
  version: string;
  config: { current(): unknown };
  agent: {
    resolveAgentWorkspaceDir(config: unknown, agentId: string): string;
    runEmbeddedAgent(params: {
      sessionId: string; sessionKey: string; runId: string; agentId: string; workspaceDir: string;
      prompt: string; timeoutMs: number; abortSignal: AbortSignal; terminalReplyExpectation: "required";
      toolBindings: Readonly<Record<string, unknown>>; toolsAllow: string[]; toolExecutionAllow: string[];
    }): Promise<unknown>;
  };
}
export class HostingTurnError extends Error {
  constructor(readonly code: "INVALID_REQUEST" | "SESSION_DENIED" | "RUNTIME_UNAVAILABLE") {
    super(`Hosting turn failed (${code})`); this.name = "HostingTurnError";
  }
}

/** Only an authenticated bot transport calls this. Prompt bytes never confer authority. */
export function createHostingTurnHandler(
  coreBaseUrl: string, agentId: string, runtime: OpenClawHostingRuntime, fetchImpl: typeof fetch = fetch
): (input: unknown, signal?: AbortSignal) => Promise<{ reply: string }> {
  if (runtime.version !== "2026.9.8" || !/^[a-z][a-z0-9_-]{0,63}$/.test(agentId)) {
    throw new HostingTurnError("RUNTIME_UNAVAILABLE");
  }
  const sessions = new Map<string, { fingerprint: string; busy: boolean }>();
  return async (input, externalSignal) => {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new HostingTurnError("INVALID_REQUEST");
    const row = input as Record<string, unknown>;
    if (Object.keys(row).sort().join(",") !== "prompt,sessionId,ticketToken" ||
        typeof row.sessionId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(row.sessionId) ||
        typeof row.ticketToken !== "string" || row.ticketToken.length > 2048 ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{43}$/.test(row.ticketToken) ||
        typeof row.prompt !== "string" || !row.prompt.trim() || row.prompt.length > 4000) {
      throw new HostingTurnError("INVALID_REQUEST");
    }
    const request = row as unknown as HostingTurnRequest;
    const deadline = AbortSignal.timeout(45_000);
    const signal = externalSignal ? AbortSignal.any([externalSignal, deadline]) : deadline;
    const assertCurrent = () => signal.throwIfAborted();
    try {
      // Core verifies signature, expiry, authoritative ticket state AND linked customer first.
      await createHostingTools(coreBaseUrl, {
        assertCurrent, getTicketToken: () => Promise.resolve(request.ticketToken)
      }, fetchImpl).find((tool) => tool.name === "identify_customer")!.execute("trusted-turn-admission", {}, signal);
    } catch { throw new HostingTurnError("SESSION_DENIED"); }

    let fingerprint: string;
    try {
      // Only consume scope after Core has accepted the exact capsule. Never expose its contents.
      const claims: unknown = JSON.parse(Buffer.from(request.ticketToken.split(".")[0]!, "base64url").toString("utf8"));
      if (!claims || typeof claims !== "object" || !("scope" in claims)) throw new Error();
      if (!claims.scope || typeof claims.scope !== "object" || Array.isArray(claims.scope)) throw new Error();
      const scope = claims.scope as Record<string, unknown>;
      fingerprint = createHash("sha256").update(JSON.stringify({
        discordUserId: scope.discordUserId, guildId: scope.guildId, channelId: scope.channelId
      })).digest("hex");
    } catch { throw new HostingTurnError("SESSION_DENIED"); }
    const existing = sessions.get(request.sessionId);
    if ((existing && (existing.fingerprint !== fingerprint || existing.busy)) || (!existing && sessions.size >= 1000)) {
      throw new HostingTurnError("SESSION_DENIED");
    }
    const session = existing ?? { fingerprint, busy: false };
    session.busy = true;
    sessions.set(request.sessionId, session);
    try {
      assertCurrent();
      const names = Object.keys(HostingToolContracts);
      // Scope BOTH transcript identity and routing even after this registry/Gateway restarts.
      const identity = createHash("sha256").update(`${fingerprint}:${request.sessionId}`).digest();
      identity[6] = (identity[6]! & 0x0f) | 0x40;
      identity[8] = (identity[8]! & 0x3f) | 0x80;
      const hex = identity.subarray(0, 16).toString("hex");
      const scopedSessionId = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
      const result = await runtime.agent.runEmbeddedAgent({
        sessionId: scopedSessionId, sessionKey: `agent:${agentId}:hosting:${scopedSessionId}`, runId: randomUUID(),
        agentId, workspaceDir: runtime.agent.resolveAgentWorkspaceDir(runtime.config.current(), agentId),
        prompt: `${SUPPORT_KNOWLEDGE_WORKFLOW}\n\n客戶訊息 JSON\n${JSON.stringify(request.prompt)}`, timeoutMs: 45_000, abortSignal: signal, terminalReplyExpectation: "required",
        toolBindings: { "hosting-support": { ticketToken: request.ticketToken } },
        toolsAllow: names, toolExecutionAllow: names
      });
      assertCurrent();
      if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error();
      const response = result as Record<string, unknown>;
      const meta = response.meta;
      if (!meta || typeof meta !== "object" || Array.isArray(meta) ||
          (meta as Record<string, unknown>).error || (meta as Record<string, unknown>).aborted ||
          response.didSendViaMessagingTool || response.asyncWorkStarted || response.requesterContinuationSettled ||
          !Array.isArray(response.payloads)) throw new Error();
      const parts: string[] = [];
      for (const payload of response.payloads as unknown[]) {
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error();
        const part = payload as Record<string, unknown>;
        if (part.isError) throw new Error();
        if (part.isReasoning || part.isCommentary) continue;
        if (part.mediaUrl || part.mediaUrls || (part.text !== undefined && typeof part.text !== "string")) throw new Error();
        if (typeof part.text === "string" && part.text.trim()) parts.push(part.text);
      }
      const reply = parts.join("\n");
      if (!reply.trim() || reply.length > 6000 || reply.includes(request.ticketToken)) throw new Error();
      return { reply };
    } catch (error: unknown) {
      if (error instanceof HostingTurnError) throw error;
      if (error instanceof HostingToolError) throw new HostingTurnError("SESSION_DENIED");
      throw new HostingTurnError("RUNTIME_UNAVAILABLE");
    } finally { session.busy = false; }
  };
}
