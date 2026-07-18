import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  type AgentMessage,
  type AgentMessageType,
  EventMsg,
  makeMsg,
  SessionMsg,
  StatusMsg,
  TaskMsg,
  ThoughtMsg,
  TodoSyncMsg,
} from "@devling/shared";

/**
 * Agent REST intake (todo.md §5.2): validate payload via the shared wire
 * schemas, normalize into an envelope, hand to the Broadcaster (WS hub),
 * ack 202. REST and WS stay perfectly symmetric this way.
 */

export interface Broadcaster {
  publish(msg: AgentMessage): void;
}

/** Default sink for tests running buildApp without a hub. */
export class NullBroadcaster implements Broadcaster {
  publish(): void {
    /* intentionally empty */
  }
}

export interface AgentRouteLimits {
  /** Requests per window per client (todo.md §5.1: 20 r/s default). */
  max: number;
  timeWindowMs: number;
}

const AGENT_ROUTES = [
  { path: "session", type: "agent.session", schema: SessionMsg },
  { path: "status", type: "agent.status", schema: StatusMsg },
  { path: "thought", type: "agent.thought", schema: ThoughtMsg },
  { path: "task", type: "agent.task", schema: TaskMsg },
  { path: "todo", type: "agent.todo", schema: TodoSyncMsg },
  { path: "event", type: "agent.event", schema: EventMsg },
] as const satisfies ReadonlyArray<{
  path: string;
  type: AgentMessageType;
  schema: unknown;
}>;

export function registerAgentRoutes(
  app: FastifyInstance,
  broadcaster: Broadcaster,
  limits: AgentRouteLimits,
): void {
  const typed = app.withTypeProvider<ZodTypeProvider>();
  for (const route of AGENT_ROUTES) {
    typed.post(
      `/api/v1/agent/${route.path}`,
      {
        schema: { body: route.schema },
        config: { rateLimit: { max: limits.max, timeWindow: limits.timeWindowMs } },
      },
      async (request, reply) => {
        // Body is already schema-parsed (defaults applied) by the validator.
        const msg = makeMsg(route.type, request.body as never);
        broadcaster.publish(msg);
        return reply.code(202).send({ accepted: true, id: msg.id });
      },
    );
  }
}
