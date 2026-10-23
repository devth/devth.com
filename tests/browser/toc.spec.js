import { test, expect } from "@playwright/test";

test("contents rail follows headings and fills with scroll", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/beautiful-constraint");
  const toc = page.getByRole("navigation", { name: "on this page", exact: true });
  await expect(toc).toBeVisible();
  await expect(page.getByText("on this page", { exact: true })).toHaveCount(0);
  await expect(toc.locator(".toc-track")).toHaveAttribute("d", /L/);
  const editor = toc.getByRole("link", { name: "$EDITOR", exact: true });
  await editor.click();
  await expect(page).toHaveURL(/#editor$/);
  await expect(page.getByRole("heading", { name: "$EDITOR", exact: true })).toBeInViewport();
  await expect(editor).toHaveAttribute("aria-current", "location");
  await page.screenshot({ path: testInfo.outputPath("contents-rail.png") });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(toc.locator(".toc-progress")).toHaveCSS("stroke-dashoffset", "0px");
  await expect(toc.getByRole("link", { name: "Further exploration", exact: true })).toHaveAttribute(
    "aria-current",
    "location",
  );
});

test("flat contents show the active rail before the first section", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce", colorScheme: "dark" });
  await page.goto("/thrush-cond-is-not-a-monad");
  const toc = page.getByRole("navigation", { name: "on this page", exact: true });
  await expect(toc.locator(".toc-track")).toHaveAttribute("d", /L/);
  await expect
    .poll(() =>
      toc
        .locator(".toc-progress")
        .evaluate((node) => Number.parseFloat(getComputedStyle(node).strokeDashoffset)),
    )
    .toBeLessThan(0.95);
  await expect(toc.getByRole("link", { name: "Functor", exact: true })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(
    page.getByRole("link", { name: "common algebraic structures", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://grokipedia.com/page/Outline_of_algebraic_structures#overview-and-study-of-algebraic-structures",
  );
  await page.screenshot({ path: testInfo.outputPath("flat-contents-rail.png") });
});

test("contents links work without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL + "/beautiful-constraint");
  const toc = page.getByRole("navigation", { name: "on this page", exact: true });
  await expect(toc).toBeVisible();
  await toc.getByRole("link", { name: "$EDITOR", exact: true }).click();
  await expect(page).toHaveURL(/#editor$/);
  await expect(page.getByRole("heading", { name: "$EDITOR", exact: true })).toBeInViewport();
  await context.close();
});
