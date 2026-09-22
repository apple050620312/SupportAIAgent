import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

describe("Support Core HTTP application", () => {
  it("reports health and carries the caller correlation ID", async () => {
    const app = buildApp({ logger: false });
    apps.push(app);

    const response = await app.inject({
      method: "GET",
      url: "/health",
      headers: { "x-correlation-id": "health-check-1" }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ status: "ok" });
    expect(response.headers["x-correlation-id"]).toBeUndefined();
  });
});
