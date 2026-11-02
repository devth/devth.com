import { test, expect } from "@playwright/test";

const drawerAnimations = ["drawer-enter", "drawer-settle", "drawer-underlay"];

async function openEnhancedPage(page) {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => history.scrollRestoration)).toBe("manual");
}

async function observeTransitions(page, capture = false) {
  await page.addInitScript(
    ({ capture, names }) => {
      const observe = (event) => {
        const viewTransition = event.viewTransition || event.detail?.viewTransition;
        const root = document.documentElement;
        root.dataset.transition = viewTransition ? "pending" : "none";
        if (!viewTransition) return;
        viewTransition.ready
          .then(() => {
            const animations = document
              .getAnimations()
              .filter((animation) =>
                [...names, "pane-enter", "pane-exit"].includes(animation.animationName),
              );
            root.dataset.transitionAnimations = animations
              .map((animation) => animation.animationName)
              .sort()
              .join(",");
            if (capture && !sessionStorage.getItem("transition-captured")) {
              sessionStorage.setItem("transition-captured", "true");
              for (const animation of document.getAnimations()) {
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
    { capture, names: drawerAnimations },
  );
}

for (const colorScheme of ["light", "dark"]) {
  test(`a ${colorScheme} content drawer slides over the old page, then settles to paper`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "no-preference", colorScheme });
    await observeTransitions(page, true);
    await openEnhancedPage(page);
    await page.getByRole("link", { name: "about", exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-transition", "ready");
    await expect(root).toHaveAttribute("data-transition-animations", drawerAnimations.join(","));
    const effects = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      const rgb = (color) => {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].slice(0, 3);
      };
      const animations = document.getAnimations();
      const animation = (name) => animations.find((item) => item.animationName === name);
      const entrance = animation("drawer-enter");
      const settle = animation("drawer-settle");
      const frames = settle.effect.getKeyframes();
      const moving = getComputedStyle(
        document.documentElement,
        "::view-transition-new(page-content)",
      );
      return {
        entranceDuration: entrance.effect.getTiming().duration,
        settleDuration: settle.effect.getTiming().duration,
        settleDelay: settle.effect.getTiming().delay,
        tint: rgb(frames[0].backgroundColor),
        paper: rgb(frames.at(-1).backgroundColor),
        outline: rgb(frames[0].outlineColor),
        x: new DOMMatrix(moving.transform).m41,
        viewport: innerWidth,
        verticalBleed: -parseFloat(moving.clipPath.slice("inset(".length)),
        requiredBleed: Math.max(
          document.querySelector("main").getBoundingClientRect().top,
          innerHeight - document.querySelector("main").getBoundingClientRect().bottom,
        ),
        underlay: getComputedStyle(document.documentElement, "::view-transition-old(page-outgoing)")
          .opacity,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(effects.entranceDuration).toBe(400);
    expect(effects.settleDelay).toBe(effects.entranceDuration);
    expect(effects.settleDuration).toBe(220);
    expect(effects.outline).toEqual(effects.tint);
    const brightness = (rgb) => rgb.reduce((a, b) => a + b);
    if (colorScheme === "light")
      expect(brightness(effects.tint)).toBeLessThan(brightness(effects.paper));
    else expect(brightness(effects.tint)).toBeGreaterThan(brightness(effects.paper));
    expect(effects.x).toBeGreaterThan(0);
    expect(effects.x).toBeLessThan(effects.viewport);
    expect(effects.underlay).toBe("1");
    expect(effects.scrollWidth).toBe(effects.viewport);
    expect(effects.verticalBleed).toBeGreaterThanOrEqual(effects.requiredBleed);
    await page.screenshot({ path: testInfo.outputPath(`drawer-${colorScheme}-enter.png`) });
    await page.evaluate(() =>
      document.getAnimations().forEach((animation) => {
        animation.currentTime = 510;
      }),
    );
    await page.screenshot({ path: testInfo.outputPath(`drawer-${colorScheme}-settle.png`) });
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
    await expect(root).toHaveAttribute("data-transition", "finished");
    await expect(root).not.toHaveAttribute("data-soft-navigation");
    await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "devth", exact: true })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(/\/about$/);
    await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  });
}

test("a second navigation interrupts the drawer without leaving transition state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeTransitions(page, true);
  await openEnhancedPage(page);
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "ready");
  await expect(page.locator("html")).toHaveAttribute(
    "data-transition-animations",
    drawerAnimations.join(","),
  );
  await page.getByRole("link", { name: "glossary", exact: true }).click();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.getByRole("heading", { name: "Glossary", exact: true })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy");
});

test("the Cosmos drawer uses its own dark paper even in a light system theme", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "light" });
  await observeTransitions(page, true);
  await openEnhancedPage(page);
  await page.getByRole("link", { name: /^cosmos$/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "ready");
  const palette = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement, "::view-transition-new(page-content)");
    return [
      style.getPropertyValue("--drawer-paper").trim(),
      style.getPropertyValue("--drawer-ink").trim(),
    ];
  });
  expect(palette).toEqual(["#06070b", "#f4f3ec"]);
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
  await expect(page.locator("[data-cosmos-stage]")).toHaveAttribute("data-ready", "");
});

test("skipping a pending capture completes navigation without an unhandled rejection", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    document.addEventListener("site:navigation", (event) => {
      if (!event.detail.viewTransition) return;
      document.documentElement.dataset.captureSkipped = "";
      event.detail.viewTransition.skipTransition();
    });
  });
  await openEnhancedPage(page);
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-capture-skipped", "");
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  expect(errors).toEqual([]);
});

test("reduced motion disables page transitions rather than shortening them", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await observeTransitions(page);
  await openEnhancedPage(page);
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "none");
});
