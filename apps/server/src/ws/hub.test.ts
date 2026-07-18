import { describe, expect, it, vi } from "vitest";
import { makeMsg, serializeMsg } from "@devling/shared";
import { Hub, type HubSocket } from "./hub.js";

/** Deterministic in-memory socket standing in for `ws`. */
class FakeSocket implements HubSocket {
  readyState = 1;
  sent: string[] = [];
  private handlers = new Map<string, Array<(...args: unknown[]) => void>>();

  send(data: string): void {
    this.sent.push(data);
  }
  ping = vi.fn();
  terminate = vi.fn(() => {
    this.readyState = 3;
    this.emit("close");
  });
  on(event: string, cb: (...args: unknown[]) => void): this {
    const list = this.handlers.get(event) ?? [];
    list.push(cb);
    this.handlers.set(event, list);
    return this;
  }
  emit(event: string, ...args: unknown[]): void {
    for (const cb of this.handlers.get(event) ?? []) cb(...args);
  }
  lastJson<T = Record<string, unknown>>(): T {
    const last = this.sent.at(-1);
    if (!last) throw new Error("nothing sent");
    return JSON.parse(last) as T;
  }
}

const status = () => makeMsg("agent.status", { status: "coding" });

describe("Hub (0.3.3)", () => {
  it("greets viewers with hello { snapshot, replay }", () => {
    const hub = new Hub({ ringSize: 60 });
    const v = new FakeSocket();
    hub.addViewer(v);
    const hello = v.lastJson<{ type: string; snapshot: unknown; replay: unknown[] }>();
    expect(hello.type).toBe("viewer.hello");
    expect(hello.snapshot).toBeNull();
    expect(hello.replay).toEqual([]);
  });

  it("fans agent envelopes out to every viewer and acks the agent", () => {
    const hub = new Hub({ ringSize: 60 });
    const v1 = new FakeSocket();
    const v2 = new FakeSocket();
    const a = new FakeSocket();
    hub.addViewer(v1);
    hub.addViewer(v2);
    hub.addAgent(a);

    const msg = status();
    a.emit("message", serializeMsg(msg));

    expect(v1.lastJson()).toEqual(JSON.parse(serializeMsg(msg)));
    expect(v2.lastJson()).toEqual(JSON.parse(serializeMsg(msg)));
    expect(a.lastJson()).toEqual({ type: "ack", id: msg.id });
  });

  it("replays the ring to late joiners, capped at ringSize", () => {
    const hub = new Hub({ ringSize: 2 });
    const a = new FakeSocket();
    hub.addAgent(a);
    const m1 = status();
    const m2 = status();
    const m3 = status();
    for (const m of [m1, m2, m3]) a.emit("message", serializeMsg(m));

    const late = new FakeSocket();
    hub.addViewer(late);
    const hello = late.lastJson<{ replay: Array<{ id: string }> }>();
    expect(hello.replay.map((r) => r.id)).toEqual([m2.id, m3.id]);
  });

  it("rejects malformed agent frames with typed error, nothing broadcast", () => {
    const hub = new Hub({ ringSize: 60 });
    const v = new FakeSocket();
    const a = new FakeSocket();
    hub.addViewer(v);
    hub.addAgent(a);
    const viewerSendsBefore = v.sent.length;

    a.emit("message", "{nope");
    expect(a.lastJson<{ type: string; code: string }>()).toMatchObject({
      type: "error",
      code: "invalid_json",
    });

    a.emit("message", JSON.stringify({ v: 1, type: "agent.mood" }));
    expect(a.lastJson<{ type: string; code: string }>()).toMatchObject({
      type: "error",
      code: "invalid_envelope",
    });

    expect(v.sent.length).toBe(viewerSendsBefore);
  });

  it("answers ping with pong without broadcasting", () => {
    const hub = new Hub({ ringSize: 60 });
    const a = new FakeSocket();
    hub.addAgent(a);
    const ping = makeMsg("ping", undefined);
    a.emit("message", serializeMsg(ping));
    expect(a.lastJson()).toEqual({ type: "pong", id: ping.id });
    expect(hub.counts().ring).toBe(0);
  });

  it("stores viewer.state uplinks as the snapshot", () => {
    const hub = new Hub({ ringSize: 60 });
    const v = new FakeSocket();
    hub.addViewer(v);
    v.emit("message", JSON.stringify({ type: "viewer.state", snapshot: { tick: 42 } }));
    expect(hub.getSnapshot()).toEqual({ tick: 42 });
  });

  it("terminates sockets that miss a heartbeat interval", () => {
    vi.useFakeTimers();
    try {
      const hub = new Hub({ ringSize: 60 });
      const healthy = new FakeSocket();
      const dead = new FakeSocket();
      hub.addViewer(healthy);
      hub.addViewer(dead);
      hub.startHeartbeat(1000);

      // interval 1: both marked pending, both pinged; only healthy pongs
      vi.advanceTimersByTime(1000);
      expect(healthy.ping).toHaveBeenCalled();
      healthy.emit("pong");

      // interval 2: dead never ponged → terminated
      vi.advanceTimersByTime(1000);
      expect(dead.terminate).toHaveBeenCalled();
      expect(healthy.terminate).not.toHaveBeenCalled();
      expect(hub.counts().viewers).toBe(1);
      hub.stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
