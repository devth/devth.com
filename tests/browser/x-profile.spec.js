import { test, expect } from "@playwright/test";

test("About offers a direct X profile link with no embed or third-party requests", async ({
  page,
}) => {
  const requests = [];
  await page.route(/https:\/\/(?:[^/]*\.)?(?:twitter\.com|x\.com|twimg\.com)\//, async (route) => {
    requests.push(route.request().url());
    await route.abort();
  });
  await page.goto("/about");
  await expect(
    page.locator(".x-profile").getByRole("link", { name: "@devth on X ↗", exact: true }),
  ).toHaveAttribute("href", "https://x.com/devth");
  await expect(page.locator(".x-profile")).toBeVisible();
  const profile = await page.locator(".x-profile").boundingBox();
  const prose = await page.locator(".prose").boundingBox();
  expect(profile.x).toBeCloseTo(prose.x, 0);
  expect(profile.width).toBeCloseTo(prose.width, 0);
  await expect(page.locator("[data-x-timeline], iframe, script[src*=twitter]")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Load @devth timeline" })).toHaveCount(0);
  expect(requests).toEqual([]);
  await page.goto("/beautiful-constraint");
  await expect(page.locator(".x-profile")).toHaveCount(0);
  expect(requests).toEqual([]);
});

test("the About profile link works without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + "/about");
    await expect(page.locator(".x-profile a")).toBeVisible();
    await expect(page.locator(".x-profile a")).toHaveAttribute("href", "https://x.com/devth");
    await expect(page.locator("[data-x-timeline], iframe")).toHaveCount(0);
  } finally {
    await context.close();
  }
});
