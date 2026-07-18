import path from "node:path";
import { describe, expect, it } from "vitest";
import { ESLint } from "eslint";

/**
 * Permanent regression guard for the workflow-contract lint boundaries
 * introduced at 0.1.2 (todo.md §4.1 headlessness, §7.2 determinism).
 * Lints in-memory fixtures AS IF they lived at guarded paths.
 */
const root = process.cwd();
const eslint = new ESLint({ cwd: root });

async function ruleIdsFor(relPath: string, code: string): Promise<(string | null)[]> {
  const [result] = await eslint.lintText(code, {
    filePath: path.join(root, relPath),
    warnIgnored: true,
  });
  return (result?.messages ?? []).map((m) => m.ruleId);
}

describe("lint boundaries", () => {
  it("bans bare three imports inside packages/sim", async () => {
    const rules = await ruleIdsFor(
      "packages/sim/src/__fixture__.ts",
      'import * as THREE from "three";\nexport const x = THREE;\n',
    );
    expect(rules).toContain("no-restricted-imports");
  });

  it("bans deep three imports inside packages/procgen", async () => {
    const rules = await ruleIdsFor(
      "packages/procgen/src/__fixture__.ts",
      'import { Vector3 } from "three/src/math/Vector3.js";\nexport const v = Vector3;\n',
    );
    expect(rules).toContain("no-restricted-imports");
  });

  it("allows three inside apps/client", async () => {
    const rules = await ruleIdsFor(
      "apps/client/src/__fixture__.ts",
      'import * as THREE from "three";\nexport const x = THREE;\n',
    );
    expect(rules).not.toContain("no-restricted-imports");
  });

  it("bans Math.random and Date.now below the render line", async () => {
    const rules = await ruleIdsFor(
      "packages/sim/src/__fixture__.ts",
      "export const r = Math.random();\nexport const t = Date.now();\n",
    );
    expect(rules.filter((r) => r === "no-restricted-properties")).toHaveLength(2);
  });

  it("bans Math.random in client source too", async () => {
    const rules = await ruleIdsFor(
      "apps/client/src/__fixture__.ts",
      "export const r = Math.random();\n",
    );
    expect(rules).toContain("no-restricted-properties");
  });

  it("passes clean deterministic code", async () => {
    const rules = await ruleIdsFor(
      "packages/sim/src/__fixture__.ts",
      "export const two = 1 + 1;\n",
    );
    expect(rules).toHaveLength(0);
  });
});
