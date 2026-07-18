import { describe, expect, it } from "vitest";
import { SIM_TICK_HZ, SIM_TICK_MS, ticksElapsed } from "./index.js";

describe("sim tick math (todo.md §4.2 — 20 Hz fixed step)", () => {
  it("locks the contract tick rate", () => {
    expect(SIM_TICK_HZ).toBe(20);
    expect(SIM_TICK_MS).toBe(50);
  });

  it.each([
    [0, 0],
    [49.999, 0],
    [50, 1],
    [99, 1],
    [1000, 20],
    [86_400_000, 1_728_000],
  ])("ticksElapsed(%f) -> %i whole ticks", (ms, ticks) => {
    expect(ticksElapsed(ms)).toBe(ticks);
  });

  it("rejects negative and non-finite input loudly", () => {
    expect(() => ticksElapsed(-1)).toThrow(RangeError);
    expect(() => ticksElapsed(Number.NaN)).toThrow(RangeError);
    expect(() => ticksElapsed(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});
