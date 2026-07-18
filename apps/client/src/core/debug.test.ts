import { describe, expect, it } from "vitest";
import { isDebugEnabled } from "./debug.js";

describe("isDebugEnabled (0.4.4)", () => {
  it.each([
    ["?debug", true],
    ["?debug=1", true],
    ["?seed=42&debug", true],
    ["", false],
    ["?seed=42", false],
    ["?debugger", false],
  ])("%s → %s", (search, expected) => {
    expect(isDebugEnabled(search)).toBe(expected);
  });
});
