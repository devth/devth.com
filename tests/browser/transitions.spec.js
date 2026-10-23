import { test, expect } from "@playwright/test";

async function observeTransitions(page, capture = false) {
  await page.addInitScript(
    ({ capture }) => {
      window.addEventListener("pagereveal", (event) => {
        const root = document.documentElement;
        root.dataset.transition = event.viewTransition ? "pending" : "none";
        if (!event.viewTransition) return;
        event.viewTransition.ready
          .then(() => {
            const animations = document
              .getAnimations()
              .filter((animation) =>
                ["pane-breakaway", "pane-arrive"].includes(animation.animationName),
              );
            root.dataset.transitionAnimations = animations
              .map((animation) => animation.animationName)
              .sort()
              .join(",");
            if (capture && !sessionStorage.getItem("transition-captured")) {
              sessionStorage.setItem("transition-captured", "true");
              for (const animation of animations) {
                animation.pause();
                animation.currentTime = 300;
              }
            }
            root.dataset.transition = "ready";
          })
          .catch(() => {
            root.dataset.transition = "skipped";
          });
        event.viewTransition.finished.then(() => {
          root.dataset.transition = "finished";
        });
      });
    },
    { capture },
  );
}

test("native navigation makes the old page a wind-blown 3D pane", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeTransitions(page, true);
  await page.goto("/");
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-transition", "ready");
  await expect(root).toHaveAttribute("data-transition-animations", "pane-arrive,pane-breakaway");
  const transforms = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => ["pane-breakaway", "pane-arrive"].includes(animation.animationName))
      .map((animation) =>
        animation.effect
          .getKeyframes()
          .some((frame) => /rotateX|matrix3d/.test(frame.transform || "")),
      ),
  );
  expect(transforms).toEqual([true, true]);
  await page.screenshot({ path: testInfo.outputPath("falling-pane.png") });
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
  await expect(root).toHaveAttribute("data-transition", "finished");
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  // Back/forward remain real browser navigations, not a client-side history shim.
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Writing" })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
});

test("wind can carry the actual page into any quadrant", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const angle = sessionStorage.getItem("test-wind-angle");
    if (angle !== null) Math.random = () => Number(angle);
  });
  await observeTransitions(page, true);
  await page.goto("/");
  for (const [angle, destination, xSign, ySign] of [
    [0.125, "About", 1, 1],
    [0.375, "Overture", -1, 1],
    [0.625, "About", -1, -1],
    [0.875, "Overture", 1, -1],
  ]) {
    await page.evaluate((angle) => {
      sessionStorage.setItem("test-wind-angle", String(angle));
      sessionStorage.removeItem("transition-captured");
    }, angle);
    await page.getByRole("link", { name: destination, exact: true }).click();
    await expect(page).toHaveURL(new RegExp("/" + destination.toLowerCase() + "$"));
    await expect(page.locator("html")).toHaveAttribute("data-transition", "ready");
    const flight = await page.evaluate(() => {
      const root = document.documentElement;
      const animation = document.getAnimations().find((a) => a.animationName === "pane-breakaway");
      const duration = animation.effect.getTiming().duration;
      const positionAt = (progress) => {
        animation.currentTime = duration * progress;
        const matrix = new DOMMatrixReadOnly(
          getComputedStyle(root, "::view-transition-old(root)").transform,
        );
        return { x: matrix.m41 / innerWidth, y: matrix.m42 / innerHeight };
      };
      return {
        middle: positionAt(0.44),
        later: positionAt(0.7),
        end: positionAt(0.99),
        x: Number(root.style.getPropertyValue("--wind-x")),
        y: Number(root.style.getPropertyValue("--wind-y")),
      };
    });
    expect(Math.sign(flight.end.x)).toBe(xSign);
    expect(Math.sign(flight.end.y)).toBe(ySign);
    expect(Math.abs(flight.end.x)).toBeGreaterThan(0.9);
    expect(Math.abs(flight.end.y)).toBeGreaterThan(0.9);
    // The perpendicular bend reverses, rather than following a straight exit vector.
    const cross = (point) => point.x * flight.y - point.y * flight.x;
    expect(cross(flight.middle) * cross(flight.later)).toBeLessThan(0);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.finish()));
    await expect(page.locator("html")).toHaveAttribute("data-transition", "finished");
  }
});

test("reduced motion disables page transitions rather than shortening them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await observeTransitions(page);
  await page.goto("/");
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "none");
});
