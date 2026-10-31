import { test, expect } from "@playwright/test";

// These cases exercise the unchanged, non-generative comparison studies.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("devth:hover-preferences:v1", JSON.stringify({ generation: false })),
  );
});

test("numbered studies render distinct structures and animate only the requested preview", async ({
  page,
}) => {
  await page.goto("/hover-lab");
  await expect(page.getByRole("heading", { name: "Hover Lab", exact: true })).toBeVisible();
  const samples = page.locator("[data-hover-study]");
  await expect(samples).toHaveCount(15);
  const paths = await samples.evaluateAll((items) =>
    items.map((item) => item.querySelector("svg").innerHTML),
  );
  expect(new Set(paths).size).toBe(15);
  const first = samples.first();
  const button = first.getByRole("button");
  await expect(button).toBeEnabled();
  const before = await first.locator("path").first().getAttribute("d");
  const box = await button.boundingBox();
  await button.hover();
  await expect(first).toHaveAttribute("data-running", "true");
  await expect.poll(() => first.locator("path").first().getAttribute("d")).not.toBe(before);
  expect(await button.boundingBox()).toEqual(box);
  await page.mouse.move(1, 1);
  await expect(first).toHaveAttribute("data-running", "false");
  await button.focus();
  await expect(first).toHaveAttribute("data-running", "true");
  await page.keyboard.press("Tab");
  await expect(first).toHaveAttribute("data-running", "false");
  await expect(page.locator(".link-sigil")).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test("Compare all, offscreen cleanup and reduced motion control the studies", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto("/hover-lab");
  const compare = page.getByRole("button", { name: "Compare all", exact: true });
  await expect(compare).toBeEnabled();
  await expect(compare).toHaveCSS("text-transform", "lowercase");
  await compare.click();
  await expect(page.getByRole("button", { name: "Stop comparison", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect
    .poll(() => page.locator('[data-hover-study][data-running="true"]').count())
    .toBeGreaterThan(1);
  await page.setViewportSize({ width: 1440, height: 420 });
  await page.locator(".site-footer").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-hover-study]").first()).toHaveAttribute("data-running", "false");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-hover-study][data-running="true"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Compare all", exact: true })).toBeDisabled();
  await expect(page.getByRole("status", { name: "Motion status" })).toContainText("Reduced motion");
});

test("touch taps hold and stop a study", async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    hasTouch: true,
    viewport: { width: 393, height: 852 },
  });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + "/hover-lab");
    const first = page.locator("[data-hover-study]").first();
    const button = first.getByRole("button");
    await expect(button).toBeEnabled();
    await button.tap();
    await expect(first).toHaveAttribute("data-running", "true");
    await button.tap();
    await expect(first).toHaveAttribute("data-running", "false");
  } finally {
    await context.close();
  }
});

test("static board remains readable without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto(baseURL + "/hover-lab");
    expect(response.status()).toBe(200);
    await expect(page.locator("[data-hover-study]")).toHaveCount(15);
    await expect(page.locator("[data-hover-study] path[d]")).toHaveCount(45);
    await expect(page.getByRole("button", { name: "Compare all", exact: true })).toBeHidden();
    await expect(page.locator("[data-hover-study] button:disabled")).toHaveCount(15);
    await expect(page.locator("main")).toContainText("JavaScript");
  } finally {
    await context.close();
  }
});
