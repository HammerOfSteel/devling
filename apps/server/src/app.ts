import { readFileSync } from "node:fs";
import { PROTOCOL_VERSION } from "@devling/shared";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import websocket from "@fastify/websocket";
import Fastify, { type FastifyInstance } from "fastify";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import type { BridgeConfig } from "./config.js";
import { type Broadcaster, NullBroadcaster, registerAgentRoutes } from "./routes/agent.js";
import { Hub } from "./ws/hub.js";

declare module "fastify" {
  interface FastifyInstance {
    hub: Hub;
  }
}

export interface BuildOpts {
  /** Silence logs in tests. */
  logger?: boolean;
  /** Override the REST message sink (tests); defaults to the WS hub. */
  broadcaster?: Broadcaster;
}

function readOwnVersion(): string {
  try {
    const raw = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Build the Bridge app (todo.md §4.2, hardening per §5.1). */
export async function buildApp(config: BridgeConfig, opts: BuildOpts = {}) {
  const app: FastifyInstance = Fastify({ logger: opts.logger ?? true });
  app.withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((err, _request, reply) => {
    if (hasZodFastifySchemaValidationErrors(err)) {
      return reply.code(400).send({ error: "validation", issues: err.validation });
    }
    // Preserve statusCode-carrying errors (rate limit 429s, etc.) like
    // fastify's default handler would — otherwise they'd flatten to 200.
    const statusCode = (err as { statusCode?: unknown }).statusCode;
    return reply.code(typeof statusCode === "number" ? statusCode : 500).send(err);
  });

  if (config.usingDefaultToken) {
    app.log.warn("DEVLING_TOKEN unset — running on the well-known dev token; never expose this");
  }

  await app.register(cors, { origin: true });
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, context) => ({
      error: "rate_limited",
      retryAfterMs: context.ttl,
      statusCode: 429,
    }),
  });
  await app.register(websocket);

  /**
   * Auth gate (§5.1): agent surfaces always need the token (Bearer header
   * or ?token= for WS); the viewer channel only when DEVLING_PUBLIC=1.
   */
  const needsToken = (path: string): boolean =>
    path.startsWith("/api/v1/agent/") ||
    path.startsWith("/ws/v1/agent") ||
    (config.isPublic && path.startsWith("/ws/v1/viewer"));

  app.addHook("onRequest", async (request, reply) => {
    const [path = "", qs = ""] = request.url.split("?", 2);
    if (!needsToken(path)) return;
    const header = request.headers.authorization;
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const query = new URLSearchParams(qs).get("token") ?? undefined;
    if ((bearer ?? query) !== config.token) {
      return reply.code(401).send({ error: "unauthorized" });
    }
  });

  const hub = new Hub({ ringSize: config.replayRingSize });
  app.decorate("hub", hub);

  const version = readOwnVersion();
  const startedAt = Date.now();

  app.get("/api/v1/health", async () => ({
    ok: true as const,
    name: "devling-bridge",
    version,
    protocol: PROTOCOL_VERSION,
    uptimeMs: Date.now() - startedAt,
  }));

  // Last-known sim snapshot, pushed by the primary viewer over the
  // viewer.state uplink (§5.2) — lets the external AI *read* its pet.
  app.get("/api/v1/state", async () => ({ snapshot: hub.getSnapshot() }));

  // REST intake feeds the same hub the WS agents feed (§5.1: transports are symmetric).
  registerAgentRoutes(app, opts.broadcaster ?? hub, {
    max: config.rateLimitMax,
    timeWindowMs: 1_000,
  });

  app.get("/ws/v1/viewer", { websocket: true }, (socket) => {
    hub.addViewer(socket);
  });
  app.get("/ws/v1/agent", { websocket: true }, (socket) => {
    hub.addAgent(socket);
  });

  hub.startHeartbeat(config.heartbeatMs);
  app.addHook("onClose", async () => {
    hub.stop();
  });

  return app;
}

export { NullBroadcaster };
