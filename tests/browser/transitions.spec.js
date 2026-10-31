import { test, expect } from "@playwright/test";

async function observeTransitions(page, capture = false) {
  await page.addInitScript(
    ({ capture }) => {
      const observe = (event) => {
        const viewTransition = event.viewTransition || event.detail?.viewTransition;
        const root = document.documentElement;
        root.dataset.transition = viewTransition ? "pending" : "none";
        if (!viewTransition) return;
        viewTransition.ready
          .then(() => {
            const animations = document
              .getAnimations()
              .filter((animation) => ["pane-exit", "pane-enter"].includes(animation.animationName));
            root.dataset.transitionAnimations = animations
              .map((animation) => animation.animationName)
              .sort()
              .join(",");
            if (capture && !sessionStorage.getItem("transition-captured")) {
              sessionStorage.setItem("transition-captured", "true");
              for (const animation of animations) {
                animation.pause();
                animation.currentTime = 80;
              }
            }
            root.dataset.transition = "ready";
          })
          .catch(() => {
            root.dataset.transition = "skipped";
          });
        viewTransition.finished.then(() => {
          root.dataset.transition = "finished";
        });
      };
      window.addEventListener("pagereveal", observe);
      document.addEventListener("site:navigation", observe);
    },
    { capture },
  );
}

test("persistent navigation uses a short, restrained content transition", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeTransitions(page, true);
  await page.goto("/");
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page).toHaveURL(/\/about$/);
  const root = page.locator("html");
  await expect(root).toHaveAttribute("data-transition", "ready");
  await expect(root).toHaveAttribute("data-transition-animations", "pane-enter,pane-exit");
  const effects = await page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => ["pane-exit", "pane-enter"].includes(animation.animationName))
      .map((animation) => ({
        duration: animation.effect.getTiming().duration,
        frames: animation.effect.getKeyframes().map((frame) => ({
          transform: frame.transform,
          filter: frame.filter,
          boxShadow: frame.boxShadow,
        })),
      })),
  );
  for (const effect of effects) {
    expect(effect.duration).toBeLessThanOrEqual(220);
    expect(effect.frames).toHaveLength(2);
    expect(effect.frames.some((frame) => /rotateX|matrix3d/.test(frame.transform))).toBe(true);
    expect(effect.frames.every((frame) => !frame.filter && !frame.boxShadow)).toBe(true);
  }
  await page.screenshot({ path: testInfo.outputPath("page-transition.png") });
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
  await expect(root).toHaveAttribute("data-transition", "finished");
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "devth", exact: true })).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
});

test("reduced motion disables page transitions rather than shortening them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await observeTransitions(page);
  await page.goto("/");
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "none");
});
