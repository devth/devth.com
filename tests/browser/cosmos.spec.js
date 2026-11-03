import { test, expect } from "@playwright/test";

test("real stars support keyboard, orbit, new viewpoints, recenter and pause", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cosmos?seed=123");
  const stage = page.locator("[data-cosmos-stage]");
  await expect(stage).toHaveAttribute("data-ready", "");
  await expect(stage).toHaveAttribute("data-seed", "123");
  const pause = page.getByRole("button", { name: "Resume", exact: true });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  const canvas = page.getByLabel(/Interactive 3D stellar neighborhood/);
  await page.getByLabel("Reference star").selectOption({ label: "Sirius" });
  await expect(page.locator("[data-cosmos-distance]")).toHaveText("8.60 light-years from Earth");
  await expect(stage).toHaveAttribute("data-stars", "4060");
  const readout = page.locator("[data-cosmos-readout]");
  await expect(readout).toContainText("ly from origin");
  const initialView = await readout.textContent();
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(readout).not.toHaveText(initialView);
  const beforeOrbit = await readout.textContent();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 25, { steps: 8 });
  await page.mouse.up();
  await expect(readout).not.toHaveText(beforeOrbit);
  await page.getByRole("button", { name: "Recenter" }).click();
  await expect(readout).toHaveText(initialView);
  await page.getByRole("button", { name: "New viewpoint" }).click();
  await expect(stage).not.toHaveAttribute("data-seed", "123");
  await expect(page).toHaveURL(/seed=\d+/);
  await expect(page.getByRole("status")).toContainText("4,060 catalogued stars");
  await expect(page.locator("[data-cosmos-distance]")).toHaveText("8.60 light-years from Earth");
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByRole("button", { name: "Resume", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("cosmos.png"), fullPage: true });
});

test("cosmos fills the viewport without a frame and resizes with it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cosmos?seed=123");
  const stage = page.locator("[data-cosmos-stage]");
  await expect(stage).toHaveAttribute("data-ready", "");
  await expect(stage).toHaveCSS("position", "fixed");
  await expect(stage).toHaveCSS("border-top-width", "0px");
  for (const viewport of [page.viewportSize(), { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await expect
      .poll(() => stage.boundingBox())
      .toEqual({
        x: 0,
        y: 0,
        width: viewport.width,
        height: viewport.height,
      });
    await expect(page.getByRole("button", { name: "New viewpoint" })).toBeInViewport();
    await expect(page.getByRole("link", { name: "devth home" })).toBeInViewport();
  }
});

test("cosmos remains a viewable page without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL + "/cosmos");
  await expect(page.getByRole("heading", { name: "Cosmos", exact: true })).toBeVisible();
  await expect(page.locator(".cosmos-fallback")).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeHidden();
  await page.getByText("Reference distances", { exact: true }).click();
  await expect(page.locator(".cosmos-reference-list")).toContainText("Proxima Centauri");
  await expect(page.locator(".cosmos-reference-list")).toContainText("4.23 ly");
  await context.close();
});

test("cosmos stays dark when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  await page.goto("/cosmos");
  await expect(page.getByRole("status")).toHaveText(
    "WebGL unavailable. Reference distances remain available.",
  );
  await expect(page.locator(".cosmos-fallback")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "devth home" })).toBeVisible();
});

test("catalog failure keeps usable reference distances and navigation", async ({ page }) => {
  await page.route("**/data/nearby-stars.json", (route) => route.abort());
  await page.goto("/cosmos");
  await expect(page.getByRole("status")).toHaveText(
    "Star catalog unavailable. Reference distances remain available.",
  );
  await page.getByLabel("Reference star").selectOption({ label: "Sirius" });
  await expect(page.locator("[data-cosmos-distance]")).toHaveText("8.60 light-years from Earth");
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
});

test("leaving while catalog loads cannot mount a detached star renderer", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let started = false;
  await page.route("**/data/nearby-stars.json", async (route) => {
    started = true;
    await gate;
    await route.continue().catch(() => {});
  });
  await page.goto("/cosmos");
  await expect.poll(() => started).toBe(true);
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  release();
  await expect(page.locator("[data-cosmos-stage]")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
});

test("link sigils randomize without moving text and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const about = page.getByRole("link", { name: "about", exact: true });
  const before = await about.boundingBox();
  await about.hover();
  const sigil = page.locator(".link-sigil:not([data-retiring])");
  await expect(sigil).toBeVisible();
  expect(await about.boundingBox()).toEqual(before);
  const key = await sigil.getAttribute("data-sigil-key");
  await expect(page.locator(`svg[data-sigil-key="${key}"] path`)).toHaveCount(6);
  const first = await sigil.getAttribute("data-structure");
  await page.getByRole("link", { name: "overture", exact: true }).hover();
  await expect(sigil).not.toHaveAttribute("data-structure", first);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await about.hover();
  await expect(sigil).toBeHidden();
});
