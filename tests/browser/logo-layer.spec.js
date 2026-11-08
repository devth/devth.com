import { test, expect } from "@playwright/test";

async function grow(page, path) {
  await page.addInitScript(() =>
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "tendril", generation: true }),
    ),
  );
  await page.clock.install();
  await page.goto(path);
  await page.locator('.site-header nav a[href="/about"]').hover();
  const front = page.locator(".link-sigil.is-visible[data-generating]");
  await expect(front).toBeVisible();
  await page.clock.runFor(1000);
  return front;
}

for (const path of ["/", "/about", "/cosmos"]) {
  test(`plain logo paints above front hover art on ${path}`, async ({ page }, testInfo) => {
    const front = await grow(page, path);
    // Probe the real effect's stacking context at the logo, independent of random growth direction.
    const onTop = await front.evaluate((svg) => {
      const mark = document.querySelector(".brand-mark");
      const bounds = mark.getBoundingClientRect();
      const probe = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      probe.setAttribute("x", bounds.left);
      probe.setAttribute("y", bounds.top);
      probe.setAttribute("width", bounds.width);
      probe.setAttribute("height", bounds.height);
      probe.style.pointerEvents = "all";
      svg.append(probe);
      try {
        const hit = document.elementFromPoint(
          bounds.left + bounds.width / 2,
          bounds.top + bounds.height / 2,
        );
        return Boolean(hit?.closest(".brand"));
      } finally {
        probe.remove();
      }
    });
    expect(onTop).toBe(true);
    await expect(page.locator(".brand-mark")).toHaveCSS("opacity", "1");
    await expect(page.locator("canvas[data-logo-depth]")).toHaveCount(0);
    // The probe is gone: this captures the unmodified, real hover artwork.
    await page.screenshot({ path: testInfo.outputPath("logo-above-art.png") });
    await page.locator(".skip-link").focus();
    const skipOnTop = await page.locator(".skip-link").evaluate((skip) => {
      const s = skip.getBoundingClientRect();
      const b = document.querySelector(".brand-mark").getBoundingClientRect();
      const left = Math.max(s.left, b.left),
        right = Math.min(s.right, b.right);
      const top = Math.max(s.top, b.top),
        bottom = Math.min(s.bottom, b.bottom);
      const overlaps = right > left && bottom > top;
      return Boolean(
        document
          .elementFromPoint(
            overlaps ? (left + right) / 2 : s.left + s.width / 2,
            overlaps ? (top + bottom) / 2 : s.top + s.height / 2,
          )
          ?.closest(".skip-link"),
      );
    });
    expect(skipOnTop).toBe(true);
  });
}

for (const forcedColors of ["none", "active"]) {
  test(`logo snapshot stays above hover art with forced colors ${forcedColors}`, async ({
    page,
  }) => {
    await page.emulateMedia({ forcedColors });
    await page.addInitScript(() => {
      const start = document.startViewTransition.bind(document);
      document.startViewTransition = (update) => {
        const transition = start(update);
        transition.ready.then(() => {
          document.getAnimations().forEach((animation) => animation.pause());
          window.logoLayerReady = true;
        });
        return transition;
      };
    });
    const front = await grow(page, "/");
    // A known name makes the genuine live-front snapshot addressable for computed-style checks.
    await front.evaluate((svg) => (svg.style.viewTransitionName = "test-hover-art"));
    await page.locator('.site-header nav a[href="/about"]').click();
    await expect.poll(() => page.evaluate(() => window.logoLayerReady)).toBe(true);
    const layers = await page.evaluate(() => {
      const mark = document.querySelector(".brand-mark");
      const name = getComputedStyle(mark).viewTransitionName;
      const owner = name === "none" ? "site-header" : "site-brand";
      const z = (name) =>
        Number(
          getComputedStyle(document.documentElement, `::view-transition-group(${name})`).zIndex,
        );
      return { logo: z(owner), art: z("test-hover-art") };
    });
    expect(layers.logo).toBeGreaterThan(layers.art);
    await page.evaluate(() => document.getAnimations().forEach((animation) => animation.finish()));
    await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation");
  });
}
