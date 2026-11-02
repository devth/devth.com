import { test, expect } from "@playwright/test";

for (const pathname of ["/", "/about"]) {
  test(`growth weaves around actual logo and title glyphs on ${pathname}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "devth:hover-preferences:v1",
        JSON.stringify({ structure: "tendril", generation: true }),
      );
      Math.random = () => 0.37;
    });
    await page.clock.install({ time: new Date("2026-11-01T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-01T12:00:01Z"));
    await page.goto(pathname);
    const brand = page.locator(".site-header .brand");
    const heading = page.locator("h1").first();
    const before = await heading.boundingBox();
    await brand.hover();
    const front = page.locator(".link-sigil:not([data-retiring])");
    await expect(front).toBeVisible();
    const key = await front.getAttribute("data-sigil-key");
    const rear = page.locator(`.sigil-rear[data-sigil-key="${key}"]`);
    await expect(rear).toBeVisible();
    await page.clock.runFor(10000);
    const both = page.locator(`svg[data-sigil-key="${key}"]`);
    await expect(both).toHaveCount(2);
    await expect(both.locator("path")).toHaveCount(6);
    expect(
      await rear
        .locator("path")
        .evaluateAll((paths) => paths.some((path) => (path.getAttribute("d") || "").length > 100)),
    ).toBe(true);
    expect(
      await front
        .locator("path")
        .evaluateAll((paths) => paths.some((path) => (path.getAttribute("d") || "").length > 100)),
    ).toBe(true);
    await expect(front).toHaveCSS("z-index", "4");
    await expect(rear).toHaveCSS("z-index", "-1");
    for (const layer of [front, rear]) {
      await expect(layer).toHaveCSS("pointer-events", "none");
      await expect(layer).toHaveAttribute("aria-hidden", "true");
    }
    expect(await heading.boundingBox()).toEqual(before);
    expect(await rear.getAttribute("viewBox")).toBe(await front.getAttribute("viewBox"));
    expect(await rear.locator("g").first().getAttribute("transform")).toBe(
      await front.locator("g").first().getAttribute("transform"),
    );
    await page.screenshot({ path: testInfo.outputPath("weave-light.png") });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: testInfo.outputPath("weave-dark.png") });
    await page.mouse.move(1, 1);
    await page.clock.runFor(400);
    await expect(front).toBeVisible();
    await expect(rear).toBeVisible();
    await page.clock.runFor(450);
    await expect(front).toBeHidden();
    await expect(rear).toBeHidden();
    await expect(both).toHaveCount(2);
    await brand.hover();
    await expect(page.locator(".sigil-rear:not([data-retiring])")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sigil-rear:visible")).toHaveCount(0);
  });
}
