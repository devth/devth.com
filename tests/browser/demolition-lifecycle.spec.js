import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const effect = (page) => page.getByRole("dialog", { name: "page collapse", exact: true });
const footer = (page) =>
  page.locator(".site-footer").getByRole("button", { name: "don't press this", exact: true });
const preferences = "devth:hover-preferences:v1";
async function openMenu(page) {
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(menu.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(23);
  return menu;
}

test("reduced motion leaves an instant accessible empty scene without loading 3D or overwriting page preferences", async ({
  page,
}) => {
  const assets = [];
  page.on("request", (request) => assets.push(request.url()));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  await page.addInitScript(
    (key) => localStorage.setItem(key, JSON.stringify({ structure: "lattice", generation: true })),
    preferences,
  );
  await page.goto("/?category=philosophy#writing");
  await expect(page.locator("[data-category-label]")).toHaveText("philosophy");
  const entries = await page.locator(".entry:visible").count();
  const stored = await page.evaluate((key) => localStorage.getItem(key), preferences);
  await footer(page).hover();
  expect(assets.some((url) => /\/assets\/(demolition-|three\.core-|cosmos-)/.test(url))).toBe(
    false,
  );
  await footer(page).click();
  await expect(effect(page).getByRole("status")).toHaveText("i told you");
  await expect(page.locator(".demolition-piece")).toHaveCount(0);
  expect(assets.some((url) => /\/assets\/(demolition-scene-|three\.core-)/.test(url))).toBe(false);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await page.clock.runFor(60_000);
  await expect(effect(page)).toBeVisible();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("main")).toBeVisible();
  await expect(page.locator(".demolition-dialog")).toBeHidden();
  await page.emulateMedia({ media: "screen", reducedMotion: "reduce" });
  await effect(page).getByRole("button", { name: "i told you", exact: true }).click();
  await expect(page.locator("[data-category-label]")).toHaveText("philosophy");
  await expect(page.locator(".entry:visible")).toHaveCount(entries);
  expect(await page.evaluate((key) => localStorage.getItem(key), preferences)).toBe(stored);
});

test("a motion override stops the live world at the final message without restoring automatically", async ({
  page,
}) => {
  await page.goto("/");
  await footer(page).click();
  await expect(effect(page)).toBeVisible();
  await expect.poll(() => page.locator(".demolition-piece").count()).toBeGreaterThan(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(effect(page).getByRole("status")).toHaveText("i told you");
  await expect(page.locator(".demolition-stage > *")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(effect(page)).toHaveCount(0);
  await expect(footer(page)).toBeFocused();
});

for (const level of ["controller", "physics"])
  test(`Escape cancels a cold ${level} import before it can replay a stale collapse`, async ({
    page,
  }) => {
    const pattern =
      level === "controller"
        ? /\/assets\/demolition-(?!scene-)[\w-]+\.js$/
        : /\/assets\/demolition-scene-[\w-]+\.js$/;
    let release, held;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(pattern, async (route) => {
      held = route.request().url();
      await gate;
      await route.continue();
    });
    await page.goto("/");
    await footer(page).click();
    await expect.poll(() => !!held).toBe(true);
    await expect(footer(page)).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(footer(page)).toBeEnabled();
    release();
    await page.evaluate(async (url) => {
      await import(url);
    }, held);
    await expect(effect(page)).toHaveCount(0);
    await footer(page).click();
    await expect(effect(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(effect(page)).toHaveCount(0);
  });

test("a missing effect bundle leaves the document usable with a bounded visible recovery message", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(/\/assets\/demolition-(?!scene-)[\w-]+\.js$/, (route) => route.abort());
  await page.goto("/");
  for (let attempt = 0; attempt < 3; attempt++) {
    await footer(page).click();
    await expect(
      page.getByText("collapse unavailable. reload to try again.", { exact: true }),
    ).toBeVisible();
    await expect(footer(page)).toBeEnabled();
    await expect(page.locator(".demolition-error")).toHaveCount(1);
  }
  await expect(effect(page)).toHaveCount(0);
  await expect(page.locator("main")).toBeVisible();
  await page.locator('.site-header nav a[href="/about"]').click();
  await expect(
    page.getByRole("heading", { name: "About Trevor Hartman", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("repeated collapses retain the filtered document, reading position and one original counter request", async ({
  page,
}) => {
  const counts = [],
    errors = [];
  page.on("request", (request) => {
    if (request.url().includes("/counter.svg") && request.method() === "GET")
      counts.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?category=philosophy#writing");
  await expect(page.locator("[data-category-label]")).toHaveText("philosophy");
  const entries = await page.locator(".entry:visible").count();
  await expect(page.getByRole("img", { name: "Page hit counter" })).toHaveJSProperty(
    "complete",
    true,
  );
  const initial = [...counts];
  await footer(page).scrollIntoViewIfNeeded();
  const y = await page.evaluate(() => scrollY);
  for (let repeat = 0; repeat < 5; repeat++) {
    await footer(page).click();
    await expect(effect(page)).toBeVisible();
    for (const key of ["Tab", "Shift+Tab"]) {
      await page.keyboard.press(key);
      await expect(effect(page)).toBeFocused();
    }
    await page.keyboard.press("Escape");
    await expect(effect(page)).toHaveCount(0);
    await expect(footer(page)).toBeFocused();
    await expect(page.locator("[data-category-label]")).toHaveText("philosophy");
    await expect(page.locator(".entry:visible")).toHaveCount(entries);
    expect(await page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
    await expect(page.locator(".demolition-piece,[id^=demolition-svg-]")).toHaveCount(0);
  }
  expect(counts).toEqual(initial);
  expect(errors).toEqual([]);
});

test("Back during demolition restores the shell before the router traverses history", async ({
  page,
}) => {
  await page.goto("/about");
  await page.locator('.site-header nav a[href="/"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/");
  await footer(page).evaluate((button) => {
    window.originalCollapseButton = button;
  });
  await footer(page).click();
  await expect(effect(page)).toBeVisible();
  await page.goBack();
  await expect(
    page.getByRole("heading", { name: "About Trevor Hartman", exact: true }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  await expect(effect(page)).toHaveCount(0);
  expect(await footer(page).evaluate((button) => button === window.originalCollapseButton)).toBe(
    true,
  );
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
});

test("a paused Cosmos keeps its actual WebGL canvas and seed through destruction and restoration", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cosmos?seed=123");
  const stage = page.locator("[data-cosmos-stage]");
  await expect(stage).toHaveAttribute("data-ready", "");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  await page.getByLabel(/Interactive 3D stellar neighborhood/).evaluate((canvas) => {
    window.originalCosmosCanvas = canvas;
  });
  const menu = await openMenu(page);
  await menu.getByRole("button", { name: "don't press this", exact: true }).click();
  await expect(effect(page)).toBeVisible();
  await expect(page.locator(".demolition-piece .cosmos-canvas canvas")).toHaveCount(1);
  expect(
    await page.locator(".demolition-piece .cosmos-canvas canvas").evaluate((canvas) => {
      const data = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      return data.some((value, index) => index % 4 === 3 && value > 0);
    }),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(menu).toBeVisible();
  await menu.getByRole("button", { name: "Close search", exact: true }).click();
  await expect(stage).toHaveAttribute("data-seed", "123");
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
  expect(
    await page
      .getByLabel(/Interactive 3D stellar neighborhood/)
      .evaluate((canvas) => canvas === window.originalCosmosCanvas),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test.describe("native fallback", () => {
  test.use({ javaScriptEnabled: false });
  test("does not expose a dead destruction control without JavaScript", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("[data-demolition-trigger]")).toHaveCount(2);
    for (const button of await page.locator("[data-demolition-trigger]").all())
      await expect(button).toBeHidden();
    await expect(page.locator('.site-footer a[href="/cosmos"]')).toBeVisible();
  });
});
