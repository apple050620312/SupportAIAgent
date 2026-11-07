import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

export interface HistoryMessage { role: "user" | "assistant"; content: string }
/** Interim single-host disk persistence. Postgres/Redis needs a deployment ADR.
 * Lock directories fail closed across processes; stale locks require operator recovery.
 * Store only dialogue, never capsules, provider credentials or raw tool results.
 */
export class FileHistoryStore {
  constructor(private readonly root = resolve(".agent-history")) {}

  async withSession<T>(key: string, action: (messages: HistoryMessage[], save: (messages: HistoryMessage[]) => Promise<void>) => Promise<T>): Promise<T> {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const path = resolve(this.root, `${createHash("sha256").update(key).digest("hex")}.json`);
    const lock = `${path}.lock`;
    try { await mkdir(lock, { mode: 0o700 }); }
    catch { throw new Error("Session busy or unavailable"); }
    try {
      let messages: HistoryMessage[] = [];
      try {
        const raw = await readFile(path, "utf8");
        if (raw.length > 1_000_000) throw new Error("History too large");
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || parsed.length > 40 || !parsed.every((item: unknown) =>
          typeof item === "object" && item !== null && "role" in item && ["user", "assistant"].includes(String(item.role)) &&
          "content" in item && typeof item.content === "string" && item.content.length <= 6000 && Object.keys(item).length === 2)) {
          throw new Error("Invalid history");
        }
        messages = parsed as HistoryMessage[];
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw new Error("History unavailable");
      }
      return await action(messages, async (next) => {
        const temp = `${path}.${randomUUID()}.tmp`;
        try {
          await writeFile(temp, JSON.stringify(next.slice(-40)), { mode: 0o600, flag: "wx" });
          await rename(temp, path);
        } finally { await rm(temp, { force: true }); }
      });
    } finally { await rm(lock, { recursive: true, force: true }); }
  }
}
