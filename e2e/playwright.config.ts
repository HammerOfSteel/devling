import { defineConfig, devices } from "@playwright/test";

/**
 * Smoke/e2e harness (todo.md §7.1).
 * Fixed 1280×800 @ DPR 1 — golden frames depend on this never drifting.
 * Tag conventions: @smoke on task-gate specs; everything runs at phase gates.
 */
export default defineConfig({
  testDir: "./specs",
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
      },
    },
  ],
  // TODO(0.4.4): webServer entries boot apps/client (vite) + apps/server (Bridge)
  // once they exist; specs then target http://localhost:5173 with __devling hook.
});
