import { test, expect } from "@playwright/test";

const widgetScript = "https://platform.twitter.com/widgets.js";

test("About makes no X requests before consent and keeps the embed off other pages", async ({
  page,
}) => {
  const external = [];
  await page.route(/https:\/\/(?:[^/]*\.)?(?:twitter\.com|x\.com|twimg\.com)\//, async (route) => {
    external.push(route.request().url());
    await route.abort();
  });
  await page.goto("/about");
  const region = page.getByRole("region", { name: "X posts" });
  await expect(region.getByRole("button", { name: "Load @devth timeline" })).toBeVisible();
  await expect(region.getByRole("link", { name: "@devth on X" })).toHaveAttribute(
    "href",
    "https://x.com/devth",
  );
  await expect(region.getByText("Loads content from X only when you choose to.")).toBeVisible();
  expect(external).toEqual([]);
  await expect(region.locator("iframe")).toHaveCount(0);
  await page.goto("/beautiful-constraint");
  await expect(page.getByRole("region", { name: "X posts" })).toHaveCount(0);
  expect(external).toEqual([]);
});

test("the official timeline API is loaded only on activation and fits the page", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: "dark" });
  let scriptRequests = 0;
  await page.route(widgetScript, async (route) => {
    scriptRequests++;
    await route.fulfill({
      contentType: "application/javascript",
      body: `
      window.twttr = { widgets: { createTimeline: async (source, target, options) => {
        window.timelineOptions = { source, options };
        const frame = document.createElement('iframe');
        frame.title = 'X timeline';
        frame.style.cssText = 'width:100%;height:300px;border:0';
        frame.srcdoc = '<body style="background:#151515;color:#eee;font:18px sans-serif"><p>@devth</p><p>Timeline loaded</p></body>';
        target.append(frame);
        return frame;
      } } };
    `,
    });
  });
  await page.goto("/about");
  expect(scriptRequests).toBe(0);
  const region = page.getByRole("region", { name: "X posts" });
  const button = region.getByRole("button", { name: "Load @devth timeline" });
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(region.locator('iframe[title="X timeline"]')).toBeVisible();
  await expect(region.getByRole("status")).toHaveText("Timeline loaded.");
  expect(scriptRequests).toBe(1);
  expect(await page.evaluate(() => window.timelineOptions)).toEqual({
    source: { sourceType: "profile", screenName: "devth" },
    options: { dnt: true, theme: "dark", height: 600 },
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await region.screenshot({ path: testInfo.outputPath("x-timeline-dark.png") });
});

test("blocked X widgets leave an accessible failure state and profile link", async ({ page }) => {
  await page.route(widgetScript, (route) => route.abort());
  await page.goto("/about");
  const region = page.getByRole("region", { name: "X posts" });
  await region.getByRole("button", { name: "Load @devth timeline" }).click();
  await expect(region.getByRole("status")).toHaveText(
    "Timeline unavailable. You can view @devth on X.",
  );
  await expect(region.getByRole("link", { name: "@devth on X" })).toBeVisible();
});

test("an unresponsive widget times out without showing a late detached embed", async ({ page }) => {
  await page.clock.install();
  await page.route(widgetScript, (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: `window.twttr = { widgets: { createTimeline: (_source, target) => new Promise(resolve => {
      window.finishTimeline = () => {
        const frame = document.createElement('iframe');
        frame.title = 'Late timeline';
        target.append(frame);
        resolve(frame);
      };
    }) } };`,
    }),
  );
  await page.goto("/about");
  const region = page.getByRole("region", { name: "X posts" });
  await region.getByRole("button", { name: "Load @devth timeline" }).click();
  await expect.poll(() => page.evaluate(() => typeof window.finishTimeline)).toBe("function");
  await page.clock.fastForward(15_001);
  await expect(region.getByRole("status")).toHaveText(
    "Timeline unavailable. You can view @devth on X.",
  );
  await page.evaluate(() => window.finishTimeline());
  await expect(region.locator("iframe")).toHaveCount(0);
  await expect(region.getByRole("button", { name: "Load @devth timeline" })).toBeEnabled();
});

test("without JavaScript About still has a profile link and no inert load button", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    await page.goto(baseURL + "/about");
    const region = page.getByRole("region", { name: "X posts" });
    await expect(region.getByRole("link", { name: "@devth on X" })).toBeVisible();
    await expect(region.getByRole("button", { name: "Load @devth timeline" })).toBeHidden();
  } finally {
    await context.close();
  }
});
