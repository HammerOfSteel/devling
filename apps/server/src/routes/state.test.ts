import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";

/** 0.3.5: viewer.state uplink → GET /api/v1/state round trip. */

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

function wsUrl(a: FastifyInstance, path: string): string {
  const addr = a.server.address();
  if (addr === null || typeof addr === "string") throw new Error("no bound port");
  return `ws://127.0.0.1:${addr.port}${path}`;
}

async function eventually<T>(fn: () => Promise<T>, ok: (v: T) => boolean, ms = 2000): Promise<T> {
  const deadline = Date.now() + ms;
  let last: T = await fn();
  while (!ok(last)) {
    if (Date.now() > deadline) throw new Error(`condition not met within ${ms}ms`);
    await new Promise((r) => setTimeout(r, 25));
    last = await fn();
  }
  return last;
}

describe("state snapshot endpoint", () => {
  it("serves null before any uplink", async () => {
    app = await buildApp(loadConfig({}), { logger: false });
    const res = await app.inject({ method: "GET", url: "/api/v1/state" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ snapshot: null });
  });

  it("round-trips a viewer.state uplink", async () => {
    app = await buildApp(loadConfig({ DEVLING_HEARTBEAT_MS: "60000" }), { logger: false });
    await app.listen({ port: 0, host: "127.0.0.1" });

    const viewer = new WebSocket(wsUrl(app, "/ws/v1/viewer"));
    await new Promise<void>((resolve, reject) => {
      viewer.once("open", () => resolve());
      viewer.once("error", reject);
    });

    const snapshot = {
      mode: "autonomy",
      activity: "DrinkCoffee",
      tick: 4242,
      clock: { hh: 9, mm: 15 },
    };
    viewer.send(JSON.stringify({ type: "viewer.state", snapshot }));

    const body = await eventually(
      async () => (await app!.inject({ method: "GET", url: "/api/v1/state" })).json(),
      (b) => (b as { snapshot: unknown }).snapshot !== null,
    );
    expect(body).toEqual({ snapshot });
    viewer.close();
  });
});
