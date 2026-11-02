import { test, expect } from "@playwright/test";

const cursor = (page) => page.locator(".geometric-cursor");
const root = (page) => page.locator("html");
async function ready(page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  return page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
}

test("one simple geometric pointer keeps its shape, tracks its tip hotspot and stays idle at rest", async ({
  page,
}, testInfo) => {
  await page.clock.install();
  const fine = await ready(page);
  if (!fine) {
    await page.mouse.move(20, 150);
    await expect(cursor(page)).toHaveCount(0);
    await expect(root(page)).not.toHaveAttribute("data-geometric-cursor");
    return;
  }
  await expect(cursor(page)).toHaveCount(1);
  await page.mouse.move(20, 150);
  await expect(cursor(page)).toBeVisible();
  const first = await cursor(page).locator("path").getAttribute("d");
  await page.mouse.move(20, 450, { steps: 12 });
  await expect(cursor(page).locator("path")).toHaveCount(1);
  await expect(cursor(page).locator("path")).toHaveAttribute("d", first);
  const box = await cursor(page).boundingBox();
  expect(box.x + 2).toBeCloseTo(20, 1);
  expect(box.y + 2).toBeCloseTo(450, 1);
  expect(box.width).toBeLessThanOrEqual(20);
  expect(box.height).toBeLessThanOrEqual(26);
  await expect(cursor(page)).toHaveCSS("pointer-events", "none");
  await expect(cursor(page)).toHaveAttribute("aria-hidden", "true");
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.evaluate(() => {
    window.cursorPaints = 0;
    window.cursorObserver = new MutationObserver(
      (records) => (window.cursorPaints += records.length),
    );
    window.cursorObserver.observe(document.querySelector(".geometric-cursor"), {
      subtree: true,
      attributes: true,
    });
  });
  await page.clock.runFor(1000);
  expect(
    await page.evaluate(() => {
      window.cursorObserver.disconnect();
      return window.cursorPaints;
    }),
  ).toBe(0);
  await page.screenshot({ path: testInfo.outputPath("geometric-cursor-light.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: testInfo.outputPath("geometric-cursor-dark.png") });
});

test("editing, dragging, modal search and blur keep the native cursor", async ({ page }) => {
  const fine = await ready(page);
  if (!fine) {
    await expect(cursor(page)).toHaveCount(0);
    return;
  }
  await expect(cursor(page)).toHaveCount(1);
  await page.mouse.move(20, 150);
  await expect(root(page)).toHaveAttribute("data-geometric-cursor", "");
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "Cursor editing check");
    input.style.cssText = "position:fixed;left:20px;top:300px;width:160px;height:44px;z-index:10";
    document.body.append(input);
  });
  const field = page.getByRole("textbox", { name: "Cursor editing check" });
  await field.hover();
  await expect(cursor(page)).toBeHidden();
  expect(await field.evaluate((element) => getComputedStyle(element).cursor)).not.toBe("none");
  await field.evaluate((element) => element.remove());
  await page.mouse.move(20, 150);
  await expect(cursor(page)).toBeVisible();
  await page.mouse.down();
  await page.mouse.move(25, 160);
  await expect(cursor(page)).toBeHidden();
  await page.mouse.up();
  await page.mouse.move(20, 150);
  await expect(cursor(page)).toBeVisible();
  await page.keyboard.press("Control+k");
  await expect(page.getByRole("dialog", { name: "Search", exact: true })).toBeVisible();
  await page.mouse.move(30, 170);
  await expect(cursor(page)).toBeHidden();
  expect(
    await page.locator("body").evaluate((element) => getComputedStyle(element).cursor),
  ).not.toBe("none");
  await page.keyboard.press("Escape");
  await page.mouse.move(20, 150);
  await expect(cursor(page)).toBeVisible();
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await expect(cursor(page)).toBeHidden();
  await expect(root(page)).not.toHaveAttribute("data-geometric-cursor");
});

test("programmatic dialogs immediately release the geometric cursor", async ({ page }) => {
  const fine = await ready(page);
  if (!fine) return;
  await expect(cursor(page)).toHaveCount(1);
  await page.mouse.move(20, 150);
  await expect(cursor(page)).toBeVisible();
  const released = await page.evaluate(() => {
    const dialog = document.createElement("dialog");
    dialog.id = "cursor-modal-check";
    dialog.textContent = "native pointing";
    document.body.append(dialog);
    dialog.showModal();
    return !document.documentElement.hasAttribute("data-geometric-cursor");
  });
  expect(released).toBe(true);
  await expect(cursor(page)).toBeHidden();
  await page.evaluate(() => {
    const dialog = document.querySelector("#cursor-modal-check");
    dialog.close();
    dialog.remove();
  });
  await page.mouse.move(20, 160);
  await expect(cursor(page)).toBeVisible();
});

test("one cursor survives navigation and reduced motion or high contrast restores native pointing", async ({
  page,
}) => {
  const fine = await ready(page);
  if (!fine) {
    await expect(cursor(page)).toHaveCount(0);
    return;
  }
  await expect(cursor(page)).toHaveCount(1);
  const shape = await cursor(page).locator("path").getAttribute("d");
  await page.evaluate(() => (window.originalCursor = document.querySelector(".geometric-cursor")));
  await page.locator(".site-header nav").getByRole("link", { name: "about", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-page-class", "about-page");
  expect(
    await page.evaluate(
      () => window.originalCursor === document.querySelector(".geometric-cursor"),
    ),
  ).toBe(true);
  await page.mouse.move(20, 150);
  await expect(cursor(page)).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(cursor(page)).toBeHidden();
  await expect(root(page)).not.toHaveAttribute("data-geometric-cursor");
  await page.mouse.move(20, 170);
  await expect(cursor(page)).toBeHidden();
  await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
  await page.mouse.move(20, 190);
  await expect(cursor(page)).toBeHidden();
  await page.emulateMedia({ forcedColors: "none" });
  await page.mouse.move(20, 210);
  await expect(cursor(page)).toBeVisible();
  await expect(cursor(page)).toHaveCount(1);
  await expect(cursor(page).locator("path")).toHaveAttribute("d", shape);
});
