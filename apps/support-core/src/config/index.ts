export interface SupportCoreConfig {
  readonly host: string;
  readonly port: number;
  readonly logLevel: string;
}

export function loadConfig(environment: NodeJS.ProcessEnv = process.env): SupportCoreConfig {
  const portText = environment["SUPPORT_CORE_PORT"] ?? "3000";
  const port = Number(portText);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("SUPPORT_CORE_PORT must be an integer between 1 and 65535");
  }

  return {
    host: environment["SUPPORT_CORE_HOST"] ?? "127.0.0.1",
    port,
    logLevel: environment["LOG_LEVEL"] ?? "info"
  };
}
