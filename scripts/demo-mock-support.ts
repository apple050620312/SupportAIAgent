import assert from "node:assert/strict";
import { createMockSupport, MOCK_SCOPE } from "./lib/mock-support.js";

const demo = createMockSupport();
try {
  const tools = demo.toolsFor(MOCK_SCOPE);
  for (const name of ["identify_customer", "list_my_services", "get_service_details", "list_my_servers",
    "get_my_server_status", "get_my_server_resources"] as const) {
    const tool = tools.find((candidate) => candidate.name === name);
    assert(tool);
    const parameters = ["get_service_details", "get_my_server_status", "get_my_server_resources"].includes(name)
      ? { serviceRef: "whmcs-service:1" } : {};
    await tool.execute("synthetic-tool-call", parameters);
    console.log(`${name}: PASS (synthetic mocked providers)`);
  }
  const snapshot = await demo.bridge.read(MOCK_SCOPE);
  assert(snapshot);
  await demo.bridge.humanTakeover(MOCK_SCOPE);
  assert.equal(await demo.bridge.replyIfCurrent(snapshot, "This reply must not be sent"), false);
  console.log("human_takeover_silence: PASS");
  console.log("No live WHMCS, Pterodactyl, Discord or model request was made.");
} finally { await demo.app.close(); }
