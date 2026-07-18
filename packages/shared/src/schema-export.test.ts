import { describe, expect, it } from "vitest";
import { z } from "zod";
import { SCHEMA_MANIFEST } from "./schema-manifest.js";

describe("JSON Schema export manifest (0.2.4)", () => {
  it("publishes all 9 wire schemas with unique kebab-case names", () => {
    expect(SCHEMA_MANIFEST).toHaveLength(9);
    const names = SCHEMA_MANIFEST.map((e) => e.name);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(n).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("every entry converts to a structurally valid JSON Schema", () => {
    for (const { name, schema } of SCHEMA_MANIFEST) {
      const js = z.toJSONSchema(schema, { io: "input" });
      // JSON-serializable round trip
      const round = JSON.parse(JSON.stringify(js)) as Record<string, unknown>;
      const shapeKeys = ["type", "anyOf", "oneOf", "enum", "$ref"];
      expect(
        shapeKeys.some((k) => k in round),
        `${name} schema must expose a recognizable shape`,
      ).toBe(true);
    }
  });

  it("status-msg input schema keeps intensity optional (default applies server-side)", () => {
    const entry = SCHEMA_MANIFEST.find((e) => e.name === "status-msg");
    if (!entry) throw new Error("status-msg missing");
    const js = z.toJSONSchema(entry.schema, { io: "input" }) as {
      required?: string[];
    };
    expect(js.required ?? []).toContain("status");
    expect(js.required ?? []).not.toContain("intensity");
  });

  it("agent-message envelope exports as a union", () => {
    const entry = SCHEMA_MANIFEST.find((e) => e.name === "agent-message");
    if (!entry) throw new Error("agent-message missing");
    const js = JSON.parse(JSON.stringify(z.toJSONSchema(entry.schema, { io: "input" }))) as Record<
      string,
      unknown
    >;
    expect("anyOf" in js || "oneOf" in js).toBe(true);
  });

  it("enum export matches the wire contract (snapshot)", () => {
    const entry = SCHEMA_MANIFEST.find((e) => e.name === "agent-status");
    if (!entry) throw new Error("agent-status missing");
    expect(z.toJSONSchema(entry.schema)).toMatchSnapshot();
  });
});
