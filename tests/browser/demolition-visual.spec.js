import { test, expect } from "@playwright/test";

for (const colorScheme of ["light", "dark"])
  test(`the ${colorScheme} collapse fits its viewport through tumbling, fracture and disintegration`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme });
    if (testInfo.project.name === "mobile") await page.setViewportSize({ width: 320, height: 600 });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.clock.install();
    await page.goto("/");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const menu = page.getByRole("dialog", { name: "Search", exact: true });
    await expect(menu.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(23);
    const action = menu.getByRole("button", { name: "don't press this", exact: true });
    await expect(action).toBeVisible();
    const size = await action.boundingBox();
    expect(size.height).toBeGreaterThanOrEqual(44);
    const menuBox = await menu.boundingBox();
    await page.screenshot({ path: testInfo.outputPath("before.png") });
    await action.click();
    const dialog = page.getByRole("dialog", { name: "page collapse", exact: true });
    await expect(dialog).toBeVisible();
    await page.clock.pauseAt(new Date(Date.now() + 50));
    const copyBox = await page.locator(".demolition-piece .quick-nav").boundingBox();
    expect(Math.abs(copyBox.width - menuBox.width)).toBeLessThan(5);
    for (const [label, duration] of [
      ["start", 0],
      ["falling", 1800],
      ["crumbling", 2600],
      ["dust", 3200],
      ["empty", 18_000],
    ]) {
      await page.clock.runFor(duration);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect(await page.locator(".demolition-piece").count()).toBeLessThanOrEqual(160);
      await expect(dialog.getByRole("button", { name: "restore", exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(label + ".png") });
    }
    await expect(dialog.getByRole("status")).toHaveText("i told you");
    await expect(page.locator(".demolition-piece")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(menu).toBeVisible();
    expect(errors).toEqual([]);
  });
