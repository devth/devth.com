import { test, expect } from "@playwright/test";
const active = ".link-sigil:not([data-retiring])";
test("a new hover starts alongside the old one's complete 800ms unwind", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-31T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T12:00:01Z"));
  await page.goto("/");
  await page.locator('.site-header a[href="/about"]').hover();
  await expect(page.locator(active)).toBeVisible();
  await page.clock.runFor(1200);
  await page.locator('.site-header a[href="/overture"]').hover();
  await expect(page.locator(".link-sigil:visible")).toHaveCount(2);
  const outgoing = page.locator(".link-sigil[data-retiring]");
  await expect(outgoing).toBeVisible();
  await page.clock.runFor(790);
  await expect(outgoing).toBeVisible();
  await page.clock.runFor(30);
  await expect(outgoing).toHaveCount(0);
  await expect(page.locator(active)).toBeVisible();
});
test("the whole writing row is a hover and click target while category links stay separate", async ({
  page,
}) => {
  await page.goto("/");
  const row = page.locator(".entry").first();
  await row.hover({ position: { x: 8, y: 8 } });
  await expect(page.locator(active)).toBeVisible();
  await expect(row.locator(".entry-link")).toHaveClass(/link-distortion/);
  await row.locator(".category-link").first().hover();
  await expect(row.locator(".entry-link")).toHaveClass(/link-distortion/);
  await row.locator(".category-link").first().click();
  await expect(page).toHaveURL(/category=/);
});
test("whitespace in a writing row follows the post anchor", async ({ page }) => {
  await page.goto("/");
  const row = page.locator(".entry").first(),
    href = await row.locator(".entry-link").getAttribute("href");
  await row.click({ position: { x: 8, y: 8 } });
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", href);
});

test("rapid pointer storms stay bounded and Escape clears every outgoing field", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('.site-header a[href="/about"]').hover();
  await expect(page.locator(active)).toBeVisible();
  await page.evaluate(() => {
    const links = [...document.querySelectorAll(".site-header nav a")];
    for (let index = 0; index < 80; index++)
      links[index % links.length].dispatchEvent(
        new PointerEvent("pointerover", { bubbles: true, pointerType: "mouse" }),
      );
  });
  expect(await page.locator(".link-sigil").count()).toBeLessThanOrEqual(13);
  await page.keyboard.press("Escape");
  await expect(page.locator(".link-sigil:visible")).toHaveCount(0);
  await expect(page.locator(".link-sigil")).toHaveCount(1);
});

test("internal navigation retains the actual shell and active nav growth", async ({ page }) => {
  await page.goto("/about");
  // Moving focus from another control must not restart an already-hovered nav link.
  await page.getByRole("button", { name: "Search", exact: true }).focus();
  await page.evaluate(() => {
    window.shellMarker = 42;
    window.oldHeader = document.querySelector(".site-header");
    window.oldGraph = document.querySelector(".page-graph");
    window.oldDialog = document.querySelector("#quick-nav");
  });
  const link = page.locator('.site-header a[href="/glossary"]');
  await link.hover();
  await expect(page.locator(active)).toBeVisible();
  const initialRoots = await page.locator(active).getAttribute("data-growth-roots");
  await expect
    .poll(() => page.locator(active).getAttribute("data-growth-roots"))
    .not.toBe(initialRoots);
  await page.locator(active).evaluate((svg) => (window.originalSigil = svg));
  const roots = Number(await page.locator(active).getAttribute("data-growth-roots"));
  await link.click();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.getByRole("heading", { level: 1, name: "Glossary" })).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        window.shellMarker === 42 &&
        window.oldHeader === document.querySelector(".site-header") &&
        window.oldGraph === document.querySelector(".page-graph") &&
        window.oldDialog === document.querySelector("#quick-nav"),
    ),
  ).toBe(true);
  await expect(page.locator(active)).toBeVisible();
  expect(
    Number(await page.locator(active).getAttribute("data-growth-roots")),
  ).toBeGreaterThanOrEqual(roots);
  expect(await page.locator(active).evaluate((svg) => window.originalSigil === svg)).toBe(true);
});
