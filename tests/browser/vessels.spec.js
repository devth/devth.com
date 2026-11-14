import { test, expect } from "@playwright/test";

const figure = (page, kind) => page.locator(`[data-vx-figure="${kind}"]`);

test("vessels figures are live, keyboard-operable and error-free", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/vessels");
  await expect(page.getByRole("heading", { level: 1, name: "Vessels" })).toBeVisible();
  await expect(page.locator("[data-vx-controls]:visible")).toHaveCount(8);

  const curve = figure(page, "curve");
  await curve.scrollIntoViewIfNeeded();
  const slider = curve.getByRole("slider");
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  await expect(curve.locator("[data-vx-readout]")).toContainText("At 41 mmHg");
  await expect(slider).toHaveAttribute("aria-valuetext", "41 mmHg");
  await curve.getByRole("button", { name: "working muscle" }).click();
  await expect(curve.locator("[data-vx-readout]")).toContainText("At 20 mmHg, hemoglobin is 32%");
  await curve.getByRole("checkbox").check();
  await expect(curve.locator("[data-vx-readout]")).toContainText("shifted curve");

  const circuit = figure(page, "circuit");
  await circuit.scrollIntoViewIfNeeded();
  await circuit.getByText("arterioles", { exact: true }).first().click();
  await expect(circuit.locator("[data-vx-readout]")).toContainText("arterioles");
  await expect(circuit.locator(".vx-row.is-selected")).toHaveAttribute(
    "data-vx-level",
    "arterioles",
  );
  const lane = circuit.locator("[data-vx-motion]");
  const before = await lane.innerHTML();
  await expect.poll(() => lane.innerHTML()).not.toBe(before);

  const content = figure(page, "content");
  await content.scrollIntoViewIfNeeded();
  await content.getByRole("button", { name: /anemia/ }).click();
  await expect(content.locator("[data-vx-readout]")).toContainText(
    "pulse oximeter would read the same",
  );

  const viscosity = figure(page, "viscosity");
  await viscosity.scrollIntoViewIfNeeded();
  await viscosity.getByRole("button", { name: /capillary/ }).click();
  await expect(viscosity.locator("[data-vx-readout]")).toContainText("keeps rising");

  const guards = figure(page, "guards");
  await guards.scrollIntoViewIfNeeded();
  await expect(guards.getByRole("button", { name: "pause" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const time = guards.getByRole("slider");
  await expect
    .poll(() => time.getAttribute("aria-valuetext"))
    .not.toBe(await time.getAttribute("aria-valuetext"));
  await expect(guards.locator("svg")).toHaveAttribute("aria-label", /stage: (?!intact)/, {
    timeout: 6000,
  });
  await guards.getByRole("button", { name: "fibrin" }).click();
  await expect(guards.getByRole("button", { name: "play" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect(guards.locator("[data-vx-readout]")).toContainText("coagulation");
  expect(errors).toEqual([]);
});

test("reduced motion shows settled, paused figures", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vessels");
  const tube = figure(page, "tube");
  await tube.scrollIntoViewIfNeeded();
  await expect(tube.locator("svg")).not.toContainText("settling");
  const guards = figure(page, "guards");
  await guards.scrollIntoViewIfNeeded();
  await expect(guards.locator("[data-vx-play]")).toHaveAttribute("aria-pressed", "false");
  const circuit = figure(page, "circuit");
  const lane = circuit.locator("[data-vx-motion]");
  const before = await lane.innerHTML();
  await page.waitForTimeout(400);
  expect(await lane.innerHTML()).toBe(before);
});

test("without JavaScript the prose and static figures remain", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto("/vessels");
  await expect(page.locator("[data-vx-plot] svg")).toHaveCount(8);
  await expect(page.locator("[data-vx-controls]:visible")).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "What hematocrit measures" })).toBeVisible();
  await context.close();
});

test("the footer link mounts and disposes the explainer during in-site navigation", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.locator('.site-footer a[href="/vessels"]').click();
  await expect(page).toHaveURL(/\/vessels$/);
  await expect(page.locator("[data-vx-controls]:visible")).toHaveCount(8);
  await page.locator('.site-header nav a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
  await page.goBack();
  await expect(page.locator("[data-vx-controls]:visible")).toHaveCount(8);
  expect(errors).toEqual([]);
});
