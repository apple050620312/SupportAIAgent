import { probeReadOnlySupport, SupportProbeSetupError } from "./lib/read-only-support-probe.js";
try {
  const results = await probeReadOnlySupport(process.env);
  console.table(results);
  if (results.some((result) => result.outcome === "failed")) process.exitCode = 1;
} catch (error: unknown) {
  console.error(error instanceof SupportProbeSetupError ? `Read-only probe setup: ${error.message}` : "Read-only probe failed safely");
  process.exitCode = 1;
}
