import { expect, it } from "vitest";
import { PACKAGE_NAME, PROTOCOL_VERSION } from "./index.js";

it("pins protocol wire version 1 (todo.md §5.1)", () => {
  expect(PROTOCOL_VERSION).toBe(1);
  expect(PACKAGE_NAME).toBe("@devling/shared");
});
