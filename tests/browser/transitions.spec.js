import { test, expect } from "@playwright/test";

const pageAnimations = ["page-enter", "page-exit"];

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
              .filter((animation) => names.includes(animation.animationName));
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
        viewTransition.finished.then(
          () => {
            root.dataset.transition = "finished";
          },
          () => {
            root.dataset.transition = "skipped";
          },
        );
      };
      window.addEventListener("pagereveal", observe);
      document.addEventListener("site:navigation", observe);
    },
    { capture, names: pageAnimations },
  );
}

for (const colorScheme of ["light", "dark"]) {
  test(`a ${colorScheme} page exits left while its replacement enters from the right`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "no-preference", colorScheme });
    await observeTransitions(page, true);
    await openEnhancedPage(page);
    await page.getByRole("link", { name: "about", exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    const root = page.locator("html");
    await expect(root).toHaveAttribute("data-transition", "ready");
    await expect(root).toHaveAttribute("data-transition-animations", pageAnimations.join(","));
    const effects = await page.evaluate(() => {
      const animations = document.getAnimations();
      const incoming = animations.find((item) => item.animationName === "page-enter");
      const outgoing = animations.find((item) => item.animationName === "page-exit");
      const moving = getComputedStyle(
        document.documentElement,
        "::view-transition-new(page-content)",
      );
      const leaving = getComputedStyle(
        document.documentElement,
        "::view-transition-old(page-outgoing)",
      );
      return {
        entrance: incoming.effect.getTiming(),
        exit: outgoing.effect.getTiming(),
        incomingFrames: incoming.effect.getKeyframes().map((frame) => ({
          x: new DOMMatrix(frame.transform).m41,
          opacity: Number(frame.opacity),
        })),
        outgoingFrames: outgoing.effect.getKeyframes().map((frame) => ({
          x: new DOMMatrix(frame.transform).m41,
          opacity: Number(frame.opacity),
        })),
        extraColorAnimation: animations.some((animation) =>
          animation.effect
            .getKeyframes()
            .some(
              (frame) =>
                Object.hasOwn(frame, "backgroundColor") || Object.hasOwn(frame, "outlineColor"),
            ),
        ),
        incomingX: new DOMMatrix(moving.transform).m41,
        outgoingX: new DOMMatrix(leaving.transform).m41,
        incomingOpacity: Number(moving.opacity),
        outgoingOpacity: Number(leaving.opacity),
        paper: moving.backgroundColor,
        outline: moving.outlineColor,
        rootPaper: getComputedStyle(document.documentElement).backgroundColor,
        verticalBleed: -parseFloat(moving.clipPath.slice("inset(".length)),
        requiredBleed: Math.max(
          document.querySelector("main").getBoundingClientRect().top,
          innerHeight - document.querySelector("main").getBoundingClientRect().bottom,
        ),
        viewport: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      };
    });
    expect(effects.entrance.duration).toBe(280);
    expect(effects.exit.duration).toBe(150);
    expect(effects.entrance.delay).toBe(0);
    expect(effects.exit.delay).toBe(0);
    expect(effects.incomingFrames).toEqual([
      { x: 48, opacity: 0 },
      { x: 0, opacity: 1 },
    ]);
    expect(effects.outgoingFrames).toEqual([
      { x: 0, opacity: 1 },
      { x: -32, opacity: 0 },
    ]);
    expect(effects.extraColorAnimation).toBe(false);
    expect(effects.incomingX).toBeGreaterThan(0);
    expect(effects.incomingX).toBeLessThan(48);
    expect(effects.outgoingX).toBeLessThan(0);
    expect(effects.outgoingX).toBeGreaterThan(-32);
    for (const opacity of [effects.incomingOpacity, effects.outgoingOpacity]) {
      expect(opacity).toBeGreaterThan(0);
      expect(opacity).toBeLessThan(1);
    }
    expect(effects.paper).toBe(effects.rootPaper);
    expect(effects.outline).toBe(effects.paper);
    expect(effects.scrollWidth).toBe(effects.viewport);
    expect(effects.verticalBleed).toBeGreaterThanOrEqual(effects.requiredBleed);
    for (const time of [0, 45, 80, 150, 280]) {
      await page.evaluate(
        (time) =>
          document.getAnimations().forEach((animation) => {
            animation.currentTime = time;
          }),
        time,
      );
      await page.screenshot({ path: testInfo.outputPath(`page-${colorScheme}-${time}.png`) });
    }
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

test("a second navigation interrupts the slide/fade without leaving transition state", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await observeTransitions(page, true);
  await openEnhancedPage(page);
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "ready");
  await expect(page.locator("html")).toHaveAttribute(
    "data-transition-animations",
    pageAnimations.join(","),
  );
  await page.getByRole("link", { name: "glossary", exact: true }).click();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.getByRole("heading", { name: "Glossary", exact: true })).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy");
});

test("Cosmos keeps a dark full-viewport surface even in a light system theme", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "light" });
  await observeTransitions(page, true);
  await openEnhancedPage(page);
  await page.getByRole("link", { name: /^cosmos$/i }).click();
  await expect(page.locator("html")).toHaveAttribute("data-transition", "ready");
  const palette = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement, "::view-transition-new(page-content)");
    return [
      style.backgroundColor,
      style.outlineColor,
      getComputedStyle(document.querySelector(".cosmos")).backgroundColor,
    ];
  });
  expect(palette).toEqual(["rgb(6, 7, 11)", "rgb(6, 7, 11)", "rgb(6, 7, 11)"]);
  await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
  await expect(page.locator("[data-cosmos-stage]")).toHaveAttribute("data-ready", "");
});

test("Cosmos entry and exit keep the paper continuous at both viewport edges", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference", colorScheme: "light" });
  // Keep the sky empty so the check measures paper, not individual stars.
  await page.route("**/data/nearby-stars.json", (route) => route.abort());
  await observeTransitions(page, true);
  await openEnhancedPage(page);
  for (const destination of ["cosmos", "about"]) {
    await page.evaluate(() => sessionStorage.removeItem("transition-captured"));
    await page.getByRole("link", { name: new RegExp(`^${destination}$`, "i") }).click();
    await expect(page.locator("html")).toHaveAttribute("data-transition", "ready");
    for (const time of [45, 80]) {
      await page.evaluate(
        (time) =>
          document.getAnimations().forEach((animation) => {
            animation.currentTime = time;
          }),
        time,
      );
      const screenshot = await page.screenshot();
      const rows = await page.evaluate(async (data) => {
        const image = new Image();
        image.src = `data:image/png;base64,${data}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        const scaleX = canvas.width / innerWidth;
        const scaleY = canvas.height / innerHeight;
        // A scrolled-out word can intersect any one pixel; sample the paper's median instead.
        const columns = [2, innerWidth / 2, innerWidth - 3].map((x) =>
          Array.from({ length: 33 }, (_, index) => [
            ...context.getImageData(
              Math.floor(x * scaleX),
              Math.floor(((index + 0.5) / 33) * innerHeight * scaleY),
              1,
              1,
            ).data,
          ]),
        );
        return [
          columns.map((column) =>
            [0, 1, 2].map(
              (channel) => column.map((pixel) => pixel[channel]).sort((a, b) => a - b)[16],
            ),
          ),
        ];
      }, screenshot.toString("base64"));
      for (const [left, center, right] of rows) {
        for (const edge of [left, right]) {
          for (let channel = 0; channel < 3; channel++) {
            expect(
              Math.abs(edge[channel] - center[channel]),
              `${destination} at ${time}ms: edges must match the paper: ${JSON.stringify(rows)}`,
            ).toBeLessThanOrEqual(6);
          }
        }
      }
    }
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
    await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  }
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
