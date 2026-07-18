import { describe, expect, it } from "vitest";
import {
  AgentStatus,
  EventMsg,
  EventType,
  SessionMsg,
  StatusMsg,
  TaskMsg,
  ThoughtMsg,
  TodoSyncMsg,
} from "./protocol.js";

describe("enums", () => {
  it("locks the 16-status and 11-event contract (todo.md §5.3)", () => {
    expect(AgentStatus.options).toHaveLength(16);
    expect(EventType.options).toHaveLength(11);
    expect(AgentStatus.options).toContain("debugging");
    expect(EventType.options).toContain("pr_merged");
  });
});

describe("StatusMsg", () => {
  it("parses a full valid message", () => {
    const parsed = StatusMsg.parse({
      status: "debugging",
      detail: "null ref in LayoutSolver",
      intensity: 0.85,
      file: "packages/procgen/src/layout.ts",
    });
    expect(parsed.status).toBe("debugging");
    expect(parsed.intensity).toBe(0.85);
  });

  it("defaults intensity to 0.5", () => {
    expect(StatusMsg.parse({ status: "coding" }).intensity).toBe(0.5);
  });

  it.each([
    [{ status: "compiling" }, "unknown status"],
    [{ status: "coding", intensity: 1.2 }, "intensity > 1"],
    [{ status: "coding", intensity: -0.1 }, "intensity < 0"],
    [{ status: "coding", detail: "x".repeat(201) }, "detail too long"],
    [{ status: "coding", file: "x".repeat(161) }, "file too long"],
    [{}, "missing status"],
  ])("rejects %j (%s)", (bad, label) => {
    expect(StatusMsg.safeParse(bad).success, label).toBe(false);
  });

  it("accepts boundary lengths exactly", () => {
    expect(
      StatusMsg.safeParse({ status: "coding", detail: "x".repeat(200), file: "y".repeat(160) })
        .success,
    ).toBe(true);
  });
});

describe("ThoughtMsg", () => {
  it("applies kind + ttl defaults", () => {
    const t = ThoughtMsg.parse({ text: "the stairs eat two cells" });
    expect(t.kind).toBe("reasoning");
    expect(t.ttlMs).toBe(20_000);
  });

  it.each([
    [{ text: "" }, "empty text"],
    [{ text: "x".repeat(501) }, "text too long"],
    [{ text: "ok", ttlMs: 999 }, "ttl below floor"],
    [{ text: "ok", ttlMs: 120_001 }, "ttl above cap"],
    [{ text: "ok", ttlMs: 1500.5 }, "non-integer ttl"],
    [{ text: "ok", kind: "musing" }, "unknown kind"],
  ])("rejects %j (%s)", (bad, label) => {
    expect(ThoughtMsg.safeParse(bad).success, label).toBe(false);
  });
});

describe("TaskMsg", () => {
  it("parses with progress bounds", () => {
    expect(
      TaskMsg.safeParse({ taskId: "0.2", title: "protocol", status: "progress", progress: 0.5 })
        .success,
    ).toBe(true);
  });

  it.each([
    [{ taskId: "", title: "t", status: "started" }, "empty taskId"],
    [{ taskId: "a", title: "", status: "started" }, "empty title"],
    [{ taskId: "a", title: "t", status: "paused" }, "unknown state"],
    [{ taskId: "a", title: "t", status: "progress", progress: 1.01 }, "progress > 1"],
  ])("rejects %j (%s)", (bad, label) => {
    expect(TaskMsg.safeParse(bad).success, label).toBe(false);
  });
});

describe("TodoSyncMsg / EventMsg / SessionMsg", () => {
  it("caps todo markdown at 200k", () => {
    expect(TodoSyncMsg.safeParse({ markdown: "x".repeat(200_000) }).success).toBe(true);
    expect(TodoSyncMsg.safeParse({ markdown: "x".repeat(200_001) }).success).toBe(false);
  });

  it("validates events", () => {
    expect(EventMsg.safeParse({ type: "tests_passed", detail: "214/214" }).success).toBe(true);
    expect(EventMsg.safeParse({ type: "tests_exploded" }).success).toBe(false);
  });

  it("defaults agentName to Agent", () => {
    expect(SessionMsg.parse({ state: "start" }).agentName).toBe("Agent");
    expect(SessionMsg.safeParse({ state: "paused" }).success).toBe(false);
    expect(SessionMsg.safeParse({ state: "start", agentName: "" }).success).toBe(false);
  });
});
