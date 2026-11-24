import { createHash } from "node:crypto";
import { isCanonicalDiscordSnowflake } from "@support-ai-agent/contracts";

export interface ManagementActor {
  readonly guildId: string;
  readonly channelId: string;
  readonly userId: string;
  readonly roleIds: readonly string[];
}

export interface ManagementAccess {
  readonly guildId: string;
  readonly channelId: string;
  readonly ownerUserId: string;
  readonly staffUserIds: ReadonlySet<string>;
  readonly staffRoleIds: ReadonlySet<string>;
}

/** Set by trusted management delivery from the event, outside agent/tool arguments. */
export interface TeachingSource {
  readonly kind: "standing_policy" | "customer_transcript" | "ticket_reply" | "golden_reference" | "eval_artifact";
  readonly actor: ManagementActor;
  readonly messageId: string;
  readonly at: string;
  readonly text: string;
}

export class TeachingError extends Error {
  constructor(readonly code: "forbidden" | "ineligible" | "invalid_edit" | "stale" | "conflict" | "not_found") {
    super(`Teaching workflow: ${code}`);
  }
}

export class ManagementPolicy {
  constructor(readonly config: ManagementAccess) {
    if (![config.guildId, config.channelId, config.ownerUserId, ...config.staffUserIds, ...config.staffRoleIds]
      .every(isCanonicalDiscordSnowflake)) throw new Error("Invalid management access configuration");
  }

  assertStaff(actor: ManagementActor): void {
    const { guildId, channelId, ownerUserId, staffUserIds, staffRoleIds } = this.config;
    if (actor.guildId !== guildId || actor.channelId !== channelId || !isCanonicalDiscordSnowflake(actor.userId) ||
        (actor.userId !== ownerUserId && !staffUserIds.has(actor.userId) && !actor.roleIds.some(id => staffRoleIds.has(id)))) {
      throw new TeachingError("forbidden");
    }
  }

  assertOwner(actor: ManagementActor): void {
    this.assertStaff(actor);
    if (actor.userId !== this.config.ownerUserId) throw new TeachingError("forbidden");
  }

  assertTeaching(source: TeachingSource): void {
    this.assertStaff(source.actor);
    const ruling = /^(?:教學|還原 [0-9a-f-]{36})[：:]\s*([\s\S]+)$/u.exec(source.text)?.[1];
    if (source.kind !== "standing_policy" || !isCanonicalDiscordSnowflake(source.messageId) ||
        !/^\d{4}-\d{2}-\d{2}T/u.test(source.at) || !Number.isFinite(Date.parse(source.at)) ||
        source.text.length > 4_000 || !ruling?.trim() || containsIneligibleMaterial(ruling)) {
      throw new TeachingError("ineligible");
    }
  }
}

export function containsIneligibleMaterial(text: string): boolean {
  const normalized = text.normalize("NFKC");
  return /\b(?:GS-\d+|golden[-_ ]set|staff_resolution|expected_points|eval[-_ ](?:results?|artifacts?)|customer[-_ ]transcript)\b/iu.test(normalized) ||
    /(?:^|\n)\s*(?:customer|staff|admin|agent|客戶|使用者|客服|管理員)\s*:/iu.test(normalized) ||
    /https?:\/\/(?:\w+\.)?discord(?:app)?\.com\/channels\/\d+\/\d+\/\d+|\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}/iu.test(normalized) ||
    [...normalized].some(char => isControl(char) && !["\t", "\n", "\r"].includes(char));
}

export function isControl(char: string): boolean {
  const code = char.charCodeAt(0);
  return code < 32 || code === 127;
}

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
