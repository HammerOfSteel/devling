import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { buildApp } from "./app.js";
import { loadConfig } from "./config.js";

/** 0.3.4: bearer/query auth, per-route rate limit, CORS preflight. */

const TOKEN = "devling-dev-token";
const AUTH = { authorization: `Bearer ${TOKEN}` };

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

function wsOutcome(url: string): Promise<"open" | number> {
  return new Promise((resolve) => {
    const ws = new WebSocket(url);
    ws.once("open", () => {
      ws.close();
      resolve("open");
    });
    ws.once("unexpected-response", (_req, res) => {
      resolve(res.statusCode ?? 0);
    });
    ws.once("error", () => {
      /* swallowed — unexpected-response already resolves */
    });
  });
}

describe("REST auth", () => {
  it("401s agent routes without/with wrong token; health stays open", async () => {
    app = await buildApp(loadConfig({}), { logger: false });
    const no = await app.inject({
      method: "POST",
      url: "/api/v1/agent/status",
      payload: { status: "idle" },
    });
    expect(no.statusCode).toBe(401);
    const wrong = await app.inject({
      method: "POST",
      url: "/api/v1/agent/status",
      headers: { authorization: "Bearer wrong-token-123" },
      payload: { status: "idle" },
    });
    expect(wrong.statusCode).toBe(401);
    const health = await app.inject({ method: "GET", url: "/api/v1/health" });
    expect(health.statusCode).toBe(200);
  });

  it("accepts the bearer token → 202", async () => {
    app = await buildApp(loadConfig({}), { logger: false });
    const ok = await app.inject({
      method: "POST",
      url: "/api/v1/agent/status",
      headers: AUTH,
      payload: { status: "coding" },
    });
    expect(ok.statusCode).toBe(202);
  });
});

describe("WS auth", () => {
  it("agent channel: bad token rejected 401, query token accepted; viewer open on localhost", async () => {
    app = await buildApp(loadConfig({ DEVLING_HEARTBEAT_MS: "60000" }), { logger: false });
    await app.listen({ port: 0, host: "127.0.0.1" });

    expect(await wsOutcome(wsUrl(app, "/ws/v1/agent"))).toBe(401);
    expect(await wsOutcome(wsUrl(app, "/ws/v1/agent?token=nope"))).toBe(401);
    expect(await wsOutcome(wsUrl(app, `/ws/v1/agent?token=${TOKEN}`))).toBe("open");
    expect(await wsOutcome(wsUrl(app, "/ws/v1/viewer"))).toBe("open");
  });

  it("public mode gates the viewer channel too", async () => {
    app = await buildApp(loadConfig({ DEVLING_PUBLIC: "1", DEVLING_HEARTBEAT_MS: "60000" }), {
      logger: false,
    });
    await app.listen({ port: 0, host: "127.0.0.1" });
    expect(await wsOutcome(wsUrl(app, "/ws/v1/viewer"))).toBe(401);
    expect(await wsOutcome(wsUrl(app, `/ws/v1/viewer?token=${TOKEN}`))).toBe("open");
  });
});

describe("rate limit + CORS", () => {
  it("429s past the per-second cap with retryAfterMs (§5.1)", async () => {
    app = await buildApp(loadConfig({ DEVLING_RATE_LIMIT_MAX: "2" }), { logger: false });
    const post = () =>
      app!.inject({
        method: "POST",
        url: "/api/v1/agent/status",
        headers: AUTH,
        payload: { status: "coding" },
      });
    expect((await post()).statusCode).toBe(202);
    expect((await post()).statusCode).toBe(202);
    const limited = await post();
    expect(limited.statusCode).toBe(429);
    const body = limited.json() as { error: string; retryAfterMs: number };
    expect(body.error).toBe("rate_limited");
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });

  it("rate limit does not gate /api/v1/health", async () => {
    app = await buildApp(loadConfig({ DEVLING_RATE_LIMIT_MAX: "1" }), { logger: false });
    for (let i = 0; i < 5; i += 1) {
      expect((await app.inject({ method: "GET", url: "/api/v1/health" })).statusCode).toBe(200);
    }
  });

  it("answers CORS preflight for browser viewers", async () => {
    app = await buildApp(loadConfig({}), { logger: false });
    const res = await app.inject({
      method: "OPTIONS",
      url: "/api/v1/agent/status",
      headers: {
        origin: "http://localhost:5173",
        "access-control-request-method": "POST",
        "access-control-request-headers": "authorization,content-type",
      },
    });
    expect([200, 204]).toContain(res.statusCode);
    expect(res.headers["access-control-allow-origin"]).toBeDefined();
  });
});
