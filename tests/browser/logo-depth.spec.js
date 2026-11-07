import { test, expect } from "@playwright/test";

const depth = (page) => page.locator("canvas[data-logo-depth]");

test("solid wordmark floats before hover and keeps accumulating native growth without recycling", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    );
    Math.random = () => 0.37;
  });
  await page.clock.install();
  await page.goto("/");
  const canvas = depth(page);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-glyphs", "6");
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
  await page.clock.runFor(1000);
  const idle = await canvas.getAttribute("data-tilt");
  await page.clock.runFor(1000);
  expect(await canvas.getAttribute("data-tilt")).not.toBe(idle);
  const tilt = (await canvas.getAttribute("data-tilt")).split(",").map(Number);
  expect(Math.abs(tilt[0])).toBeGreaterThan(0.04);
  expect(Math.abs(tilt[1])).toBeGreaterThan(0.1);
  await page.screenshot({ path: info.outputPath("solid-idle.png") });
  const before = await page.locator(".brand-mark").boundingBox();
  await page.getByRole("link", { name: "devth home" }).hover();
  await page.clock.runFor(200);
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
  await page.clock.runFor(5000);
  const first = Number(await canvas.getAttribute("data-growth-curves"));
  expect(first).toBeGreaterThan(0);
  await page.clock.runFor(7000);
  expect(Number(await canvas.getAttribute("data-growth-curves"))).toBeGreaterThan(
    Math.max(first, 680),
  );
  expect(Number(await canvas.getAttribute("data-growth-tips"))).toBeLessThanOrEqual(24);
  expect(await page.locator(".brand-mark").boundingBox()).toEqual(before);
  await page.screenshot({ path: info.outputPath("solid-growing.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.clock.runFor(100);
  await page.screenshot({ path: info.outputPath("solid-dark.png") });
  await page.mouse.move(1, 1);
  await page.clock.runFor(900);
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-reveal", "0.0000");
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
  const paused = await canvas.getAttribute("data-tilt");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute("data-tilt", paused);
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await page.clock.runFor(250);
  expect(await canvas.getAttribute("data-tilt")).not.toBe(paused);
  await page.evaluate(() => scrollTo(0, 1200));
  await page.clock.runFor(150);
  await expect(canvas).toBeHidden();
  await page.evaluate(() => scrollTo(0, 0));
  await page.clock.runFor(150);
  await expect(canvas).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [name, media] of [
  ["reduced motion", { reducedMotion: "reduce" }],
  ["forced colors", { forcedColors: "active" }],
]) {
  test(`${name} keeps the native wordmark`, async ({ page }) => {
    await page.emulateMedia(media);
    await page.goto("/");
    await page.getByRole("link", { name: "devth home" }).focus();
    await expect(page.locator(".brand-mark")).toHaveCSS("opacity", "1");
    await expect(depth(page)).toHaveCount(0);
  });
}

test("restricted raster and missing WebGL retain the real accessible wordmark", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const context = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type.startsWith("webgl")) return null;
      return context.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "devth home" })).toBeVisible();
  await expect(page.locator(".brand-mark")).toHaveCSS("opacity", "1");
  await expect(depth(page)).toHaveCount(0);
});

test("keyboard focus and pointer hover retain their shared logo garden until both leave", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    ),
  );
  await page.clock.install();
  await page.goto("/");
  const canvas = depth(page),
    brand = page.getByRole("link", { name: "devth home" });
  await expect(canvas).toBeVisible();
  await brand.focus();
  await page.clock.runFor(1400);
  await brand.hover();
  await page.mouse.move(1, 1);
  await page.clock.runFor(300);
  expect(Number(await canvas.getAttribute("data-growth-curves"))).toBeGreaterThan(0);
  await brand.hover();
  await page.locator('.site-header nav a[href="/about"]').focus();
  await page.clock.runFor(300);
  expect(Number(await canvas.getAttribute("data-growth-curves"))).toBeGreaterThan(0);
  await page.mouse.move(1, 1);
  await page.clock.runFor(900);
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
  await brand.hover();
  await page.clock.runFor(1400);
  expect(Number(await canvas.getAttribute("data-growth-curves"))).toBeGreaterThan(0);
  await page.keyboard.press("Escape");
  await page.clock.runFor(50);
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
  await expect(canvas).toHaveAttribute("data-reveal", "0.0000");
});

test("solid wordmark remounts once after navigation and viewport changes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(depth(page)).toBeVisible();
  await page.locator('.site-header nav a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(depth(page)).toHaveCount(1);
  await expect(depth(page)).toBeVisible();
  await page.setViewportSize({ width: 820, height: 900 });
  await expect(depth(page)).toHaveCount(1);
  await expect(depth(page)).toBeVisible();
  await expect(page.getByRole("link", { name: "devth home" })).toHaveAttribute("href", "/");
  expect(errors).toEqual([]);
});
