import { describe, expect, it } from "vitest";
import type { AgentMessageType, PayloadInputMap } from "./envelope.js";
import { AgentMessage, makeMsg, parseMsg, serializeMsg } from "./envelope.js";

const FIXED = { id: "3f2f2f60-1111-4222-8333-444455556666", ts: "2026-07-18T07:00:00.000Z" };

const samples: { [T in AgentMessageType]: PayloadInputMap[T] } = {
  "agent.status": { status: "coding", detail: "wiring WS", intensity: 0.6 },
  "agent.thought": { text: "backoff needs jitter", kind: "decision" },
  "agent.task": { taskId: "0.2", title: "protocol package", status: "started" },
  "agent.todo": { markdown: "# plan\n- [ ] 0.2.2 envelope" },
  "agent.event": { type: "tests_passed", detail: "43/43" },
  "agent.session": { state: "start", agentName: "Claude" },
  ping: undefined,
};

describe("makeMsg + round-trip", () => {
  it.each(Object.keys(samples) as AgentMessageType[])("round-trips %s", (type) => {
    const msg = makeMsg(type, samples[type], FIXED);
    const wire = serializeMsg(msg);
    const back = parseMsg(wire);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.msg).toEqual(msg);
  });

  it("fills id (uuid) and ts (ISO) when not overridden", () => {
    const msg = makeMsg("ping", undefined);
    expect(AgentMessage.safeParse(msg).success).toBe(true);
    expect(msg.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(msg.ts).toISOString()).toBe(msg.ts);
  });

  it("applies payload defaults through the envelope", () => {
    const msg = makeMsg("agent.status", { status: "testing" }, FIXED);
    if (msg.type !== "agent.status") throw new Error("wrong type");
    expect(msg.payload.intensity).toBe(0.5);
  });

  it("throws on invalid payloads (author-side error, not wire-side)", () => {
    expect(() => makeMsg("agent.status", { status: "compiling" } as never, FIXED)).toThrowError();
  });
});

describe("parseMsg failure modes", () => {
  it("flags malformed JSON", () => {
    const r = parseMsg("{nope");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("invalid_json");
  });

  it.each([
    ["unknown type", { v: 1, id: FIXED.id, ts: FIXED.ts, type: "agent.mood", payload: {} }],
    ["wrong version", { v: 2, id: FIXED.id, ts: FIXED.ts, type: "ping" }],
    ["bad uuid", { v: 1, id: "not-a-uuid", ts: FIXED.ts, type: "ping" }],
    ["bad ts", { v: 1, id: FIXED.id, ts: "yesterday", type: "ping" }],
    ["missing payload", { v: 1, id: FIXED.id, ts: FIXED.ts, type: "agent.status" }],
  ])("flags %s as invalid_envelope with issues", (_label, bad) => {
    const r = parseMsg(JSON.stringify(bad));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("invalid_envelope");
      expect(r.error.issues?.length).toBeGreaterThan(0);
    }
  });

  it("strips unknown fields instead of rejecting (forward-compat §5.1)", () => {
    const r = parseMsg(
      JSON.stringify({
        v: 1,
        id: FIXED.id,
        ts: FIXED.ts,
        type: "ping",
        futureField: "ignore me",
      }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect("futureField" in r.msg).toBe(false);
  });
});
