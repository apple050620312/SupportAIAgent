import {
  CharacterizationSetupError,
  characterizeGetClientId
} from "./lib/get-client-id-characterization.js";

async function main(): Promise<void> {
  try {
    const results = await characterizeGetClientId(process.env);
    console.table(results);
  } catch (error: unknown) {
    if (error instanceof CharacterizationSetupError) {
      console.error(`Characterization setup error: ${error.message}`);
    } else {
      console.error("Characterization failed before producing sanitized results");
    }
    process.exitCode = 1;
  }
}

await main();
