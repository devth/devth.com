import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const routes = [
  "/",
  "/about",
  "/overture",
  "/glossary",
  "/cosmos",
  "/iteration-and-play",
  "/compiled-queries-in-scala",
];

for (const route of routes) {
  test(`${route} is accessible and fits the viewport`, async ({ page }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(route);
    expect(response.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow).toBe(false);
    expect(errors).toEqual([]);
  });
}

test("archive header is minimal without a post count or lower divider", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".archive-count")).toHaveCount(0);
  await expect(page.locator(".section-heading")).toHaveCSS("border-bottom-width", "0px");
  await expect(page.locator(".site-header")).toHaveCSS("border-bottom-width", "1px");
  await expect(page.getByRole("searchbox", { name: "Filter writing" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Page hit counter" })).toBeVisible();
});

for (const route of ["/you-might-not-want-a-monorepo", "/about"]) {
  test(`${route} uses whitespace instead of full-width header dividers`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto(route);
    await expect(page.locator(".site-header")).toHaveCSS("border-bottom-width", "0px");
    await expect(page.locator(".article-header")).toHaveCSS("border-bottom-width", "0px");
    await page.screenshot({ path: testInfo.outputPath("reading-header.png") });
  });
}

test("archive filtering and keyboard shortcuts", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("/");
  const input = page.getByRole("searchbox", { name: "Filter writing" });
  await expect(input).toBeFocused();
  await input.fill("monorepo");
  await expect(page.getByRole("status")).toHaveText("1 post found.");
  await expect(page.getByRole("link", { name: /You might not want a Monorepo/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Iteration and Play/ })).toBeHidden();
  await input.fill("this-does-not-exist");
  await expect(page.getByText("No matching posts.")).toBeVisible();
  await input.press("Escape");
  await expect(page.getByRole("status")).toHaveText("17 posts found.");
  await expect(input).toHaveValue("");
  await expect(page.getByRole("link", { name: /Iteration and Play/ })).toBeVisible();
});

test("category links open a filtered archive", async ({ page }) => {
  await page.goto("/you-might-not-want-a-monorepo");
  const category = page.getByRole("link", { name: "infrastructure", exact: true });
  await expect(category).toBeVisible();
  await category.click();
  await expect(page).toHaveURL(/category=infrastructure#writing$/);
  await expect(
    page.getByRole("link", { name: /YAML was a bad idea for CI pipelines/ }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: /Iteration and Play/ })).toBeHidden();
  await page.getByRole("link", { name: "all posts", exact: true }).click();
  await expect(page.getByRole("link", { name: /Iteration and Play/ })).toBeVisible();
});

test("index navigation opens the actual article", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /Iteration and Play/ }).click();
  await expect(page).toHaveURL(/\/iteration-and-play$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Iteration and Play");
  await expect(page.getByRole("article")).toContainText(
    "The best form of software engineering is based on iteration and play.",
  );
});

test("content and navigation work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL + "/");
  await expect(page.getByRole("heading", { name: "devth", exact: true })).toBeVisible();
  await expect(page.getByRole("searchbox")).toBeHidden();
  await expect
    .poll(() =>
      page.getByRole("img", { name: "Page hit counter" }).evaluate((img) => img.naturalWidth),
    )
    .toBeGreaterThan(0);
  await page.getByRole("link", { name: /Iteration and Play/ }).click();
  await expect(page.getByRole("article")).toContainText("Engineers should be having fun.");
  await context.close();
});

test("legacy routes redirect permanently and preserve fragments", async ({ page, request }) => {
  const response = await request.get("/2015/thrush-cond-is-not-a-monad", { maxRedirects: 0 });
  expect(response.status()).toBe(301);
  expect(response.headers().location).toBe("/thrush-cond-is-not-a-monad");
  await page.goto("/2015/beautiful-constraint/#editor");
  await expect(page).toHaveURL(/\/beautiful-constraint#editor$/);
  await expect(page.getByRole("heading", { name: "$EDITOR" })).toBeInViewport();
});

test("unknown paths return a true 404 page", async ({ page }) => {
  const response = await page.goto("/there-is-no-such-page");
  expect(response.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("light and dark renderings", async ({ page }, testInfo) => {
  for (const colorScheme of ["light", "dark"]) {
    await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`home-${colorScheme}.png`), fullPage: true });
    await page.goto("/glossary");
    const accessibility = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`article-${colorScheme}.png`),
      fullPage: true,
    });
  }
});
