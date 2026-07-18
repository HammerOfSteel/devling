import { describe, expect, it } from "vitest";
import { ReplayRing } from "./ring.js";

describe("ReplayRing (0.3.3)", () => {
  it("keeps insertion order below capacity", () => {
    const r = new ReplayRing<number>(3);
    r.push(1);
    r.push(2);
    expect(r.toArray()).toEqual([1, 2]);
  });

  it("evicts oldest at capacity (wrap-around)", () => {
    const r = new ReplayRing<number>(3);
    for (const n of [1, 2, 3, 4, 5]) r.push(n);
    expect(r.toArray()).toEqual([3, 4, 5]);
    expect(r.size).toBe(3);
  });

  it("capacity 0 stores nothing", () => {
    const r = new ReplayRing<number>(0);
    r.push(1);
    expect(r.toArray()).toEqual([]);
  });

  it("toArray returns a defensive copy", () => {
    const r = new ReplayRing<number>(2);
    r.push(1);
    const snap = r.toArray();
    snap.push(99);
    expect(r.toArray()).toEqual([1]);
  });

  it("rejects invalid capacity", () => {
    expect(() => new ReplayRing(-1)).toThrow(RangeError);
    expect(() => new ReplayRing(1.5)).toThrow(RangeError);
  });
});
