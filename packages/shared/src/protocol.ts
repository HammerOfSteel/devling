import { z } from "zod";

/**
 * Controller API v1 — payload schemas (todo.md §5.3).
 * These are THE wire contract: the Bridge validates against them, the
 * client re-validates, and schema/*.json is generated from them (0.2.4).
 */

/** The 16 performable statuses an external agent can report (todo.md §5.4). */
export const AgentStatus = z.enum([
  "idle",
  "thinking",
  "planning",
  "researching",
  "reading_docs",
  "coding",
  "refactoring",
  "debugging",
  "testing",
  "waiting",
  "reviewing",
  "committing",
  "blocked",
  "error",
  "success",
  "celebrating",
]);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const ThoughtKind = z.enum(["reasoning", "observation", "decision", "question"]);
export type ThoughtKind = z.infer<typeof ThoughtKind>;

export const TaskState = z.enum(["started", "progress", "done", "failed"]);
export type TaskState = z.infer<typeof TaskState>;

/** One-shot occurrences that trigger short reactions (todo.md §5.4). */
export const EventType = z.enum([
  "tests_passed",
  "tests_failed",
  "build_failed",
  "lint_failed",
  "commit",
  "push",
  "pr_opened",
  "pr_merged",
  "deploy",
  "milestone",
  "user_message",
]);
export type EventType = z.infer<typeof EventType>;

export const SessionState = z.enum(["start", "end"]);
export type SessionState = z.infer<typeof SessionState>;

/** The main lever: what the character performs right now. */
export const StatusMsg = z.object({
  status: AgentStatus,
  /** e.g. "implementing auth middleware" — shown on the HUD status chip. */
  detail: z.string().max(200).optional(),
  /** Modulates anim speed, mood strength, FX opacity (todo.md §5.4). */
  intensity: z.number().min(0).max(1).default(0.5),
  /** Active file path — rendered on the diegetic monitor. */
  file: z.string().max(160).optional(),
});
export type StatusMsg = z.infer<typeof StatusMsg>;
export type StatusMsgInput = z.input<typeof StatusMsg>;

/** One reasoning fragment for the HUD ticker / speech bubbles. */
export const ThoughtMsg = z.object({
  text: z.string().min(1).max(500),
  kind: ThoughtKind.default("reasoning"),
  ttlMs: z.number().int().min(1_000).max(120_000).default(20_000),
});
export type ThoughtMsg = z.infer<typeof ThoughtMsg>;
export type ThoughtMsgInput = z.input<typeof ThoughtMsg>;

/** Current task headline + progress (HUD task card). */
export const TaskMsg = z.object({
  taskId: z.string().min(1).max(64),
  title: z.string().min(1).max(120),
  /** e.g. "Phase 2 — Procedural House". */
  phase: z.string().max(80).optional(),
  status: TaskState,
  progress: z.number().min(0).max(1).optional(),
});
export type TaskMsg = z.infer<typeof TaskMsg>;

/** Full todo.md sync — parsed into the HUD phase stepper (5.4.2). */
export const TodoSyncMsg = z.object({
  markdown: z.string().max(200_000),
});
export type TodoSyncMsg = z.infer<typeof TodoSyncMsg>;

export const EventMsg = z.object({
  type: EventType,
  detail: z.string().max(200).optional(),
});
export type EventMsg = z.infer<typeof EventMsg>;

export const SessionMsg = z.object({
  state: SessionState,
  agentName: z.string().min(1).max(40).default("Agent"),
  project: z.string().max(80).optional(),
});
export type SessionMsg = z.infer<typeof SessionMsg>;
export type SessionMsgInput = z.input<typeof SessionMsg>;
