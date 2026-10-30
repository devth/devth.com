import { test, expect } from "@playwright/test";

test("hover geometry keeps evolving, holds text still and cancels on exit or resize", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const link = page.locator('.site-header a[href="/about"]');
  const sigil = page.locator(".link-sigil");
  const box = await link.boundingBox();
  await link.hover();
  const first = await sigil.locator("path").getAttribute("d");
  expect(first).not.toContain("NaN");
  await page.clock.runFor(1600);
  expect(await sigil.locator("path").getAttribute("d")).not.toBe(first);
  expect(await link.boundingBox()).toEqual(box);
  await page.mouse.move(1, 1);
  await expect(sigil).toBeHidden();
  const stopped = await sigil.locator("path").getAttribute("d");
  await page.clock.runFor(1000);
  expect(await sigil.locator("path").getAttribute("d")).toBe(stopped);
  await link.hover();
  await expect(sigil).toBeVisible();
  await page.setViewportSize({ width: 1200, height: 800 });
  await expect(sigil).toBeHidden();
});

test("navigation gets one background-only sheen after its native transition", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".page-sheen")).not.toHaveAttribute("data-active");
  await page.locator('.site-header a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  const sheen = page.locator(".page-sheen[data-active]");
  await expect(sheen).toHaveAttribute("aria-hidden", "true");
  const style = await sheen.evaluate((element) => {
    const layer = getComputedStyle(element);
    const effect = getComputedStyle(element, "::before");
    return {
      z: layer.zIndex,
      events: layer.pointerEvents,
      name: effect.animationName,
      iterations: effect.animationIterationCount,
      duration: effect.animationDuration,
    };
  });
  expect(style).toEqual({
    z: "-1",
    events: "none",
    name: "page-sheen",
    iterations: "1",
    duration: "0.42s",
  });
  await expect
    .poll(() => sheen.evaluate((element) => getComputedStyle(element, "::before").opacity))
    .toBe("0");
  await expect(page.locator(".prose")).toHaveCSS("filter", "none");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.site-header a[href="/overture"]').click();
  await expect(page).toHaveURL(/\/overture$/);
  await expect(page.locator(".page-sheen")).toBeHidden();
  await expect(page.locator(".page-sheen")).not.toHaveAttribute("data-active");
});

test("switcher keeps query and touch-sized dismissal visible with one results scroller", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 420 });
  await page.goto("/");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  const query = dialog.getByRole("combobox");
  await expect(dialog.getByRole("option")).toHaveCount(22);
  await expect(query).toBeFocused();
  const close = dialog.getByRole("button", { name: "Close search" });
  const closeBox = await close.boundingBox();
  expect(closeBox.width).toBeGreaterThanOrEqual(44);
  expect(closeBox.height).toBeGreaterThanOrEqual(44);
  const box = await dialog.boundingBox();
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height).toBeLessThanOrEqual(420);
  await expect(dialog).toHaveCSS("overflow-y", "hidden");
  await expect(dialog.getByRole("listbox")).toHaveCSS("overflow-y", "auto");
  const inputBox = await query.boundingBox();
  await page.keyboard.press("ArrowUp");
  await expect(dialog.getByRole("option").last()).toHaveAttribute("aria-selected", "true");
  expect(await query.boundingBox()).toEqual(inputBox);
  await expect(query).toBeFocused();
  await close.click();
  await expect(dialog).toBeHidden();
});
