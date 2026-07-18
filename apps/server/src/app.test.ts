import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("bridge boot + health (0.3.1)", () => {
  it("serves /api/v1/health with version + protocol", async () => {
    app = await buildApp(loadConfig({}), { logger: false });
    const res = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      ok: boolean;
      name: string;
      version: string;
      protocol: number;
      uptimeMs: number;
    };
    expect(body.ok).toBe(true);
    expect(body.name).toBe("devling-bridge");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(body.protocol).toBe(1);
    expect(body.uptimeMs).toBeGreaterThanOrEqual(0);
  });

  it("404s unknown paths", async () => {
    app = await buildApp(loadConfig({}), { logger: false });
    const res = await app.inject({ method: "GET", url: "/api/v1/nope" });
    expect(res.statusCode).toBe(404);
  });
});
