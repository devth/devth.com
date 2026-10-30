import { test, expect } from "@playwright/test";

async function footerTop(page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
  const top = page.locator(".site-footer").getByRole("link", { name: "Back to top" });
  await top.scrollIntoViewIfNeeded();
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
  return top;
}

test("footer labels are plain except ↑ Top, with URLs and social targets preserved", async ({
  page,
}) => {
  await page.goto("/");
  const footer = page.locator(".site-footer");
  await expect(footer.locator("a")).toHaveText([
    "Soli Deo Gloria",
    "Cosmos",
    "Hover Lab",
    "RSS",
    "view source",
    "",
    "",
    "↑ Top",
  ]);
  for (const [name, href] of [
    ["Cosmos", "/cosmos"],
    ["Hover Lab", "/hover-lab"],
    ["RSS", "/feed.xml"],
    ["view source", "https://github.com/devth/devth.com"],
    ["X profile", "https://x.com/devth"],
    ["GitHub profile", "https://github.com/devth"],
    ["Back to top", "#top"],
  ]) {
    await expect(footer.getByRole("link", { name, exact: true })).toHaveAttribute("href", href);
  }
  await expect(footer.locator(".footer-social svg")).toHaveCount(2);
  for (const social of await footer.locator(".footer-social").all()) {
    await expect
      .poll(() =>
        social.evaluate((link) => {
          const rect = link.getBoundingClientRect();
          return rect.width >= 44 && rect.height >= 44;
        }),
      )
      .toBe(true);
  }
});

test("footer Top scrolls through intermediate positions to zero, focuses navigation and keeps history", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const top = await footerTop(page);
  await page.evaluate(() => {
    window.footerScrollStart = scrollY;
    window.footerScrollPositions = [];
    addEventListener("scroll", () => window.footerScrollPositions.push(scrollY));
  });
  await top.click();
  await expect(page).toHaveURL(/\/#top$/);
  await expect(page.locator(".site-header nav a").first()).toBeFocused();
  await expect
    .poll(() =>
      page.evaluate(() =>
        window.footerScrollPositions.some(
          (position) => position > 0 && position < window.footerScrollStart,
        ),
      ),
    )
    .toBe(true);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
});

test("footer Top is immediate with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const top = await footerTop(page);
  await top.evaluate((link) => {
    link.addEventListener(
      "click",
      () => {
        window.footerScrollAfterClick = scrollY;
      },
      { once: true },
    );
  });
  await top.click();
  await expect.poll(() => page.evaluate(() => window.footerScrollAfterClick)).toBe(0);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await expect(page).toHaveURL(/\/#top$/);
  await expect(page.locator(".site-header nav a").first()).toBeFocused();
});

test("footer Top leaves modified and non-primary clicks to the browser", async ({ page }) => {
  const top = await footerTop(page);
  for (const options of [
    { button: 1 },
    { button: 2 },
    { ctrlKey: true },
    { metaKey: true },
    { shiftKey: true },
    { altKey: true },
  ]) {
    const result = await top.evaluate((link, options) => {
      const event = new MouseEvent("click", { bubbles: true, cancelable: true, ...options });
      let intercepted;
      link.addEventListener(
        "click",
        (event) => {
          intercepted = event.defaultPrevented;
          event.preventDefault(); // Suppress only the test event's native navigation.
        },
        { once: true },
      );
      link.dispatchEvent(event);
      return { intercepted, hash: location.hash, position: scrollY };
    }, options);
    expect(result.intercepted).toBe(false);
    expect(result.hash).toBe("");
    expect(result.position).toBeGreaterThan(0);
  }
});

test("footer Top retains its native anchor fallback without JavaScript", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto(baseURL + "/");
    const top = page.locator(".site-footer").getByRole("link", { name: "Back to top" });
    await expect(top).toHaveAttribute("href", "#top");
    await top.scrollIntoViewIfNeeded();
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0);
    await top.click();
    await expect(page).toHaveURL(/\/#top$/);
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  } finally {
    await context.close();
  }
});
