import { appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { ShadowVerdictEntry } from "@support-ai-agent/ticket-bridge";

export function createShadowVerdictRecorder(root: string) {
  const file = join(root, "verdicts.jsonl");
  let tail = Promise.resolve();
  return ({ timestamp, channelId, verdict, staffId }: ShadowVerdictEntry): Promise<void> => {
    const line = JSON.stringify({ timestamp, channelId, verdict, staffId }) + "\n";
    const written = tail.then(() => appendFile(file, line, { mode: 0o600 }));
    tail = written.catch(() => undefined);
    return written;
  };
}
