import { describe, expect, it } from "vitest";
import { createDevlingHook, installDevlingHook } from "./hook.js";

const mk = () => {
  let tick = 0;
  let angle = 0;
  const handle = createDevlingHook({
    loopStats: () => ({ tick, running: true }),
    cubeAngle: () => angle,
  });
  return { handle, advance: (t: number, a: number) => ((tick = t), (angle = a)) };
};

describe("__devling hook v0 (0.4.4)", () => {
  it("reflects live loop + scene state", () => {
    const { handle, advance } = mk();
    expect(handle.hook.state()).toMatchObject({
      hookVersion: 0,
      mode: "autonomy",
      status: null,
      tick: 0,
      running: true,
    });
    advance(42, 1.5);
    const s = handle.hook.state();
    expect(s.tick).toBe(42);
    expect(s.cubeAngle).toBe(1.5);
  });

  it("drainEvents returns queued events once, in order", () => {
    const { handle } = mk();
    handle.pushEvent("boot");
    handle.pushEvent("first-render");
    expect(handle.hook.drainEvents()).toEqual(["boot", "first-render"]);
    expect(handle.hook.drainEvents()).toEqual([]);
  });

  it("installs on an arbitrary target as __devling", () => {
    const { handle } = mk();
    const fakeWindow = {};
    installDevlingHook(fakeWindow, handle.hook);
    expect(
      (fakeWindow as { __devling?: { state(): { hookVersion: number } } }).__devling?.state()
        .hookVersion,
    ).toBe(0);
  });
});
