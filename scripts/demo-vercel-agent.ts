import { resolve } from "node:path";
import { createLiveDraftVerifier, createLiveModel } from "@support-ai-agent/agent-loop";
import { createMockSupport, MOCK_SCOPE } from "./lib/mock-support.js";
import { createDemoModel, demoRunner } from "./lib/vercel-agent-demo.js";

const live = process.env.AGENT_LIVE_MODEL === "1";
console.log(live ? "LIVE MODEL OPT-IN: sub2api Responses API; hosting/Discord remain synthetic." : "OFFLINE: mock model, synthetic Core/providers, no network or API key.");
const harness = createMockSupport();
try {
  const runner = demoRunner(harness, resolve(".agent-history", live ? "live-demo" : "mock-demo"), live ? createLiveModel() : createDemoModel(), undefined, undefined, live ? createLiveDraftVerifier() : undefined);
  const { reply } = await runner.run({ sessionId: MOCK_SCOPE.channelId, ticketToken: await harness.bridge.contextForCustomer(MOCK_SCOPE), prompt: "status" }, new AbortController().signal);
  console.log(reply);
} catch {
  // Provider error objects may contain credentials/request bodies. Do not print them.
  console.error("Agent demo failed; no provider error details logged.");
  process.exitCode = 1;
} finally { await harness.app.close(); }
