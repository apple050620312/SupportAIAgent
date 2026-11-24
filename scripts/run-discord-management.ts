import { Client, Events } from "discord.js";
import { DiscordManagementConfigError, managementIntents, prepareDiscordManagement } from "./lib/discord-management-setup.js";

const startupFailure = "Discord management gateway startup failed";

export async function startDiscordManagement(environment: NodeJS.ProcessEnv) {
  let management: ReturnType<typeof prepareDiscordManagement>;
  try {
    management = prepareDiscordManagement(environment);
  } catch (error) {
    if (error instanceof DiscordManagementConfigError) throw error;
    throw new DiscordManagementConfigError("Invalid Discord management model, embeddings or knowledge settings");
  }

  const client = new Client({ intents: managementIntents });
  const reportGatewayError = () => console.error("Discord management gateway error");
  client.on(Events.Error, reportGatewayError);
  client.on(Events.ShardError, reportGatewayError);
  client.once(Events.ClientReady, () => console.log("Discord management ready"));
  const detach = management.attach(client, () => console.error("Discord management handler failed"));
  const close = async () => {
    detach();
    await client.destroy();
  };

  try {
    await client.login(management.botToken);
  } catch {
    await close().catch(() => undefined);
    throw new Error(startupFailure);
  }
  return close;
}

if (import.meta.main) {
  try {
    const close = await startDiscordManagement(process.env);
    const shutdown = () => {
      process.off("SIGINT", shutdown);
      process.off("SIGTERM", shutdown);
      void close().catch(() => {
        console.error("Discord management shutdown failed");
        process.exitCode = 1;
      });
    };
    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  } catch (error) {
    console.error(error instanceof DiscordManagementConfigError ? error.message : startupFailure);
    process.exitCode = 1;
  }
}
