import { test, expect } from "@playwright/test";

test("ToC has one document scroll surface and sticks only when it fits", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 240 });
  await page.goto("/on-learning");
  const toc = page.locator("[data-toc]");
  await expect(toc).toHaveAttribute("data-enhanced", "");
  await expect(toc).toHaveCSS("position", "static");
  await expect(toc.locator("nav")).toHaveCSS("overflow-y", "visible");
  await toc.locator("a").first().hover();
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel(0, 250);
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(before);
  expect(await toc.locator("nav").evaluate((nav) => nav.scrollTop)).toBe(0);
  await page.setViewportSize({ width: 1440, height: 1100 });
  await expect(toc).toHaveCSS("position", "sticky");
});

test("ToC click eases quickly to a heading, updates history, and transfers focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.clock.install();
  await page.goto("/on-learning");
  const toc = page.locator("[data-toc][data-enhanced]");
  await expect(toc).toBeVisible();
  const before = await page.evaluate(() => scrollY);
  await toc.getByRole("link", { name: "Memory", exact: true }).click();
  await expect(page).toHaveURL(/#memory$/);
  await page.clock.runFor(100);
  const midway = await page.evaluate(() => scrollY);
  expect(midway).toBeGreaterThan(before);
  await page.clock.runFor(160);
  const heading = page.locator(".prose #memory");
  expect((await heading.boundingBox()).y).toBeCloseTo(32, 0);
  await expect(heading).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(midway);
  await page.goBack();
  await expect(page).toHaveURL(/\/on-learning$/);
});

test("ToC rail has one short glint and reduced motion skips both glint and scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/on-learning");
  const toc = page.locator("[data-toc]");
  await expect(toc).toHaveAttribute("data-enhanced", "");
  await expect(toc.locator(".toc-arrival")).toHaveCSS("animation-name", "toc-glint");
  await expect(toc.locator(".toc-arrival")).toHaveCSS("animation-iteration-count", "1");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(toc.locator(".toc-arrival")).toHaveCSS("animation-name", "none");
  await expect(toc.locator(".toc-track")).toHaveCSS("animation-name", "none");
  await toc.getByRole("link", { name: "Memory", exact: true }).click();
  await expect(page.locator(".prose #memory")).toBeFocused();
  expect((await page.locator(".prose #memory").boundingBox()).y).toBeCloseTo(32, 0);
});
