import { type AgentMessage, parseMsg, serializeMsg } from "@devling/shared";
import type { Broadcaster } from "../routes/agent.js";
import { ReplayRing } from "./ring.js";

/**
 * WS hub (todo.md 0.3.3): fan-out to viewers, agent envelope intake with
 * ack/error frames, viewer.hello with snapshot + replay ring, liveness
 * heartbeat. Transport-shaped: sockets are duck-typed so unit tests run
 * on fakes and fastify wires real `ws` sockets.
 */

/** Minimal socket surface the hub needs (satisfied by `ws` WebSocket). */
export interface HubSocket {
  readonly readyState: number;
  send(data: string): void;
  ping(): void;
  terminate(): void;
  on(event: "message", cb: (raw: unknown) => void): unknown;
  on(event: "close", cb: () => void): unknown;
  on(event: "pong", cb: () => void): unknown;
}

const OPEN = 1; // ws WebSocket.OPEN

export interface HubOpts {
  ringSize: number;
}

export class Hub implements Broadcaster {
  private readonly viewers = new Set<HubSocket>();
  private readonly agents = new Set<HubSocket>();
  private readonly ring: ReplayRing<AgentMessage>;
  private readonly alive = new Map<HubSocket, boolean>();
  private snapshot: unknown = null;
  private heartbeat: ReturnType<typeof setInterval> | undefined;

  constructor(opts: HubOpts) {
    this.ring = new ReplayRing<AgentMessage>(opts.ringSize);
  }

  /** Fan an accepted envelope out to every live viewer (+ retain in ring). */
  publish(msg: AgentMessage): void {
    this.ring.push(msg);
    const wire = serializeMsg(msg);
    for (const v of this.viewers) {
      if (v.readyState === OPEN) v.send(wire);
    }
  }

  addViewer(ws: HubSocket): void {
    this.viewers.add(ws);
    this.alive.set(ws, true);
    ws.send(
      JSON.stringify({
        type: "viewer.hello",
        snapshot: this.snapshot,
        replay: this.ring.toArray(),
      }),
    );
    ws.on("pong", () => this.alive.set(ws, true));
    ws.on("message", (raw) => this.onViewerMessage(raw));
    ws.on("close", () => {
      this.viewers.delete(ws);
      this.alive.delete(ws);
    });
  }

  private onViewerMessage(raw: unknown): void {
    try {
      const data = JSON.parse(String(raw)) as { type?: string; snapshot?: unknown };
      if (data.type === "viewer.state") this.snapshot = data.snapshot ?? null;
    } catch {
      // viewer noise is ignored — viewers are read-mostly
    }
  }

  addAgent(ws: HubSocket): void {
    this.agents.add(ws);
    this.alive.set(ws, true);
    ws.on("pong", () => this.alive.set(ws, true));
    ws.on("message", (raw) => {
      const res = parseMsg(String(raw));
      if (!res.ok) {
        ws.send(
          JSON.stringify({ type: "error", code: res.error.code, issues: res.error.issues ?? [] }),
        );
        return;
      }
      if (res.msg.type === "ping") {
        ws.send(JSON.stringify({ type: "pong", id: res.msg.id }));
        return;
      }
      this.publish(res.msg);
      ws.send(JSON.stringify({ type: "ack", id: res.msg.id }));
    });
    ws.on("close", () => {
      this.agents.delete(ws);
      this.alive.delete(ws);
    });
  }

  /** Terminate sockets that missed a full heartbeat interval (§5.6). */
  startHeartbeat(intervalMs: number): void {
    this.heartbeat = setInterval(() => {
      for (const ws of [...this.viewers, ...this.agents]) {
        if (this.alive.get(ws) === false) {
          ws.terminate();
          this.viewers.delete(ws);
          this.agents.delete(ws);
          this.alive.delete(ws);
          continue;
        }
        this.alive.set(ws, false);
        ws.ping();
      }
    }, intervalMs);
    this.heartbeat.unref?.();
  }

  stop(): void {
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
  }

  getSnapshot(): unknown {
    return this.snapshot;
  }

  counts(): { viewers: number; agents: number; ring: number } {
    return { viewers: this.viewers.size, agents: this.agents.size, ring: this.ring.size };
  }
}
