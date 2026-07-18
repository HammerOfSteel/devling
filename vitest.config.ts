import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "packages/*/src/**/*.test.ts",
      "apps/*/src/**/*.test.ts",
      "tools/*/src/**/*.test.ts",
      "test/**/*.test.ts",
    ],
    coverage: {
      provider: "v8",
      include: ["packages/shared/src/**", "packages/sim/src/**", "packages/procgen/src/**"],
      exclude: ["**/*.test.ts"],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
      reporter: ["text", "lcov"],
    },
  },
});
