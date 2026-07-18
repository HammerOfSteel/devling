import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

const HEADLESS_MSG =
  "sim/procgen are headless — importing three here breaks the render boundary (todo.md §4.1).";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".husky/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // ── Determinism & headlessness guards: packages/sim + packages/procgen ──
    files: ["packages/sim/**/*.ts", "packages/procgen/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "three", message: HEADLESS_MSG }],
          patterns: [{ group: ["three/*"], message: HEADLESS_MSG }],
        },
      ],
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "All randomness flows from forked alea streams (todo.md §7.2.1).",
        },
        {
          object: "Date",
          property: "now",
          message: "Wall time is banned below the render line — inject GameClock (todo.md §7.2.2).",
        },
      ],
    },
  },
  {
    // ── Determinism guard: client source (dev tooling exempt) ──
    files: ["apps/client/src/**/*.ts"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "Math",
          property: "random",
          message: "All randomness flows from forked alea streams (todo.md §7.2.1).",
        },
      ],
    },
  },
  prettier,
);
