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
    baseURL: "http://127.0.0.1:5173",
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
  // Bridge server joins here in Phase 5 (integration proof 5.5.3).
  webServer: {
    command: "pnpm --filter @devling/client dev",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
