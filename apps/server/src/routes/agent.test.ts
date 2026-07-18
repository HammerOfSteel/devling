import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { AgentMessage } from "@devling/shared";
import { buildApp } from "../app.js";
import { loadConfig } from "../config.js";

const AUTH = { authorization: "Bearer devling-dev-token" };

class CapturingBroadcaster {
  published: AgentMessage[] = [];
  publish(msg: AgentMessage): void {
    this.published.push(msg);
  }
}

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

async function mkApp() {
  const sink = new CapturingBroadcaster();
  app = await buildApp(loadConfig({}), { logger: false, broadcaster: sink });
  return { app, sink };
}

const VALID: Array<{ path: string; type: string; body: Record<string, unknown> }> = [
  { path: "session", type: "agent.session", body: { state: "start", agentName: "Claude" } },
  { path: "status", type: "agent.status", body: { status: "debugging", intensity: 0.8 } },
  { path: "thought", type: "agent.thought", body: { text: "stairs eat two cells" } },
  { path: "task", type: "agent.task", body: { taskId: "0.3", title: "bridge", status: "started" } },
  { path: "todo", type: "agent.todo", body: { markdown: "- [ ] 0.3.2" } },
  { path: "event", type: "agent.event", body: { type: "tests_passed" } },
];

describe("agent REST routes (0.3.2)", () => {
  it.each(VALID)(
    "POST /api/v1/agent/$path → 202 + broadcast $type",
    async ({ path, type, body }) => {
      const { app: a, sink } = await mkApp();
      const res = await a.inject({
        method: "POST",
        url: `/api/v1/agent/${path}`,
        headers: AUTH,
        payload: body,
      });
      expect(res.statusCode).toBe(202);
      const ack = res.json() as { accepted: boolean; id: string };
      expect(ack.accepted).toBe(true);
      expect(ack.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(sink.published).toHaveLength(1);
      const msg = sink.published[0];
      if (!msg) throw new Error("nothing broadcast");
      expect(msg.type).toBe(type);
      expect(msg.id).toBe(ack.id);
    },
  );

  it("applies schema defaults before broadcasting (intensity 0.5)", async () => {
    const { app: a, sink } = await mkApp();
    await a.inject({
      method: "POST",
      url: "/api/v1/agent/status",
      headers: AUTH,
      payload: { status: "coding" },
    });
    const msg = sink.published[0];
    if (msg?.type !== "agent.status") throw new Error("expected status envelope");
    expect(msg.payload.intensity).toBe(0.5);
  });

  it.each([
    ["status", { status: "compiling" }],
    ["status", {}],
    ["thought", { text: "" }],
    ["task", { taskId: "x", title: "t", status: "paused" }],
    ["todo", { markdown: 42 }],
    ["event", { type: "tests_exploded" }],
    ["session", { state: "hibernate" }],
  ])("POST /api/v1/agent/%s with %j → 400 with zod issues, no broadcast", async (path, body) => {
    const { app: a, sink } = await mkApp();
    const res = await a.inject({
      method: "POST",
      url: `/api/v1/agent/${path}`,
      headers: AUTH,
      payload: body,
    });
    expect(res.statusCode).toBe(400);
    const err = res.json() as { error: string; issues: unknown[] };
    expect(err.error).toBe("validation");
    expect(err.issues.length).toBeGreaterThan(0);
    expect(sink.published).toHaveLength(0);
  });
});
