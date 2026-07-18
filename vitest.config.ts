import { defineConfig } from "vitest/config";

import { fileURLToPath } from "node:url";

const src = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@devling/shared": src("packages/shared/src/index.ts"),
      "@devling/sim": src("packages/sim/src/index.ts"),
      "@devling/procgen": src("packages/procgen/src/index.ts"),
    },
  },
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "tools/*/src/**/*.test.ts",
      "test/**/*.test.ts",
    ],
    coverage: {
      provider: "istanbul",
      include: ["packages/shared/src/**", "packages/sim/src/**", "packages/procgen/src/**"],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
      reporter: ["text", "lcov"],
    },
  },
});
