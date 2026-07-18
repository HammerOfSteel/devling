import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { makeMsg, serializeMsg } from "@devling/shared";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";

/** Real-socket integration proof for the fastify↔hub wiring (0.3.3). */

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

/**
 * Listener attaches at construction — frames can never fall into the gap
 * between `open` and a later `once("message")` (ws does not buffer).
 */
class WsReader {
  readonly ws: WebSocket;
  private queue: Array<Record<string, unknown>> = [];
  private waiters: Array<(m: Record<string, unknown>) => void> = [];

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw)) as Record<string, unknown>;
      const waiter = this.waiters.shift();
      if (waiter) waiter(msg);
      else this.queue.push(msg);
    });
  }

  opened(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this.ws.once("open", () => resolve());
      this.ws.once("error", reject);
    });
  }

  next(timeoutMs = 2000): Promise<Record<string, unknown>> {
    const head = this.queue.shift();
    if (head) return Promise.resolve(head);
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error("ws message timeout")), timeoutMs);
      this.waiters.push((m) => {
        clearTimeout(t);
        resolve(m);
      });
    });
  }

  close(): void {
    this.ws.close();
  }
}

describe("fastify ↔ hub wiring", () => {
  it("agent WS → broadcast to two viewers; late viewer gets replay; REST feeds same hub", async () => {
    app = await buildApp(loadConfig({ DEVLING_HEARTBEAT_MS: "60000" }), { logger: false });
    await app.listen({ port: 0, host: "127.0.0.1" });

    const v1 = new WsReader(wsUrl(app, "/ws/v1/viewer"));
    const v2 = new WsReader(wsUrl(app, "/ws/v1/viewer"));
    const agent = new WsReader(wsUrl(app, "/ws/v1/agent?token=devling-dev-token"));
    await Promise.all([v1.opened(), v2.opened(), agent.opened()]);

    // hellos
    const [h1, h2] = await Promise.all([v1.next(), v2.next()]);
    expect(h1.type).toBe("viewer.hello");
    expect(h2.type).toBe("viewer.hello");

    // agent WS → both viewers + ack
    const msg = makeMsg("agent.status", { status: "debugging", intensity: 0.9 });
    agent.ws.send(serializeMsg(msg));
    const [seen1, seen2, ack] = await Promise.all([v1.next(), v2.next(), agent.next()]);
    expect(seen1.id).toBe(msg.id);
    expect(seen2.id).toBe(msg.id);
    expect(ack).toEqual({ type: "ack", id: msg.id });

    // REST intake lands on the same hub
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/agent/event",
      headers: { authorization: "Bearer devling-dev-token" },
      payload: { type: "tests_passed" },
    });
    expect(res.statusCode).toBe(202);
    const [rest1, rest2] = await Promise.all([v1.next(), v2.next()]);
    expect(rest1.type).toBe("agent.event");
    expect(rest2.type).toBe("agent.event");

    // late viewer replays both envelopes
    const late = new WsReader(wsUrl(app, "/ws/v1/viewer"));
    await late.opened();
    const hello = (await late.next()) as unknown as { replay: Array<{ id: string }> };
    expect(hello.replay.map((r) => r.id)).toContain(msg.id);
    expect(hello.replay).toHaveLength(2);

    for (const r of [v1, v2, agent, late]) r.close();
  });
});
