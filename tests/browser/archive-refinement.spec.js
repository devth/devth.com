import { test, expect } from "@playwright/test";

for (const width of [320, 393, 768, 1440]) {
  test(`bold-year archive fits ${width}px in both themes`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 1000 });
    for (const colorScheme of ["light", "dark"]) {
      await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
      await page.goto("/");
      await expect(page.getByRole("searchbox", { name: "Filter writing" })).toBeVisible();
      await expect(page.locator(".entry")).toHaveCount(17);
      await expect(page.locator(".year-group")).toHaveCount(11);
      await expect(page.locator(".entry-arrow")).toHaveCount(0);
      await expect(page.locator(".site-header")).toHaveCSS("border-bottom-width", "0px");
      await expect(page.locator(".site-footer")).toHaveCSS("border-top-width", "0px");
      const geometry = await page.evaluate(() => {
        const year = document.querySelector(".year");
        const trigger = document.querySelector(".header-search");
        const borders = [...document.querySelectorAll(".year-group, .entry")].some((el) => {
          const style = getComputedStyle(el);
          return parseFloat(style.borderTopWidth) || parseFloat(style.borderBottomWidth);
        });
        return {
          borders,
          yearSize: parseFloat(getComputedStyle(year).fontSize),
          // scrollWidth is integer-rounded; the fitted heading can be fractional.
          yearFits: Math.ceil(year.getBoundingClientRect().width) >= year.scrollWidth,
          searchWidth: trigger.getBoundingClientRect().width,
          searchHeight: trigger.getBoundingClientRect().height,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      expect(geometry.borders).toBeFalsy();
      expect(geometry.yearSize).toBeGreaterThanOrEqual(32);
      expect(geometry.yearFits).toBe(true);
      expect(geometry.searchWidth).toBeGreaterThanOrEqual(44);
      expect(geometry.searchHeight).toBeGreaterThanOrEqual(44);
      expect(geometry.overflow).toBe(false);
      await page.locator(".archive").scrollIntoViewIfNeeded();
      await page.screenshot({ path: testInfo.outputPath(`archive-${width}-${colorScheme}.png`) });
    }
  });
}

test("clearing text preserves the selected category and year grouping", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/?category=infrastructure#writing");
  const input = page.getByRole("searchbox", { name: "Filter writing" });
  await input.fill("no-matching-writing-12345");
  await page.getByRole("button", { name: "Clear filter", exact: true }).click();
  await expect(page).toHaveURL(/category=infrastructure#writing$/);
  await expect(input).toBeFocused();
  await expect(page.getByRole("link", { name: /YAML was a bad idea/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Iteration and Play/ })).toBeHidden();
  await expect(page.locator(".year-group:not([hidden])")).toHaveCount(3);
  await expect(page.locator(".entry:not([hidden])").first()).toHaveCSS("padding-top", "0px");
  await page.getByRole("link", { name: "all posts", exact: true }).click();
  await expect(page.locator(".year-group:not([hidden])")).toHaveCount(11);
});
