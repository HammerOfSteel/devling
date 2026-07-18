import { describe, expect, it } from "vitest";
import { fnv1a32 } from "./index.js";

describe("fnv1a32 — sub-seed forking primitive (todo.md §7.2.1)", () => {
  it("matches the FNV offset-basis vector for empty input", () => {
    expect(fnv1a32("")).toBe(0x811c9dc5);
  });

  it("is deterministic and input-sensitive", () => {
    expect(fnv1a32("devling")).toBe(fnv1a32("devling"));
    expect(fnv1a32("devling")).not.toBe(fnv1a32("devlinh"));
    expect(fnv1a32("seed:layout")).not.toBe(fnv1a32("seed:dna"));
  });

  it("stays in uint32 range for varied inputs", () => {
    for (const s of ["", "a", "🏠", "long".repeat(1000)]) {
      const h = fnv1a32(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});
