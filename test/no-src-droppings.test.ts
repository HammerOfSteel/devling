import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Tripwire (task 0.3 postmortem): if compiled .js/.d.ts files ever land
 * beside TypeScript sources, NodeNext-style "./x.js" imports silently
 * resolve to the STALE JS — tests keep passing against old code while
 * coverage of the real sources drops to zero. That exact failure cost a
 * debugging session on 2026-07-18. This test makes it loud and instant.
 */

const SRC_ROOTS = ["packages", "apps", "tools"];

function walk(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (entry === "node_modules" || entry === "dist") continue;
    if (statSync(p).isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

describe("source-tree hygiene", () => {
  it("no compiled .js/.d.ts droppings inside any src/ directory", () => {
    const offenders: string[] = [];
    for (const root of SRC_ROOTS) {
      for (const pkg of readdirSync(root)) {
        const src = join(root, pkg, "src");
        try {
          statSync(src);
        } catch {
          continue;
        }
        for (const file of walk(src)) {
          if (/\.(js|mjs|cjs|d\.ts)$/.test(file)) offenders.push(file);
        }
      }
    }
    expect(offenders, `stale build artifacts beside sources: ${offenders.join(", ")}`).toEqual([]);
  });
});
