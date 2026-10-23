import { test, expect } from "@playwright/test";

test("sculpture supports keyboard, orbit, shuffle, recenter and pause", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cosmos?seed=123");
  const stage = page.locator("[data-cosmos-stage]");
  await expect(stage).toHaveAttribute("data-ready", "");
  await expect(stage).toHaveAttribute("data-seed", "123");
  const pause = page.getByRole("button", { name: "Resume drift" });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  const canvas = page.getByLabel(/Interactive 3D ribbon/);
  const readout = page.locator("[data-cosmos-readout]");
  await expect(readout).toContainText("Y 0.60");
  await canvas.focus();
  await page.keyboard.press("ArrowRight");
  await expect(readout).toContainText("Y 0.75");
  const beforeOrbit = await readout.textContent();
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 65, box.y + box.height / 2 + 25, { steps: 8 });
  await page.mouse.up();
  await expect(readout).not.toHaveText(beforeOrbit);
  await page.getByRole("button", { name: "Recenter" }).click();
  await expect(readout).toContainText("Y 0.60");
  await page.getByRole("button", { name: "New universe" }).click();
  await expect(stage).not.toHaveAttribute("data-seed", "123");
  await expect(page).toHaveURL(/seed=\d+/);
  await expect(page.getByRole("status")).toContainText("No two nothings alike.");
  await page.getByRole("button", { name: "Resume drift" }).click();
  await expect(page.getByRole("button", { name: "Pause drift" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.getByRole("button", { name: "Pause drift" }).click();
  await expect(page.getByRole("button", { name: "Resume drift" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("cosmos.png"), fullPage: true });
});

test("cosmos remains a viewable page without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(baseURL + "/cosmos");
  await expect(page.getByRole("heading", { name: /A knot in/ })).toBeVisible();
  await expect(
    page.getByRole("img", { name: "A tangled ribbon drifting among stars" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause drift" })).toBeHidden();
  await context.close();
});

test("cosmos shows a still sculpture when WebGL is unavailable", async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
    };
  });
  await page.goto("/cosmos");
  await expect(page.getByRole("status")).toHaveText(
    "WebGL unavailable. A still universe is shown instead.",
  );
  await expect(
    page.getByRole("img", { name: "A tangled ribbon drifting among stars" }),
  ).toBeVisible();
});

test("link sigils randomize without moving text and respect reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const about = page.getByRole("link", { name: "About", exact: true });
  const before = await about.boundingBox();
  await about.hover();
  const sigil = page.locator(".link-sigil");
  await expect(sigil).toBeVisible();
  expect(await about.boundingBox()).toEqual(before);
  await expect(sigil.locator("circle")).toHaveCount(5);
  const first = await sigil.locator("path").getAttribute("d");
  await page.getByRole("link", { name: "Overture", exact: true }).hover();
  await expect(sigil.locator("path")).not.toHaveAttribute("d", first);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await about.hover();
  await expect(sigil).toBeHidden();
});
