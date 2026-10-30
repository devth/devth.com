import { test, expect } from "@playwright/test";

test("social icons live in the borderless footer, not the header", async ({ page }) => {
  await page.goto("/");
  const header = page.locator(".site-header");
  const footer = page.locator(".site-footer");
  await expect(header.locator('a[href="https://github.com/devth"]')).toHaveCount(0);
  await expect(header).toHaveCSS("border-bottom-width", "0px");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("combobox")).toHaveAttribute("placeholder", "find");
  await expect(page.getByRole("button", { name: "Close search" })).toHaveCSS(
    "text-transform",
    "lowercase",
  );
  await page.keyboard.press("Escape");
  await expect(footer).toHaveCSS("border-top-width", "0px");
  for (const [name, href] of [
    ["X profile", "https://x.com/devth"],
    ["GitHub profile", "https://github.com/devth"],
  ]) {
    const link = footer.getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", href);
    await expect(link.locator("svg")).toHaveAttribute("aria-hidden", "true");
    const box = await link.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await link.focus();
    await expect(link).toBeFocused();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("About photograph is full bleed without cropping or a frame, including without JS", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 1000 },
  });
  try {
    const page = await context.newPage();
    for (const width of [320, 393, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(baseURL + "/about");
      const photo = page.getByRole("img", {
        name: "Trevor Hartman at the Dakota 5-0 mountain bike race",
        exact: true,
      });
      await photo.scrollIntoViewIfNeeded();
      const box = await photo.boundingBox();
      expect(box.x).toBeCloseTo(0, 0);
      expect(box.width).toBeCloseTo(width, 0);
      expect(box.height).toBeCloseTo(width, 0);
      await expect(photo).toHaveCSS("border-top-width", "0px");
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
        false,
      );
    }
  } finally {
    await context.close();
  }
});

test("About and search capitalize Trevor Hartman while keeping about lowercase", async ({
  page,
}) => {
  await page.goto("/about");
  const heading = page.getByRole("heading", { name: "About Trevor Hartman", exact: true });
  await expect(heading).toHaveCSS("text-transform", "lowercase");
  await expect(heading.locator(".keep-case")).toHaveText("Trevor Hartman");
  await expect(heading.locator(".keep-case")).toHaveCSS("text-transform", "none");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("combobox").fill("Trevor");
  const result = page.getByRole("option", { name: /^About Trevor Hartman/ });
  await expect(result).toHaveCount(1);
  await expect(result.locator(".keep-case")).toHaveText("Trevor Hartman");
  await expect(result.locator(".keep-case")).toHaveCSS("text-transform", "none");
  await expect(result.locator(".keep-case")).toHaveCSS("display", "inline");
});

test("on-page writing is lowercase while acronyms and code retain their case", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("text-transform", "lowercase");
  const title = page.locator(".entry-title").filter({ hasText: "YAML was a bad idea" });
  await expect(title).toHaveCSS("text-transform", "lowercase");
  await expect(title.locator(".keep-case")).toHaveText(["YAML", "CI"]);
  await expect(title.locator(".keep-case").first()).toHaveCSS("text-transform", "none");
  await expect(page.locator(".year-note").first().locator(".keep-case")).toHaveCount(0);
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("combobox").fill("YAML");
  const result = page.getByRole("option");
  await expect(result).toHaveCount(1);
  await expect(result.locator(".keep-case")).toHaveText(["YAML", "CI"]);
  await expect(result.locator(".keep-case").first()).toHaveCSS("display", "inline");
  await expect(result.locator(".keep-case").last()).toHaveCSS("display", "inline");
  await page.goto("/compiled-queries-in-scala");
  await expect(page.locator(".prose pre code").first()).toHaveCSS("text-transform", "none");
});
