import { buildApp } from "./app.js";
import { loadConfig } from "./config/index.js";

const config = loadConfig();
const app = buildApp({ logger: { level: config.logLevel } });

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error: unknown) {
  app.log.error({ err: error }, "Support Core failed to start");
  process.exitCode = 1;
}
