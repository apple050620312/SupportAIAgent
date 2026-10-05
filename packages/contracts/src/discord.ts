/** Conservative local input policy, not a claim about addon storage. */
export function isCanonicalDiscordSnowflake(value: unknown): value is string {
  return typeof value === "string" &&
    /^[1-9][0-9]{16,19}$/.test(value) &&
    BigInt(value) <= 18_446_744_073_709_551_615n;
}
