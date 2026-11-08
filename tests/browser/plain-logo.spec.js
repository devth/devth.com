import { test, expect } from "@playwright/test";

const art = (page) => page.locator(".link-sigil.is-visible, .sigil-rear.is-visible");
async function expectNative(page) {
  await expect(page.locator(".brand-mark")).toHaveCSS("opacity", "1");
  await expect(page.locator(".brand-mark")).toHaveCSS("transform", "none");
  await expect(page.locator("canvas[data-logo-depth]")).toHaveCount(0);
}

test("plain logo stays native on hover and focus, before and after other hover art loads", async ({
  page,
}, testInfo) => {
  const unwanted = [];
  page.on("request", (request) => {
    if (
      /(?:logo-depth|logo-geometry|growth-depth|logo-weave|three\.module)[^/]*\.js/.test(
        request.url(),
      )
    )
      unwanted.push(request.url());
  });
  await page.addInitScript(() =>
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    ),
  );
  await page.clock.install();
  await page.goto("/");
  const brand = page.getByRole("link", { name: "devth home" }),
    mark = page.locator(".brand-mark");
  const bounds = await mark.boundingBox();
  await brand.hover();
  await brand.focus();
  await page.clock.runFor(1800);
  await expectNative(page);
  await expect(art(page)).toHaveCount(0);
  expect(unwanted).toEqual([]);
  expect(await mark.boundingBox()).toEqual(bounds);

  const about = page.locator('.site-header nav a[href="/about"]');
  await about.focus();
  await about.hover();
  await expect(page.locator(".link-sigil.is-visible[data-generating]")).toBeVisible();
  await page.clock.runFor(1400);
  await brand.hover();
  await brand.focus();
  await page.clock.runFor(1000);
  await expect(art(page)).toHaveCount(0);
  await expectNative(page);
  expect(unwanted).toEqual([]);
  expect(await mark.boundingBox()).toEqual(bounds);
  await brand.evaluate((element) => element.blur());
  await page.mouse.move(1, 1);
  await page.screenshot({ path: testInfo.outputPath("plain-light.png") });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.screenshot({ path: testInfo.outputPath("plain-dark.png") });
});

test("plain logo remains an ordinary home link through navigation, resize and accessibility modes", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('.site-header nav a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  await expectNative(page);
  await page.getByRole("link", { name: "devth home" }).focus();
  await page.setViewportSize({ width: 480, height: 900 });
  await expectNative(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expectNative(page);
  await page.emulateMedia({ forcedColors: "active" });
  await expectNative(page);
  await page.getByRole("link", { name: "devth home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "devth", exact: true })).toBeVisible();
  await expectNative(page);
});
