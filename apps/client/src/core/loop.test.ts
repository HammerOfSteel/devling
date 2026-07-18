import { describe, expect, it } from "vitest";
import { SIM_TICK_MS } from "@devling/sim";
import { bindVisibility, FixedLoop, type VisibilityDoc } from "./loop.js";

function mkLoop(overrides: Partial<{ tickMs: number; maxFrameMs: number }> = {}) {
  const ticks: Array<{ dt: number; n: number }> = [];
  const alphas: number[] = [];
  const loop = new FixedLoop({
    onTick: (dt, n) => ticks.push({ dt, n }),
    onRender: (a) => alphas.push(a),
    ...overrides,
  });
  return { loop, ticks, alphas };
}

describe("FixedLoop (0.4.2)", () => {
  it("defaults to the sim contract tick", () => {
    const { loop } = mkLoop();
    expect(loop.tickMs).toBe(SIM_TICK_MS);
  });

  it("1 s of wall time ⇒ exactly 20 ticks with constant dt", () => {
    const { loop, ticks } = mkLoop();
    loop.start();
    loop.step(0);
    for (let t = 25; t <= 1000; t += 25) loop.step(t); // 40 integer frames, exactly 1s
    expect(ticks.length).toBe(20);
    expect(new Set(ticks.map((x) => x.dt))).toEqual(new Set([SIM_TICK_MS]));
    expect(ticks.at(-1)?.n).toBe(20);
  });

  it("alpha stays in [0,1) and reflects the accumulator", () => {
    const { loop, alphas } = mkLoop();
    loop.start();
    loop.step(0);
    loop.step(30);
    loop.step(60);
    for (const a of alphas) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(1);
    }
    expect(alphas.at(-1)).toBeCloseTo(10 / 50, 5);
  });

  it("clamps monster frames to maxFrameMs (spiral-of-death guard)", () => {
    const { loop, ticks } = mkLoop({ maxFrameMs: 250 });
    loop.start();
    loop.step(0);
    loop.step(10_000);
    expect(ticks.length).toBe(250 / SIM_TICK_MS);
  });

  it("ignores time going backwards", () => {
    const { loop, ticks } = mkLoop();
    loop.start();
    loop.step(100);
    loop.step(200);
    loop.step(150);
    expect(ticks.length).toBe(2);
  });

  it("pause stops ticking; resume rebases without a burst", () => {
    const { loop, ticks } = mkLoop();
    loop.start();
    loop.step(0);
    loop.step(100);
    expect(ticks.length).toBe(2);
    loop.pause();
    loop.step(5000);
    expect(ticks.length).toBe(2);
    loop.start();
    loop.step(6000); // rebase frame — no ticks
    expect(ticks.length).toBe(2);
    loop.step(6100);
    expect(ticks.length).toBe(4);
  });

  it("rejects nonsensical configs", () => {
    expect(() => new FixedLoop({ onTick: () => {}, tickMs: 0 })).toThrow(RangeError);
    expect(() => new FixedLoop({ onTick: () => {}, tickMs: 50, maxFrameMs: 10 })).toThrow(
      RangeError,
    );
  });
});

describe("bindVisibility", () => {
  it("pauses when hidden, runs when visible, applies initial state", () => {
    const { loop } = mkLoop();
    let handler: (() => void) | undefined;
    const doc: VisibilityDoc = {
      hidden: false,
      addEventListener: (_t, cb) => {
        handler = cb;
      },
    };
    bindVisibility(loop, doc);
    expect(loop.stats.running).toBe(true);

    doc.hidden = true;
    handler?.();
    expect(loop.stats.running).toBe(false);

    doc.hidden = false;
    handler?.();
    expect(loop.stats.running).toBe(true);
  });
});
