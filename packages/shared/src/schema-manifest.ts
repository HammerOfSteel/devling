import type { z } from "zod";
import { AgentMessage } from "./envelope.js";
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

/**
 * Everything published as JSON Schema for non-TS integrators (todo.md 0.2.4).
 * scripts/export-schemas.mjs walks this manifest at build time and emits
 * schema/<name>.json — that folder is the wire-format API reference.
 */
export interface SchemaManifestEntry {
  /** kebab-case output filename (without .json). */
  name: string;
  schema: z.ZodType;
}

export const SCHEMA_MANIFEST: readonly SchemaManifestEntry[] = [
  { name: "agent-status", schema: AgentStatus },
  { name: "event-type", schema: EventType },
  { name: "status-msg", schema: StatusMsg },
  { name: "thought-msg", schema: ThoughtMsg },
  { name: "task-msg", schema: TaskMsg },
  { name: "todo-sync-msg", schema: TodoSyncMsg },
  { name: "event-msg", schema: EventMsg },
  { name: "session-msg", schema: SessionMsg },
  { name: "agent-message", schema: AgentMessage },
];
