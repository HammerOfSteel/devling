import { z } from "zod";

/** Bridge env config (todo.md 0.3.1). All knobs overridable for tests. */

const truthy = new Set(["1", "true", "yes", "on"]);

const EnvSchema = z.object({
  DEVLING_PORT: z.coerce.number().int().min(1).max(65535).default(7777),
  DEVLING_TOKEN: z.string().min(8).default("devling-dev-token"),
  DEVLING_PUBLIC: z
    .string()
    .optional()
    .transform((v) => (v === undefined ? false : truthy.has(v.toLowerCase()))),
  DEVLING_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  DEVLING_HEARTBEAT_MS: z.coerce.number().int().min(1_000).default(15_000),
  DEVLING_REPLAY_RING: z.coerce.number().int().min(0).max(1_000).default(60),
});

export const DEFAULT_DEV_TOKEN = "devling-dev-token";

export interface BridgeConfig {
  port: number;
  token: string;
  isPublic: boolean;
  rateLimitMax: number;
  heartbeatMs: number;
  replayRingSize: number;
  /** True when running on the well-known dev token — boot logs a warning. */
  usingDefaultToken: boolean;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): BridgeConfig {
  const parsed = EnvSchema.parse(env);
  return {
    port: parsed.DEVLING_PORT,
    token: parsed.DEVLING_TOKEN,
    isPublic: parsed.DEVLING_PUBLIC,
    rateLimitMax: parsed.DEVLING_RATE_LIMIT_MAX,
    heartbeatMs: parsed.DEVLING_HEARTBEAT_MS,
    replayRingSize: parsed.DEVLING_REPLAY_RING,
    usingDefaultToken: parsed.DEVLING_TOKEN === DEFAULT_DEV_TOKEN,
  };
}
