import { test, expect } from "@playwright/test";

const effect = (page) => page.getByRole("dialog", { name: "page collapse", exact: true });
const trigger = (page) =>
  page.locator(".site-footer").getByRole("button", { name: "don't press this", exact: true });
async function ready(page) {
  await page.goto("/");
  await expect(trigger(page)).toBeVisible();
}
async function hold(page) {
  await page.keyboard.down("Shift");
  await page.mouse.wheel(0, 300);
}

test("Shift-scroll destroys while held and releasing Shift rapidly rebuilds even after complete disintegration", async ({
  page,
}) => {
  const counts = [],
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/counter.svg") && request.method() === "GET")
      counts.push(request.url());
  });
  await page.clock.install();
  await ready(page);
  await expect(page.getByRole("img", { name: "Page hit counter" })).toHaveJSProperty(
    "complete",
    true,
  );
  await page.evaluate(() => {
    window.originalMain = document.querySelector("main");
    window.originalCounter = document.querySelector(".hit-counter img");
    scrollTo({ top: 500, behavior: "instant" });
  });
  const y = await page.evaluate(() => scrollY);
  const before = [...counts];
  await hold(page);
  await expect(effect(page)).toHaveAttribute("data-momentary", "");
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.clock.runFor(1800);
  expect(await page.locator(".demolition-piece").count()).toBeGreaterThan(0);
  await page.keyboard.up("Shift");
  await expect(effect(page)).toHaveAttribute("data-phase", "reversing");
  await page.clock.runFor(400);
  await expect(effect(page)).toHaveCount(0);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(y, 0);
  // Start a fresh hold with the clock paused; the controller awaits one frame.
  await hold(page);
  await page.clock.runFor(100);
  await expect(effect(page)).toHaveAttribute("data-momentary", "");
  await page.clock.runFor(26_000);
  await expect(effect(page).getByRole("button", { name: "i told you", exact: true })).toBeVisible();
  await page.keyboard.up("Shift");
  await page.clock.runFor(400);
  await expect(effect(page)).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        window.originalMain === document.querySelector("main") &&
        window.originalCounter === document.querySelector(".hit-counter img"),
    ),
  ).toBe(true);
  expect(counts).toEqual(before);
  expect(errors).toEqual([]);
});

for (const level of ["controller", "physics"])
  test(`releasing Shift cancels a cold ${level} load instead of collapsing later`, async ({
    page,
  }) => {
    const pattern =
      level === "controller"
        ? /\/assets\/demolition-(?!scene-)[\w-]+\.js$/
        : /\/assets\/demolition-scene-[\w-]+\.js$/;
    let held, release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    await page.route(pattern, async (route) => {
      held = route.request().url();
      await gate;
      await route.continue();
    });
    await ready(page);
    await hold(page);
    await expect.poll(() => !!held).toBe(true);
    await page.keyboard.up("Shift");
    await expect(trigger(page)).toBeEnabled();
    release();
    await page.evaluate(async (url) => {
      await import(url);
    }, held);
    await expect(effect(page)).toHaveCount(0);
    await expect(page.locator("main")).toBeVisible();
  });

test("Shift-scroll up unwinds a hold and scrolling down can start again without releasing Shift", async ({
  page,
}) => {
  await page.clock.install();
  await ready(page);
  await page.keyboard.down("Shift");
  await page.evaluate(() => {
    window.reverseWheelPrevented = new Promise((resolve) =>
      window.addEventListener("wheel", (event) => resolve(event.defaultPrevented), { once: true }),
    );
  });
  await page.mouse.wheel(0, -300);
  expect(await page.evaluate(() => window.reverseWheelPrevented)).toBe(false);
  await expect(effect(page)).toHaveCount(0);
  await page.mouse.wheel(0, 300);
  await expect(effect(page)).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.clock.runFor(1800);
  await page.mouse.wheel(0, -300);
  await expect(effect(page)).toHaveAttribute("data-phase", "reversing");
  await page.clock.runFor(400);
  await expect(effect(page)).toHaveCount(0);
  await page.mouse.wheel(0, 300);
  await page.clock.runFor(100);
  await expect(effect(page)).toHaveAttribute("data-phase", "falling");
  await page.keyboard.up("Shift");
  await page.clock.runFor(400);
  await expect(effect(page)).toHaveCount(0);
});

test("Shift release does not dismiss a button-triggered collapse", async ({ page }) => {
  await page.clock.install();
  await ready(page);
  await trigger(page).click();
  await expect(effect(page)).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.clock.runFor(1800);
  await hold(page);
  await page.mouse.wheel(0, -300);
  await page.keyboard.up("Shift");
  await page.clock.runFor(400);
  await expect(effect(page)).toHaveAttribute("data-phase", "falling");
  await expect(effect(page)).not.toHaveAttribute("data-momentary");
  await page.keyboard.press("Escape");
  await page.clock.runFor(13_000);
  await expect(effect(page)).toHaveCount(0);
});

test("ordinary wheel, Shift alone, text editing and open search remain native", async ({
  page,
}) => {
  await ready(page);
  await page.mouse.wheel(0, 100);
  await expect(effect(page)).toHaveCount(0);
  await page.keyboard.down("Shift");
  await expect(effect(page)).toHaveCount(0);
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.setAttribute("aria-label", "Gesture test editor");
    document.body.append(input);
    input.focus();
  });
  await page.mouse.wheel(0, 100);
  await expect(effect(page)).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Gesture test editor" })
    .evaluate((input) => input.remove());
  await page.keyboard.up("Shift");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await hold(page);
  await expect(effect(page)).toHaveCount(0);
  await expect(page.getByRole("dialog", { name: "Search", exact: true })).toBeVisible();
  await page.keyboard.up("Shift");
});

test("reduced motion uses a non-moving hold and returns instantly on Shift release", async ({
  page,
}) => {
  const requests = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page);
  await hold(page);
  await expect(effect(page).getByRole("button", { name: "i told you", exact: true })).toBeVisible();
  await expect(page.locator(".demolition-piece")).toHaveCount(0);
  expect(requests.some((url) => /\/assets\/demolition-scene-/.test(url))).toBe(false);
  await page.keyboard.up("Shift");
  await expect(effect(page)).toHaveCount(0);
});

test("losing window focus releases a hold rather than leaving the page destroyed", async ({
  page,
}) => {
  await page.clock.install();
  await ready(page);
  await hold(page);
  await expect(effect(page)).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.clock.runFor(1000);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.clock.runFor(400);
  await expect(effect(page)).toHaveCount(0);
  await page.keyboard.up("Shift");
});
