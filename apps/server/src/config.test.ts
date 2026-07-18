import { describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("loadConfig (0.3.1)", () => {
  it("applies documented defaults on empty env", () => {
    const c = loadConfig({});
    expect(c).toMatchObject({
      port: 7777,
      isPublic: false,
      rateLimitMax: 20,
      heartbeatMs: 15_000,
      replayRingSize: 60,
      usingDefaultToken: true,
    });
  });

  it("honors overrides and flags custom tokens", () => {
    const c = loadConfig({
      DEVLING_PORT: "8080",
      DEVLING_TOKEN: "super-secret-token",
      DEVLING_RATE_LIMIT_MAX: "3",
    });
    expect(c.port).toBe(8080);
    expect(c.rateLimitMax).toBe(3);
    expect(c.usingDefaultToken).toBe(false);
  });

  it.each([
    ["1", true],
    ["true", true],
    ["TRUE", true],
    ["yes", true],
    ["0", false],
    ["false", false],
    ["off", false],
    [undefined, false],
  ])("parses DEVLING_PUBLIC=%s → %s", (raw, expected) => {
    expect(loadConfig(raw === undefined ? {} : { DEVLING_PUBLIC: raw }).isPublic).toBe(expected);
  });

  it.each([
    [{ DEVLING_PORT: "0" }, "port 0"],
    [{ DEVLING_PORT: "70000" }, "port too high"],
    [{ DEVLING_PORT: "abc" }, "port NaN"],
    [{ DEVLING_TOKEN: "short" }, "token under 8 chars"],
    [{ DEVLING_RATE_LIMIT_MAX: "-1" }, "negative rate limit"],
  ])("rejects %j (%s)", (env) => {
    expect(() => loadConfig(env)).toThrowError();
  });
});
