import { test, expect } from "@playwright/test";
import { studies } from "../../src/hover-studies.js";

for (const { id } of studies) {
  test(`${id} generates its own bounded drawing without replacing the source geometry`, async ({
    page,
  }) => {
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      (id) =>
        localStorage.setItem(
          "devth:hover-preferences:v1",
          JSON.stringify({ structure: id, generation: true }),
        ),
      id,
    );
    await page.clock.install({ time: new Date("2026-10-31T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-10-31T12:00:01Z"));
    await page.goto("/");
    await page.locator('.site-header a[href="/about"]').hover();
    const sigil = page.locator(".link-sigil:not([data-retiring])");
    await expect(sigil).toBeVisible();
    await expect(sigil).toHaveAttribute("data-structure", id);
    const key = await sigil.getAttribute("data-sigil-key");
    const surfaces = page.locator(`svg[data-sigil-key="${key}"]`);
    await expect(surfaces.locator("path")).toHaveCount(6);
    const source = sigil.locator("g").first();
    const transform = await source.getAttribute("transform");
    await page.clock.runFor(6000);
    expect(await source.getAttribute("transform")).toBe(transform);
    const curves = await surfaces
      .locator("g:nth-child(2) path")
      .evaluateAll((paths) =>
        paths.flatMap((path) => path.getAttribute("d").match(/M[^M]+/g) || []),
      );
    expect(curves.length).toBeGreaterThan(10);
    expect(curves.length).toBeLessThanOrEqual(680);
    if (["sigil", "lattice", "geodesic", "storm"].includes(id))
      for (const curve of curves) {
        const [x, y, cx, cy, ex, ey] = curve.match(/-?\d+(?:\.\d+)?/g).map(Number);
        expect(Math.abs(cx - (x + ex) / 2)).toBeLessThan(0.02);
        expect(Math.abs(cy - (y + ey) / 2)).toBeLessThan(0.02);
      }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await sigil.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("none");
    await page.keyboard.press("Escape");
    await expect(sigil).toBeHidden();
    expect(errors).toEqual([]);
  });
}
