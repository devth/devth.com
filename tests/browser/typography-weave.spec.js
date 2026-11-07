import { test, expect } from "@playwright/test";

async function placeLogoAheadOf(page, link) {
  // Move the real wordmark into a known growing tip's path without changing the link's layout.
  await page.locator(".brand").evaluate((element) => {
    const box = element.getBoundingClientRect();
    element.style.width = `${box.width}px`;
    element.style.height = `${box.height}px`;
  });
  const box = await link.boundingBox();
  await page.locator(".brand-mark").evaluate((element, box) => {
    Object.assign(element.style, {
      position: "fixed",
      left: `${box.x + box.width}px`,
      top: `${box.y + box.height / 2 - 58}px`,
      fontSize: "96px",
      lineHeight: "1",
      letterSpacing: "-0.08em",
    });
  }, box);
}

test("SVG fallback growth responds only to real logo encounters and reuses the ink cache", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    );
    Math.random = () => 7 / 0x100000000;
    const context = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith("webgl") ? null : context.call(this, type, ...args);
    };
    const read = CanvasRenderingContext2D.prototype.getImageData;
    window.__glyphReads = 0;
    CanvasRenderingContext2D.prototype.getImageData = function (...args) {
      if (this.canvas.width === 160 && this.canvas.height === 160) window.__glyphReads++;
      return read.apply(this, args);
    };
  });
  await page.clock.install({ time: new Date("2026-11-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-01T12:00:01Z"));
  await page.goto("/");
  const link = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "about", exact: true });
  await placeLogoAheadOf(page, link);
  await link.focus();
  const front = page.locator(".link-sigil:not([data-retiring])");
  await expect(front).toBeVisible();
  await page.clock.runFor(2500);
  const contacts = await front.getAttribute("data-growth-contacts");
  expect(Number(contacts)).toBeGreaterThan(0);
  const reads = await page.evaluate(() => window.__glyphReads);
  expect(reads).toBeGreaterThan(0);
  expect(reads).toBeLessThanOrEqual(6);
  const crossings = await page.evaluate(() => {
    const mark = document.querySelector(".brand-mark");
    const walker = document.createTreeWalker(mark, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    range.setStart(walker.nextNode(), 0);
    range.setEnd(walker.currentNode, 1);
    const rect = range.getBoundingClientRect(),
      style = getComputedStyle(mark);
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 512;
    const context = canvas.getContext("2d");
    context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const ascent = context.measureText("d").fontBoundingBoxAscent;
    context.fillText("d", 32, 112);
    const pixels = context.getImageData(0, 0, 512, 512).data;
    return [".link-sigil", ".sigil-rear"].map((selector) => {
      let ink = 0;
      for (const path of document.querySelectorAll(
        `${selector}:not([data-retiring]) > g:nth-of-type(2) path`,
      )) {
        const matrix = path.getScreenCTM(),
          length = path.getTotalLength();
        if (!length) continue;
        for (let sample = 0; sample <= 400; sample++) {
          const point = path.getPointAtLength((length * sample) / 400);
          const screen = new DOMPoint(point.x, point.y).matrixTransform(matrix);
          const x = Math.round(screen.x - rect.left + 32),
            y = Math.round(screen.y - rect.top + 112 - ascent);
          if (x >= 0 && x < 512 && y >= 0 && y < 512 && pixels[(y * 512 + x) * 4 + 3] >= 128) ink++;
        }
      }
      return ink;
    });
  });
  expect(crossings[0], "front half-turns cross the actual d ink").toBeGreaterThan(0);
  expect(crossings[1], "rear half-turns cross behind the same actual d ink").toBeGreaterThan(0);
  await page.screenshot({ path: testInfo.outputPath("controlled-ink-encounter.png") });
  await page.locator(".brand-mark").evaluate((element) => {
    element.style.left = "10000px";
  });
  await page.clock.runFor(3000);
  await expect(front).toHaveAttribute("data-growth-contacts", contacts);
  expect(await page.evaluate(() => window.__glyphReads)).toBe(reads);
});

for (const pathname of ["/", "/about"]) {
  test(`native growth shares the actual solid wordmark scene on ${pathname}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "devth:hover-preferences:v1",
        JSON.stringify({ structure: "tendril", generation: true }),
      );
      Math.random = () => 0.37;
    });
    await page.clock.install();
    await page.goto(pathname);
    const canvas = page.locator("canvas[data-logo-depth]");
    await expect(canvas).toBeVisible();
    const heading = page.locator("h1").first(),
      before = await heading.boundingBox();
    await page.locator(".brand").hover();
    await page.clock.runFor(4000);
    expect(Number(await canvas.getAttribute("data-growth-curves"))).toBeGreaterThan(0);
    await expect(canvas).toHaveAttribute("data-structure", "tendril");
    await expect(canvas).toHaveCSS("pointer-events", "none");
    await expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(await heading.boundingBox()).toEqual(before);
    await page.screenshot({ path: testInfo.outputPath("weave-light.png") });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.clock.runFor(100);
    await page.screenshot({ path: testInfo.outputPath("weave-dark.png") });
    await page.mouse.move(1, 1);
    await page.clock.runFor(900);
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveAttribute("data-growth-curves", "0");
    await expect(canvas).toHaveAttribute("data-reveal", "0.0000");
  });
}

for (const failure of ["unavailable", "restricted"]) {
  test(`logo ink sampling falls back when canvas is ${failure}`, async ({ page }) => {
    await page.addInitScript((failure) => {
      localStorage.setItem(
        "devth:hover-preferences:v1",
        JSON.stringify({ structure: "tendril", generation: true }),
      );
      Math.random = () => 7 / 0x100000000;
      window.__glyphAttempts = 0;
      if (failure === "unavailable") {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          if (kind === "2d") {
            if (this.width === 160 && this.height === 160) window.__glyphAttempts++;
            return null;
          }
          return original.call(this, kind, ...args);
        };
      } else {
        CanvasRenderingContext2D.prototype.getImageData = () => {
          window.__glyphAttempts++;
          throw new Error("Canvas readback restricted");
        };
      }
    }, failure);
    await page.goto("/");
    const link = page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "about", exact: true });
    await placeLogoAheadOf(page, link);
    await link.focus();
    const front = page.locator(".link-sigil:not([data-retiring])");
    await expect(front).toBeVisible();
    await expect(front).not.toHaveAttribute("data-logo-glyphs");
    await expect(front).toHaveAttribute("data-growth-contacts", "0");
    expect(await page.evaluate(() => window.__glyphAttempts)).toBeGreaterThan(0);
    await expect(front.locator("path")).toHaveCount(4);
    await expect(page.getByRole("link", { name: "devth home" })).toHaveAttribute("href", "/");
  });
}

test("logo relief keeps the live brand through navigation before resuming solid depth", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    document.addEventListener("site:navigation", (event) => {
      event.detail?.viewTransition?.ready
        .then(() => {
          const animations = document.getAnimations();
          window.__logoRelief = animations
            .filter((animation) => animation.animationName === "logo-relief")
            .map((animation) => ({
              duration: animation.effect.getTiming().duration,
              frames: animation.effect.getKeyframes(),
            }));
          for (const animation of animations) {
            animation.pause();
            animation.currentTime = 80;
          }
          document.documentElement.dataset.logoTransition = "ready";
        })
        .catch(() => {});
    });
  });
  await page.goto("/about");
  const brand = page.getByRole("link", { name: "devth home" });
  await brand.evaluate((element) => {
    window.__liveBrand = element;
  });
  await expect(page.locator("canvas[data-logo-depth]")).toBeVisible();
  await brand.hover();
  await expect(page.locator(".link-sigil[data-logo-glyphs]")).toHaveCount(0);
  await brand.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-logo-transition", "ready");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await brand.evaluate((element) => element === window.__liveBrand)).toBe(true);
  await expect(page.locator("canvas[data-logo-depth]")).toHaveCount(0);
  const relief = await page.evaluate(() => window.__logoRelief);
  expect(relief).toHaveLength(1);
  expect(relief[0].duration).toBe(280);
  expect(relief[0].frames[0].transform).toContain("rotateX(2deg)");
  expect(relief[0].frames.at(-1).transform).toBe("none");
  expect(
    await page
      .locator(".link-sigil path, .sigil-rear path")
      .evaluateAll((paths) =>
        paths.every((path) => !/NaN|Infinity/.test(path.getAttribute("d") || "")),
      ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath("logo-relief.png") });
  await page.evaluate(() => {
    for (const animation of document.getAnimations()) animation.finish();
  });
  await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  await expect(page.locator("canvas[data-logo-depth]")).toBeVisible();
});

test("reduced motion and forced colors keep the wordmark ordinary", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const brand = page.getByRole("link", { name: "devth home" });
  await brand.hover();
  await expect(page.locator(".link-sigil")).toBeHidden();
  await expect(page.locator(".brand-mark")).toHaveCSS("view-transition-name", "none");
  await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "active" });
  await page.mouse.move(1, 1);
  await brand.hover();
  await expect(page.locator(".link-sigil[data-logo-glyphs]")).toHaveCount(0);
  await expect(page.locator(".brand-mark")).toHaveCSS("view-transition-name", "none");
  await expect(brand).toHaveAccessibleName("devth home");
});

test("default solid logo has no garden until hover and draws the native seed before growth", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  const canvas = page.locator("canvas[data-logo-depth]");
  await expect(canvas).toBeVisible();
  await page.clock.runFor(1000);
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
  await expect(canvas).toHaveAttribute("data-reveal", "0.0000");
  await page.locator(".brand").hover();
  await page.clock.runFor(200);
  expect(Number(await canvas.getAttribute("data-reveal"))).toBeGreaterThan(0);
  expect(Number(await canvas.getAttribute("data-reveal"))).toBeLessThan(1);
  await expect(canvas).toHaveAttribute("data-growth-curves", "0");
});
