import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { EventMsg, SessionMsg, StatusMsg, TaskMsg, ThoughtMsg, TodoSyncMsg } from "./protocol.js";

/**
 * WS/REST envelope (todo.md §5.3). One discriminated union validates both
 * directions; the Bridge normalizes REST bodies into these envelopes.
 * Unknown fields are stripped (forward-compatible); unknown types reject.
 */

const base = {
  v: z.literal(1),
  id: z.uuid(),
  ts: z.iso.datetime(),
};

export const AgentMessage = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("agent.status"), payload: StatusMsg }),
  z.object({ ...base, type: z.literal("agent.thought"), payload: ThoughtMsg }),
  z.object({ ...base, type: z.literal("agent.task"), payload: TaskMsg }),
  z.object({ ...base, type: z.literal("agent.todo"), payload: TodoSyncMsg }),
  z.object({ ...base, type: z.literal("agent.event"), payload: EventMsg }),
  z.object({ ...base, type: z.literal("agent.session"), payload: SessionMsg }),
  z.object({ ...base, type: z.literal("ping") }),
]);
export type AgentMessage = z.infer<typeof AgentMessage>;
export type AgentMessageType = AgentMessage["type"];

/** Input-side payload map (pre-default application) for makeMsg ergonomics. */
export interface PayloadInputMap {
  "agent.status": z.input<typeof StatusMsg>;
  "agent.thought": z.input<typeof ThoughtMsg>;
  "agent.task": z.input<typeof TaskMsg>;
  "agent.todo": z.input<typeof TodoSyncMsg>;
  "agent.event": z.input<typeof EventMsg>;
  "agent.session": z.input<typeof SessionMsg>;
  ping: undefined;
}

export interface MakeMsgOpts {
  /** Override for deterministic tests / replay. */
  id?: string;
  /** Override for deterministic tests / replay (ISO datetime). */
  ts?: string;
}

/** Build + validate an envelope. Throws ZodError on invalid payloads. */
export function makeMsg<T extends AgentMessageType>(
  type: T,
  payload: PayloadInputMap[T],
  opts: MakeMsgOpts = {},
): AgentMessage {
  const draft: Record<string, unknown> = {
    v: 1,
    id: opts.id ?? uuidv4(),
    ts: opts.ts ?? new Date().toISOString(),
    type,
  };
  if (payload !== undefined) draft.payload = payload;
  return AgentMessage.parse(draft);
}

export type ParseMsgErrorCode = "invalid_json" | "invalid_envelope";

export interface ParseMsgError {
  code: ParseMsgErrorCode;
  issues?: readonly z.core.$ZodIssue[];
}

export type ParseMsgResult = { ok: true; msg: AgentMessage } | { ok: false; error: ParseMsgError };

/** Safe wire-string → envelope. Never throws. */
export function parseMsg(raw: string): ParseMsgResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: { code: "invalid_json" } };
  }
  const res = AgentMessage.safeParse(data);
  if (!res.success) {
    return { ok: false, error: { code: "invalid_envelope", issues: res.error.issues } };
  }
  return { ok: true, msg: res.data };
}

export function serializeMsg(msg: AgentMessage): string {
  return JSON.stringify(msg);
}
