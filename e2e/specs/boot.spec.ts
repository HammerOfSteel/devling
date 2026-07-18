import { expect, test } from "@playwright/test";

/**
 * Harness self-test (0.1.4): proves the Playwright toolchain + fixed
 * viewport contract before any app exists. Replaced as the smoke anchor
 * by real client/server boot specs at 0.4.x.
 */
test("@smoke harness boots a page at the contract viewport", async ({ page }) => {
  await page.goto("about:blank");
  await page.setContent("<title>devling harness</title><h1>ok</h1>");

  await expect(page.locator("h1")).toHaveText("ok");
  expect(page.viewportSize()).toEqual({ width: 1280, height: 800 });
});
