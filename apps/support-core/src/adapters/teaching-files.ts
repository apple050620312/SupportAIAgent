import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, readdir, realpath, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

function hasCode(error: unknown, code: string): boolean {
  return (error as NodeJS.ErrnoException | undefined)?.code === code;
}

/** Each caller starts from the configured canonical root and creates one level at a time. */
export async function checkedDirectory(path: string, create = false): Promise<boolean> {
  const stat = await lstat(path).catch((error: unknown) => {
    if (hasCode(error, "ENOENT")) return null;
    throw error;
  });
  if (!stat) {
    if (!create) return false;
    await mkdir(path, { mode: 0o700 }).catch((error: unknown) => {
      if (!hasCode(error, "EEXIST")) throw error;
    });
    await syncDirectory(dirname(path));
    return checkedDirectory(path);
  }
  if (!stat.isDirectory() || await realpath(path) !== path) throw new Error("Unsafe teaching directory");
  return true;
}

export async function syncDirectory(path: string): Promise<void> {
  const directory = await open(path, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  try { await directory.sync(); }
  finally { await directory.close(); }
}

export async function writePrivateFile(path: string, contents: string): Promise<void> {
  const file = await open(path, "wx", 0o600);
  try {
    await file.writeFile(contents, "utf8");
    await file.sync();
  } finally { await file.close(); }
}

export async function readPrivateFile(path: string): Promise<string> {
  const file = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try {
    if (!(await file.stat()).isFile()) throw new Error("Invalid teaching file");
    return await file.readFile("utf8");
  } finally { await file.close(); }
}

export async function teachingDirectory(root: string, directory: string, create = false): Promise<string | null> {
  if (!await checkedDirectory(root)) throw new Error("Knowledge root is unavailable");
  const state = join(root, ".teachable");
  const path = join(state, directory);
  return await checkedDirectory(state, create) && await checkedDirectory(path, create) ? path : null;
}

/** Publishing the next numbered entry with link is atomic across processes. Entries are immutable. */
export class FileWorkflowJournal<Row> {
  #rows: Row[] = [];
  #reading: Promise<readonly Row[]> | undefined;

  constructor(private readonly root: string, private readonly directory: "teaching" | "relay") {}

  read(): Promise<readonly Row[]> {
    return this.#reading ??= this.load().finally(() => { this.#reading = undefined; });
  }

  private async load(): Promise<readonly Row[]> {
    const directory = await teachingDirectory(this.root, this.directory);
    if (!directory) {
      if (this.#rows.length) throw new Error("Teaching journal is missing");
      return [];
    }
    const entries = (await readdir(directory)).filter(name => /^\d{12}\.json$/u.test(name)).sort();
    if (entries.length < this.#rows.length) throw new Error("Teaching journal is incomplete");
    for (let i = this.#rows.length; i < entries.length; i++) {
      if (entries[i] !== this.filename(i + 1)) throw new Error("Teaching journal is incomplete");
      this.#rows.push(JSON.parse(await readPrivateFile(join(directory, entries[i]!))) as Row);
    }
    return this.#rows.slice();
  }

  async append(expectedVersion: number, row: Row): Promise<boolean> {
    const directory = (await teachingDirectory(this.root, this.directory, true))!;
    const temporary = join(directory, `.${randomUUID()}.tmp`);
    try {
      await writePrivateFile(temporary, JSON.stringify(row));
      try { await link(temporary, join(directory, this.filename(expectedVersion + 1))); }
      catch (error) {
        if (hasCode(error, "EEXIST")) return false;
        throw error;
      }
      await syncDirectory(directory);
      return true;
    } finally {
      await rm(temporary, { force: true }).catch(() => undefined);
    }
  }

  private filename(version: number): string {
    return `${String(version).padStart(12, "0")}.json`;
  }
}
