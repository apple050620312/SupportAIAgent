import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import type { ShadowVerdictEntry } from "@support-ai-agent/ticket-bridge";
import { createShadowVerdictRecorder } from "../lib/shadow-verdict-log.js";

it("appends only verdict metadata and preserves existing lines across recorder instances", async () => {
  const root = await mkdtemp(join(tmpdir(), "shadow-verdict-"));
  try {
    const record = createShadowVerdictRecorder(root);
    const first: ShadowVerdictEntry = {
      timestamp: "2026-11-23T00:00:00.000Z", channelId: "123", staffId: "456", verdict: "accepted-as-is"
    };
    await record(first);
    const second = { ...first, verdict: "accepted-with-edits" as const };
    const recordAfterRestart = createShadowVerdictRecorder(root);
    const withExtraData = { ...second, draftText: "Synthetic private text" };
    const third = { ...first, verdict: "rejected" as const };
    await Promise.all([recordAfterRestart(withExtraData), recordAfterRestart(third)]);
    const log = await readFile(join(root, "verdicts.jsonl"), "utf8");
    expect(log).toBe([first, second, third].map(entry => JSON.stringify({
      timestamp: entry.timestamp, channelId: entry.channelId, verdict: entry.verdict, staffId: entry.staffId
    }) + "\n").join(""));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
