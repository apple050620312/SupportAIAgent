import { isAbsolute, resolve } from "node:path";

/** Capture before the unchanged Ticket Bot changes cwd and replaces process.env. */
export function supportKnowledgeRoot(environment: Readonly<Record<string, string | undefined>>): string {
  const root = environment.SUPPORT_KNOWLEDGE_ROOT;
  if (root === undefined || root === "") return resolve(import.meta.dirname, "../../knowledge");
  if (!isAbsolute(root) || root.startsWith("REPLACE_")) throw new Error("SUPPORT_KNOWLEDGE_ROOT must be an absolute folder path");
  return resolve(root);
}
