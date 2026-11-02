import { test, expect } from "@playwright/test";
import { studyFrame } from "../../src/hover-studies.js";
async function setup(page, path = "/") {
  await page.clock.install({ time: new Date("2026-10-31T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-31T12:00:01Z"));
  await page.goto(path);
}
const segments = (sigil) =>
  sigil
    .locator("g")
    .nth(1)
    .locator("path")
    .evaluateAll((paths) =>
      paths.map((p) => (p.getAttribute("d").match(/Q/g) || []).length).reduce((a, b) => a + b, 0),
    );

for (const structure of ["triple", "tendril"]) {
  test(`leaving during ${structure} construction never reveals an undrawn full seed`, async ({
    page,
  }) => {
    await page.addInitScript(
      (structure) =>
        localStorage.setItem(
          "devth:hover-preferences:v1",
          JSON.stringify({ structure, generation: true }),
        ),
      structure,
    );
    await setup(page);
    await page.locator('.site-header a[href="/about"]').hover();
    const glyph = page.locator(".link-sigil:not([data-retiring])");
    await expect(glyph).toBeVisible();
    const key = await glyph.getAttribute("data-sigil-key");
    const core = page.locator(`svg[data-sigil-key="${key}"] g:first-child path`);
    const count = () =>
      core.evaluateAll((paths) =>
        paths.reduce((n, path) => n + (path.getAttribute("d").match(/M/g) || []).length, 0),
      );
    const full = Object.values(studyFrame(structure)).join("").match(/M/g).length;
    await page.clock.runFor(120);
    const partial = await count();
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(full);
    await page.mouse.move(1, 1);
    expect(await count()).toBeLessThan(full);
    await page.clock.runFor(400);
    expect(await count()).toBeLessThanOrEqual(partial);
    await page.clock.runFor(450);
    await expect(glyph).toBeHidden();
  });
}

test("mouse leave retracts roots over 800ms without advancing or stretching them", async ({
  page,
}) => {
  await setup(page);
  const sigil = page.locator(".link-sigil:not([data-retiring])");
  await page.locator('.site-header a[href="/about"]').hover();
  await expect(sigil).toBeVisible();
  // Finish the 650ms seed draw, then grow for the original 1800ms.
  await page.clock.runFor(2450);
  const count = await segments(sigil);
  const roots = await sigil.getAttribute("data-growth-roots");
  const transform = await sigil.locator("g").first().getAttribute("transform");
  expect(count).toBeGreaterThan(10);
  await page.mouse.move(1, 1);
  await expect(sigil).toBeVisible();
  await page.clock.runFor(400);
  await expect(sigil).toBeVisible();
  expect(await segments(sigil)).toBeGreaterThan(0);
  expect(await segments(sigil)).toBeLessThan(count);
  await expect(sigil).toHaveAttribute("data-growth-roots", roots);
  await expect(sigil.locator("g").first()).toHaveAttribute("transform", transform);
  await page.clock.runFor(390);
  await expect(sigil).toBeVisible();
  await page.clock.runFor(20);
  await expect(sigil).toBeHidden();
  expect(await segments(sigil)).toBe(0);
});

test("a fresh hover cancels the old unwind timer and Escape clears immediately", async ({
  page,
}) => {
  await setup(page);
  const sigil = page.locator(".link-sigil:not([data-retiring])");
  const about = page.locator('.site-header a[href="/about"]');
  await about.hover();
  await expect(sigil).toBeVisible();
  await page.clock.runFor(1000);
  const type = await sigil.getAttribute("data-structure");
  await page.mouse.move(1, 1);
  await page.clock.runFor(300);
  await about.hover();
  await expect(sigil).not.toHaveAttribute("data-structure", type);
  await page.clock.runFor(1000);
  await expect(sigil).toBeVisible();
  await page.mouse.move(1, 1);
  await page.clock.runFor(100);
  await page.keyboard.press("Escape");
  await expect(sigil).toBeHidden();
});

test("heading hover unwinds on leave without extending the separate five-second click hold", async ({
  page,
}) => {
  await setup(page, "/on-learning");
  await expect(page.locator("[data-toc][data-enhanced]")).toBeAttached();
  const heading = page.locator(".prose #memory");
  await heading.scrollIntoViewIfNeeded();
  await heading.hover();
  await page.clock.runFor(32);
  const sigil = page.locator(".heading-sigil:not([data-retiring])");
  await expect(sigil).toBeVisible();
  await page.clock.runFor(1200);
  const count = await segments(sigil);
  await page.mouse.move(1, 1);
  await page.clock.runFor(400);
  await expect(sigil).toBeVisible();
  expect(await segments(sigil)).toBeLessThan(count);
  await page.clock.runFor(450);
  await expect(sigil).toBeHidden();
});
