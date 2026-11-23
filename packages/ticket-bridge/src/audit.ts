import { Value } from "@sinclair/typebox/value";
import { SupportAuditEventSchema, type SupportAuditEvent } from "@support-ai-agent/contracts";

export interface AuditRecorder { record(event: SupportAuditEvent): Promise<void>; }

/** No retries or buffering after uncertain sends. Slots remain held until underlying sends settle. */
export function createSupportAuditRecorder(
  send: (text: string) => Promise<unknown>,
  onFailure: (code: "SUPPORT_AUDIT_UNAVAILABLE") => void,
  timeoutMs = 2000
): AuditRecorder {
  let pending = 0;
  const fail = () => { try { onFailure("SUPPORT_AUDIT_UNAVAILABLE"); } catch { /* Never affect customer authority. */ } };
  return { async record(event) {
    if (!Value.Check(SupportAuditEventSchema, event) || pending >= 16) { fail(); return; }
    // Explicit projection: even a caller passing extra sensitive fields cannot serialize them.
    const text = JSON.stringify({ operation: event.operation, outcome: event.outcome, correlationId: event.correlationId });
    pending++;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const delivery = Promise.resolve().then(() => send(text)).finally(() => { pending--; });
    try {
      await Promise.race([delivery, new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error()), timeoutMs);
      })]);
    } catch { fail(); }
    finally { clearTimeout(timer); }
  } };
}
