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

test("growth from another link responds only to real logo encounters and reuses the ink cache", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    );
    Math.random = () => 7 / 0x100000000;
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
  test(`growth weaves around actual logo and title glyphs on ${pathname}`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      localStorage.setItem(
        "devth:hover-preferences:v1",
        JSON.stringify({ structure: "tendril", generation: true }),
      );
      Math.random = () => 0.37;
      const read = CanvasRenderingContext2D.prototype.getImageData;
      window.__glyphReads = 0;
      CanvasRenderingContext2D.prototype.getImageData = function (...args) {
        if (this.canvas.width === 160 && this.canvas.height === 160) window.__glyphReads++;
        return read.apply(this, args);
      };
    });
    await page.clock.install({ time: new Date("2026-11-01T12:00:00Z") });
    await page.clock.pauseAt(new Date("2026-11-01T12:00:01Z"));
    await page.goto(pathname);
    const brand = page.locator(".site-header .brand");
    const heading = page.locator("h1").first();
    const before = await heading.boundingBox();
    await brand.hover();
    const front = page.locator(".link-sigil:not([data-retiring])");
    await expect(front).toBeVisible();
    const attachment = await front
      .locator("g")
      .first()
      .evaluate((group) => {
        const mark = document.querySelector(".brand-mark"),
          box = mark.getBoundingClientRect();
        const edge = mark.querySelector('[aria-hidden="true"]').getBoundingClientRect().left;
        const matrix = group.getScreenCTM();
        return {
          x: matrix.e,
          y: matrix.f,
          expectedX: Math.min(innerWidth - 36, Math.max(36, edge - 6)),
          expectedY: Math.min(innerHeight - 36, Math.max(36, box.top + box.height / 2)),
        };
      });
    expect(attachment.x).toBeCloseTo(attachment.expectedX, 1);
    expect(attachment.y).toBeCloseTo(attachment.expectedY, 1);
    const key = await front.getAttribute("data-sigil-key");
    const rear = page.locator(`.sigil-rear[data-sigil-key="${key}"]`);
    await expect(rear).toBeVisible();
    await expect(front).not.toHaveAttribute("data-logo-glyphs");
    await expect(rear).not.toHaveAttribute("data-logo-glyphs");
    await page.clock.runFor(10000);
    expect(await page.evaluate(() => window.__glyphReads)).toBeLessThanOrEqual(6);
    const both = page.locator(`svg[data-sigil-key="${key}"]`);
    await expect(both).toHaveCount(2);
    await expect(both.locator("path")).toHaveCount(6);
    expect(
      await rear
        .locator("path")
        .evaluateAll((paths) => paths.some((path) => (path.getAttribute("d") || "").length > 100)),
    ).toBe(true);
    expect(
      await front
        .locator("path")
        .evaluateAll((paths) => paths.some((path) => (path.getAttribute("d") || "").length > 100)),
    ).toBe(true);
    await expect(front).toHaveCSS("z-index", "4");
    await expect(rear).toHaveCSS("z-index", "-1");
    for (const layer of [front, rear]) {
      await expect(layer).toHaveCSS("pointer-events", "none");
      await expect(layer).toHaveAttribute("aria-hidden", "true");
    }
    expect(await heading.boundingBox()).toEqual(before);
    expect(await rear.getAttribute("viewBox")).toBe(await front.getAttribute("viewBox"));
    expect(await rear.locator("g").first().getAttribute("transform")).toBe(
      await front.locator("g").first().getAttribute("transform"),
    );
    await page.screenshot({ path: testInfo.outputPath("weave-light.png") });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.screenshot({ path: testInfo.outputPath("weave-dark.png") });
    await page.mouse.move(1, 1);
    await page.clock.runFor(400);
    await expect(front).toBeVisible();
    await expect(rear).toBeVisible();
    await page.clock.runFor(450);
    await expect(front).toBeHidden();
    await expect(rear).toBeHidden();
    await expect(both).toHaveCount(2);
    await brand.hover();
    await expect(page.locator(".sigil-rear:not([data-retiring])")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".sigil-rear:visible")).toHaveCount(0);
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

test("logo relief keeps the live brand and finite growth through navigation", async ({
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
  await brand.hover();
  await expect(page.locator(".link-sigil:not([data-retiring])")).toBeVisible();
  await expect(page.locator(".link-sigil[data-logo-glyphs]")).toHaveCount(0);
  await brand.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("html")).toHaveAttribute("data-logo-transition", "ready");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await brand.evaluate((element) => element === window.__liveBrand)).toBe(true);
  await expect(page.locator(".link-sigil:not([data-retiring])")).toBeVisible();
  await expect(page.locator(".link-sigil[data-logo-glyphs]")).toHaveCount(0);
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

test("logo hover does not add prearranged wraps before growth encounters a letter", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    );
    Math.random = () => 0.37;
  });
  await page.clock.install({ time: new Date("2026-11-01T12:00:00Z") });
  await page.clock.pauseAt(new Date("2026-11-01T12:00:01Z"));
  await page.goto("/");
  await page.locator(".brand").hover();
  await expect(page.locator(".link-sigil:not([data-retiring])")).toBeVisible();
  await page.clock.runFor(1000);
  const boxes = await page
    .locator(
      ".link-sigil:not([data-retiring]) > g:first-of-type, .sigil-rear:not([data-retiring]) > g:first-of-type",
    )
    .evaluateAll((groups) =>
      groups.map((group) => ({ width: group.getBBox().width, height: group.getBBox().height })),
    );
  expect(boxes).toHaveLength(2);
  for (const box of boxes) {
    expect(box.width).toBeLessThan(300);
    expect(box.height).toBeLessThan(300);
  }
});
