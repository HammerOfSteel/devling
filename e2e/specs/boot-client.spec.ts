import { expect, test } from "@playwright/test";

/**
 * Task 0.4 smoke gate: real vite dev server (webServer), real WebGL.
 * Asserts through window.__devling — states, not pixels (todo.md §7).
 */

interface HookState {
  hookVersion: number;
  tick: number;
  running: boolean;
  cubeAngle: number;
}

declare global {
  interface Window {
    __devling?: { state(): HookState; drainEvents(): string[] };
  }
}

test("@smoke client boots, ticks at 20Hz, spins the cube, zero console errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(String(err)));

  await page.goto("/");
  await expect(page.locator("canvas#app")).toBeVisible();

  // hook installed + sim ticking
  await page.waitForFunction(() => (window.__devling?.state().tick ?? 0) > 5, undefined, {
    timeout: 10_000,
  });

  const a = await page.evaluate(() => window.__devling!.state());
  await page.waitForTimeout(400);
  const b = await page.evaluate(() => window.__devling!.state());

  expect(a.hookVersion).toBe(0);
  expect(b.tick).toBeGreaterThan(a.tick);
  // ~400ms at 20Hz ⇒ ~8 ticks; generous CI bounds
  expect(b.tick - a.tick).toBeGreaterThanOrEqual(4);
  expect(b.tick - a.tick).toBeLessThanOrEqual(20);
  expect(b.cubeAngle).toBeGreaterThan(a.cubeAngle);
  expect(b.running).toBe(true);

  const events = await page.evaluate(() => window.__devling!.drainEvents());
  expect(events).toEqual(["boot", "loop-started"]);

  expect(errors).toEqual([]);

  // golden frame #0 — staged artifact only; pixel-compare harness lands at 1.3.4
  await page.screenshot({ path: "golden/__staging__/golden-0-walking-skeleton.png" });
});
