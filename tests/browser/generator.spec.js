import { test, expect } from "@playwright/test";

async function freezeClock(page) {
  await page.clock.install({ time: new Date("2026-10-30T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-30T12:00:01Z"));
}

async function gardenSize(group) {
  return group.evaluate((element) => {
    const box = element.getBBox();
    return { width: box.width, height: box.height };
  });
}

test("generator grows from a label into a screen-sized garden and pauses on leave", async ({
  page,
}) => {
  await freezeClock(page);
  await page.goto("/hover-lab");
  const toggle = page.getByRole("switch", { name: "Generator mode", exact: true });
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();
  const first = page.locator("[data-hover-study]").first();
  await first.locator("figcaption label").hover();
  await expect(first).toHaveAttribute("data-running", "true");
  await page.clock.runFor(300);
  const group = page.locator('[data-growth-study="sigil"]');
  await expect(group).toBeVisible();
  const seed = await gardenSize(group);
  const branches = group.locator("[data-growth-branches] path");
  const earlyDetail = (
    await branches.evaluateAll((paths) => paths.map((p) => p.getAttribute("d")).join(""))
  ).length;
  await page.clock.runFor(5500);
  const grown = await gardenSize(group);
  expect(grown.width).toBeGreaterThan(seed.width * 3);
  expect(Math.max(grown.width, grown.height)).toBeGreaterThan(page.viewportSize().width);
  expect(
    (await branches.evaluateAll((paths) => paths.map((p) => p.getAttribute("d")).join(""))).length,
  ).toBeGreaterThan(earlyDetail);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.mouse.move(1, 1);
  await expect(first).toHaveAttribute("data-running", "false");
  const paused = await branches.first().getAttribute("d");
  await page.clock.runFor(1000);
  await expect(branches.first()).toHaveAttribute("d", paused);
  await first.locator("figcaption label").hover();
  await page.clock.runFor(300);
  expect(await branches.first().getAttribute("d")).not.toBe(paused);
  await page.keyboard.press("Escape");
  await expect(page.locator("[data-growth-study]")).toHaveCount(0);
  await expect(first).toHaveAttribute("data-grown", "false");
  await expect(page.getByRole("button", { name: "Clear growth", exact: true })).toBeHidden();
});

test("generator applies to every study and its overlay cannot capture controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 2600 });
  await freezeClock(page);
  await page.goto("/hover-lab");
  await page.getByRole("switch", { name: "Generator mode", exact: true }).click();
  await page.getByRole("button", { name: "Compare all", exact: true }).click();
  await page.clock.runFor(500);
  await expect(page.locator("[data-growth-study]")).toHaveCount(15);
  await expect(page.locator("[data-growth-layer]")).toHaveCSS("pointer-events", "none");
  expect(await page.locator("[data-growth-layer] path").count()).toBeLessThanOrEqual(90);
  await page.getByRole("button", { name: "Clear growth", exact: true }).click();
  await expect(page.locator("[data-growth-study]")).toHaveCount(0);
  await page.getByRole("switch", { name: "Generator mode", exact: true }).click();
  await expect(page.getByRole("switch", { name: "Generator mode", exact: true })).toHaveAttribute(
    "aria-checked",
    "false",
  );
});

test("reduced motion suppresses generator growth and preserves static studies", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/hover-lab");
  await expect(page.getByRole("switch", { name: "Generator mode", exact: true })).toBeDisabled();
  await expect(page.locator("[data-hover-study]")).toHaveCount(15);
  await expect(page.locator("[data-growth-study]")).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Motion status" })).toContainText("Reduced motion");
});
