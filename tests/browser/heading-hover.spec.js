import { test, expect } from "@playwright/test";

async function pausedClock(page) {
  await page.clock.install({ time: new Date("2026-10-30T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-30T12:00:01Z"));
}
const active = /is-destination-active/;

test("ToC arrival activates its heading for five seconds, then fades back even without pointer movement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await pausedClock(page);
  await page.goto("/on-learning");
  const heading = page.locator(".prose #memory");
  const original = await heading.evaluate((el) => getComputedStyle(el).color);
  const link = page
    .locator("[data-toc][data-enhanced]")
    .getByRole("link", { name: "Memory", exact: true });
  await link.click();
  await page.clock.runFor(300);
  await expect(heading).toBeFocused();
  await expect(heading).toHaveClass(active);
  await expect(page.locator(".heading-sigil")).toBeVisible();
  await expect.poll(() => heading.evaluate((el) => getComputedStyle(el).color)).not.toBe(original);
  await page.clock.runFor(4500);
  await expect(heading).toHaveClass(active);
  await page.clock.runFor(750);
  await expect(heading).not.toHaveClass(active);
  await expect(heading).toHaveCSS("color", original);
  await expect(page.locator(".heading-sigil")).toBeHidden();
  await expect(heading).toBeFocused();
  await expect(page).toHaveURL(/#memory$/);
});

test("direct heading hover and ToC hover activate the same destination without navigating", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/on-learning");
  const heading = page.locator(".prose #memory");
  const original = await heading.evaluate((el) => getComputedStyle(el).color);
  const toc = page.locator("[data-toc][data-enhanced]");
  await heading.scrollIntoViewIfNeeded();
  const position = await page.evaluate(() => scrollY);
  await toc.getByRole("link", { name: "Memory", exact: true }).hover();
  await expect(heading).toHaveClass(active);
  await expect(page.locator(".heading-sigil")).toBeVisible();
  expect(await page.evaluate(() => scrollY)).toBe(position);
  await expect(page).not.toHaveURL(/#memory$/);
  await heading.hover();
  await expect(heading).toHaveClass(active);
  await page.mouse.move(1438, 1);
  await expect(heading).not.toHaveClass(active);
  await expect(heading).toHaveCSS("color", original);
  await expect(page.locator(".heading-sigil")).toBeHidden();
});

test("hovering an offscreen ToC destination never scrolls or parks a glyph at the viewport edge", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/on-learning");
  const heading = page.locator(".prose #memory");
  const before = await page.evaluate(() => scrollY);
  await page
    .locator("[data-toc][data-enhanced]")
    .getByRole("link", { name: "Memory", exact: true })
    .hover();
  await expect(heading).toHaveClass(active);
  expect(await page.evaluate(() => scrollY)).toBe(before);
  await expect(page.locator(".heading-sigil")).toBeHidden();
});

test("direct heading clicks renew the five-second activation", async ({ page }) => {
  await pausedClock(page);
  await page.goto("/on-learning");
  const heading = page.locator(".prose #memory");
  await heading.click();
  await expect(heading).toHaveClass(active);
  await page.clock.runFor(4000);
  await heading.click();
  await page.clock.runFor(4000);
  await expect(heading).toHaveClass(active);
  await page.clock.runFor(1300);
  await expect(heading).not.toHaveClass(active);
  await expect(page.locator(".heading-sigil")).toBeHidden();
});

test("keyboard ToC activation keeps five-second color feedback with no animation under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await pausedClock(page);
  await page.goto("/on-learning");
  const heading = page.locator(".prose #memory");
  const original = await heading.evaluate((el) => getComputedStyle(el).color);
  const link = page
    .locator("[data-toc][data-enhanced]")
    .getByRole("link", { name: "Memory", exact: true });
  await link.focus();
  await link.press("Enter");
  await expect(heading).toBeFocused();
  await expect(heading).toHaveClass(active);
  await expect(heading).toHaveCSS("transition-duration", "0s");
  await expect(page.locator(".heading-sigil")).toBeHidden();
  await page.clock.runFor(5100);
  await expect(heading).not.toHaveClass(active);
  await expect(heading).toHaveCSS("color", original);
});

test("a new direct hover takes priority over an older focused ToC item", async ({ page }) => {
  await page.goto("/on-learning");
  const navLink = page
    .locator("[data-toc][data-enhanced]")
    .getByRole("link", { name: "Memory", exact: true });
  await navLink.focus();
  const heading = page.locator(".prose :is(h2, h3, h4):not(#memory)").first();
  await heading.hover();
  await expect(heading).toHaveClass(/link-distortion/);
  await expect(page.locator(".prose #memory")).not.toHaveClass(/link-distortion/);
});

test("ordinary links and archive titles animate hover colors in both directions", async ({
  page,
}) => {
  await page.goto("/");
  const link = page.locator('.site-header a[href="/about"]');
  const original = await link.evaluate((el) => getComputedStyle(el).color);
  await expect(link).toHaveCSS("transition-property", "color, text-decoration-color");
  await expect(link).toHaveCSS("transition-duration", "0.18s, 0.18s");
  await link.hover();
  await expect.poll(() => link.evaluate((el) => getComputedStyle(el).color)).not.toBe(original);
  await page.mouse.move(1, 1);
  await expect(link).toHaveCSS("color", original);
  await expect(page.locator(".entry-title").first()).toHaveCSS(
    "transition-duration",
    "0.18s, 0.18s",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(link).toHaveCSS("transition-duration", "0s");
});
