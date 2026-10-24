import { test, expect } from "@playwright/test";

for (const reduced of [false, true]) {
  test(
    reduced
      ? "background stays static with reduced motion"
      : "background moves only on scroll, never at rest",
    async ({ page }) => {
      await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
      await page.addInitScript(() => {
        Math.random = () => 0.2;
      });
      await page.goto("/");
      const graph = page.locator(".page-graph");
      await expect(graph).toBeVisible();
      await expect(graph).toHaveCSS("pointer-events", "none");
      await page.clock.install();
      await expect(graph.locator("defs path")).toHaveCount(4);
      const glyphBefore = await graph.locator("defs").innerHTML();
      const before = await graph.innerHTML();
      await page.clock.runFor(1000);
      expect(await graph.innerHTML()).toBe(before);
      await page.evaluate(() => window.scrollTo(0, 400));
      await page.clock.runFor(64);
      if (reduced) expect(await graph.innerHTML()).toBe(before);
      else {
        await expect.poll(() => graph.innerHTML()).not.toBe(before);
        await expect.poll(() => graph.locator("defs").innerHTML()).not.toBe(glyphBefore);
        const scales = await graph
          .locator(".graph-node")
          .evaluateAll((nodes) =>
            nodes.map((node) =>
              Number(node.getAttribute("transform").split("scale(")[1].split(")")[0]),
            ),
          );
        expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.2);
      }
      const settled = await graph.innerHTML();
      await page.clock.runFor(1000);
      expect(await graph.innerHTML()).toBe(settled);
    },
  );
}

test("large home logo transitions into the compact article logo", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    window.addEventListener("pagereveal", (event) => {
      event.viewTransition?.ready.then(() => {
        window.__brandFrames = document
          .getAnimations()
          .filter(
            (animation) =>
              animation.effect?.pseudoElement?.includes("site-brand") ||
              animation.animationName?.includes("site-brand"),
          )
          .flatMap((animation) =>
            animation.effect
              .getKeyframes()
              .map((frame) => ({ width: frame.width, transform: frame.transform })),
          );
      });
    });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "devth", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Writing", exact: true })).toHaveCount(0);
  const logo = page.locator(".brand-mark");
  const largeWidth = (await logo.boundingBox()).width;
  expect(
    Number.parseFloat(await logo.evaluate((node) => getComputedStyle(node).fontSize)),
  ).toBeGreaterThan(90);
  await page.getByRole("link", { name: /Iteration and Play/ }).click();
  await expect(page).toHaveURL(/iteration-and-play$/);
  await expect
    .poll(() => page.evaluate(() => window.__brandFrames?.length || 0))
    .toBeGreaterThanOrEqual(2);
  expect((await logo.boundingBox()).width).toBeLessThan(largeWidth / 2);
});
