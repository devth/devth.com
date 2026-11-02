import { test, expect } from "@playwright/test";
async function setup(page, path = "/") {
  await page.clock.install({ time: new Date("2026-11-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-01T12:00:01Z"));
  await page.goto(path);
}
const ink = (layer) =>
  layer
    .locator("path")
    .evaluateAll((paths) => paths.map((path) => path.getAttribute("d") || "").join(""));
test("switching apps preserves and pauses the current hover instead of destroying or reseeding it", async ({
  page,
}) => {
  await setup(page);
  await page.locator('.site-header a[href="/about"]').hover();
  const front = page.locator(".link-sigil:not([data-retiring])");
  await expect(front).toBeVisible();
  await page.clock.runFor(1400);
  const key = await front.getAttribute("data-sigil-key");
  const pair = page.locator(`svg[data-sigil-key="${key}"]`);
  const before = await ink(pair);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.clock.runFor(3000);
  await expect(front).toBeVisible();
  expect(await ink(pair)).toBe(before);
  await page.evaluate(() => dispatchEvent(new Event("focus")));
  await page.clock.runFor(300);
  await expect(front).toHaveAttribute("data-sigil-key", key);
  expect(await ink(pair)).not.toBe(before);
  await page.mouse.move(1, 1);
  await page.clock.runFor(850);
  await expect(front).toBeHidden();
});

test("tab visibility preserves the same drawing and resumes without a focus event", async ({
  page,
}) => {
  await setup(page);
  await page.locator('.site-header a[href="/about"]').hover();
  const glyph = page.locator(".link-sigil:not([data-retiring])");
  await expect(glyph).toBeVisible();
  await page.clock.runFor(900);
  const before = await ink(glyph);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(3000);
  await expect(glyph).toBeVisible();
  expect(await ink(glyph)).toBe(before);
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(300);
  expect(await ink(glyph)).not.toBe(before);
});

test("an in-flight mouse-away unwind pauses across focus and visibility changes", async ({
  page,
}) => {
  await setup(page);
  await page.locator('.site-header a[href="/about"]').hover();
  const glyph = page.locator(".link-sigil:not([data-retiring])");
  await expect(glyph).toBeVisible();
  await page.clock.runFor(1000);
  await page.mouse.move(1, 1);
  await page.clock.runFor(200);
  const before = await ink(glyph);
  await page.evaluate(() => {
    dispatchEvent(new Event("blur"));
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(4000);
  await expect(glyph).toBeVisible();
  expect(await ink(glyph)).toBe(before);
  await page.evaluate(() => {
    dispatchEvent(new Event("focus"));
    delete document.hidden;
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.clock.runFor(590);
  await expect(glyph).toBeVisible();
  await page.clock.runFor(20);
  await expect(glyph).toBeHidden();
});

test("a clicked heading and its five-second hold pause while another app has focus", async ({
  page,
}) => {
  await setup(page, "/on-learning");
  const heading = page.locator(".prose #memory");
  await heading.scrollIntoViewIfNeeded();
  await heading.click();
  await page.clock.runFor(500);
  const glyph = page.locator(".heading-sigil:not([data-retiring])");
  await expect(glyph).toBeVisible();
  const before = await ink(glyph);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.clock.runFor(8000);
  await expect(glyph).toBeVisible();
  expect(await ink(glyph)).toBe(before);
  await expect(heading).toHaveClass(/is-destination-active/);
  await page.evaluate(() => dispatchEvent(new Event("focus")));
  await page.clock.runFor(300);
  expect(await ink(glyph)).not.toBe(before);
  await page.clock.runFor(4500);
  await expect(heading).not.toHaveClass(/is-destination-active/);
});
