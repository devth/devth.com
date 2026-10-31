import { test, expect } from "@playwright/test";

async function openPage(page, query, pathname) {
  await page.keyboard.press("Control+k");
  await expect(page.locator("#quick-nav")).toBeVisible();
  await page.getByRole("combobox", { name: "Search pages" }).fill(query);
  await page.getByRole("listbox", { name: "Pages" }).getByRole("option").first().click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", pathname);
}

test("page metadata and counters update once while the shared search and footer persist", async ({
  page,
}) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.footer = document.querySelector(".site-footer");
    window.search = document.querySelector("#quick-nav");
  });
  const counters = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/counter.svg") counters.push(url.searchParams.get("page"));
  });
  const counter = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/counter.svg" &&
      new URL(response.url()).searchParams.get("page") === "/about",
  );
  await openPage(page, "About Trevor Hartman", "/about");
  expect((await counter).status()).toBe(200);
  expect(counters.filter((path) => path === "/about")).toHaveLength(1);
  await expect(page).toHaveTitle(/About Trevor Hartman/);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "https://devth.com/about",
  );
  await expect(page.locator("body")).toHaveClass("about-page");
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        window.footer === document.querySelector(".site-footer") &&
        window.search === document.querySelector("#quick-nav"),
    ),
  ).toBe(true);
  await openPage(page, "Hover Lab", "/hover-lab");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await expect(page.locator("body")).not.toHaveClass(/about-page/);
  await expect(page.getByRole("button", { name: "Compare all" })).toBeVisible();
  await page.locator('.site-header nav a[href="/"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/");
  await expect(page.locator("body")).toHaveClass("home-page");
  await expect(page.getByRole("heading", { level: 1, name: "devth", exact: true })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
});

test("Back and Forward restore reading position and remount the contents controller", async ({
  page,
}) => {
  await page.goto("/on-learning");
  await expect(page.locator("[data-toc]")).toHaveAttribute("data-enhanced", "");
  await page.evaluate(() => scrollTo({ top: 700, behavior: "instant" }));
  const position = await page.evaluate(() => scrollY);
  await openPage(page, "About Trevor Hartman", "/about");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/on-learning");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(position);
  await expect(page.locator("[data-toc]")).toHaveAttribute("data-enhanced", "");
  await page.goForward();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.goBack();
  await expect(page.locator("[data-toc]")).toHaveAttribute("data-enhanced", "");
  await page.locator("[data-toc] a").first().click();
  await expect(page.locator(".prose .is-destination-active").first()).toBeVisible();
});

test("return visits request a fresh counter image for the same page identity", async ({ page }) => {
  const about = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/counter.svg" && url.searchParams.get("page") === "/about")
      about.push(url.href);
  });
  await page.goto("/about");
  await expect.poll(() => about.length).toBe(1);
  await page.locator('.site-header a[href="/glossary"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/glossary");
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  await expect.poll(() => about.length).toBe(2);
  expect(new URL(about[0]).searchParams.get("page")).toBe(
    new URL(about[1]).searchParams.get("page"),
  );
  expect(about[0]).not.toBe(about[1]);
});

test("Back restores the per-entry writing filter", async ({ page }) => {
  await page.goto("/");
  await page.locator("#search").fill("monorepo");
  await expect(page.locator("[data-search-status]")).toHaveText("1 post found.");
  await page.locator(".entry-link:visible").click();
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-ready",
    "/you-might-not-want-a-monorepo",
  );
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/");
  await expect(page.locator("#search")).toHaveValue("monorepo");
  await expect(page.locator(".entry:visible")).toHaveCount(1);
  await page.locator("#search").fill("");
  await expect(page.locator(".entry:visible")).toHaveCount(17);
});

test("late About image layout does not displace restored reading position", async ({ page }) => {
  await page.goto("/about");
  const photo = page.locator('img[src="/images/dakota-50.jpg"]');
  await photo.scrollIntoViewIfNeeded();
  await photo.evaluate((img) => img.decode());
  await photo.evaluate((img) =>
    scrollTo({
      top: img.getBoundingClientRect().top + scrollY + img.height * 0.4,
      behavior: "instant",
    }),
  );
  const saved = await page.evaluate(() => scrollY);
  await openPage(page, "On Learning", "/on-learning");
  // Same-document image caches survive navigation. Force a zero-height placeholder
  // in the fetched HTML to test late intrinsic layout independently of that cache.
  await page.route("**/about", async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        'src="/images/dakota-50.jpg"',
        'src="/images/dakota-50.jpg" style="height: 0px"',
      ),
    });
  });
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  await photo.evaluate((img) => img.style.removeProperty("height"));
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(saved);
});

test("Cosmos releases its GPU context and remounts on return", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/cosmos?seed=123");
  await expect(page.locator("[data-cosmos-stage]")).toHaveAttribute("data-ready", "");
  await page.evaluate(() => {
    window.oldCanvas = document.querySelector("[data-cosmos-stage] canvas");
    window.oldContext = window.oldCanvas.getContext("webgl2");
  });
  await page.locator('.site-header a[href="/about"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  expect(await page.evaluate(() => window.oldCanvas.isConnected)).toBe(false);
  await expect.poll(() => page.evaluate(() => window.oldContext.isContextLost())).toBe(true);
  await page.goBack();
  await expect(page.locator("[data-cosmos-stage]")).toHaveAttribute("data-ready", "");
  await expect(page.locator("[data-cosmos-stage]")).toHaveAttribute("data-seed", "123");
  expect(
    await page.evaluate(
      () => window.oldCanvas !== document.querySelector("[data-cosmos-stage] canvas"),
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("Hover Lab stops detached gardens and retains its named studies after remount", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/hover-lab");
  const first = page.locator("[data-hover-study]").first();
  await first.hover();
  await expect(first).toHaveAttribute("data-running", "true");
  await page.clock.runFor(1200);
  await page.locator("[data-growth-layer]").evaluate((layer) => (window.oldGarden = layer));
  await page.locator('.site-header a[href="/about"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  expect(await page.evaluate(() => window.oldGarden.isConnected)).toBe(false);
  const markup = await page.evaluate(() => window.oldGarden.innerHTML);
  await page.clock.runFor(1200);
  expect(await page.evaluate(() => window.oldGarden.innerHTML)).toBe(markup);
  await page.goBack();
  await expect(page.getByRole("button", { name: "Compare all" })).toBeVisible();
  await expect(page.locator("[data-hover-study]")).toHaveCount(15);
  await first.hover();
  await expect(first).toHaveAttribute("data-running", "true");
  await page.clock.runFor(1000);
  await expect(page.locator("[data-growth-layer]")).toHaveCount(1);
});

test("rapid navigation cancels stale HTML and keyboard arrival focuses main", async ({ page }) => {
  let release;
  const gate = new Promise((resolve) => (release = resolve));
  let started = false;
  await page.route("**/about", async (route) => {
    if (route.request().resourceType() === "fetch") {
      started = true;
      await gate;
    }
    await route.continue();
  });
  await page.goto("/");
  await page.locator('.site-header a[href="/about"]').click();
  await expect.poll(() => started).toBe(true);
  const glossary = page.locator('.site-header a[href="/glossary"]');
  await glossary.focus();
  await glossary.press("Enter");
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/glossary");
  release();
  await expect(page.locator("main")).toBeFocused();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.getByRole("heading", { level: 1, name: "Glossary" })).toBeVisible();
});

test("navigation without View Transition support still preserves the shell", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(document, "startViewTransition", { value: undefined }),
  );
  await page.goto("/about");
  await page.evaluate(() => (window.marker = 42));
  const link = page.locator('.site-header a[href="/glossary"]');
  await link.hover();
  await expect(page.locator(".link-sigil:not([data-retiring])")).toBeVisible();
  await link.click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/glossary");
  expect(await page.evaluate(() => window.marker)).toBe(42);
  await expect(page.locator(".link-sigil:not([data-retiring])")).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-soft-navigation", "");
});

test("current-page intent cancels a pending different-page request", async ({ page }) => {
  let release, finish;
  const gate = new Promise((resolve) => (release = resolve)),
    done = new Promise((resolve) => (finish = resolve));
  let started = false;
  await page.route("**/about", async (route) => {
    if (route.request().resourceType() === "fetch") {
      started = true;
      await gate;
    }
    await route.continue();
    finish();
  });
  await page.goto("/");
  await page.locator('.site-header a[href="/about"]').click();
  await expect.poll(() => started).toBe(true);
  await page.locator('.site-header nav a[href="/"]').click();
  release();
  await done;
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "devth", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true");
});

test("modified links open a native new tab without changing the current document", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => (window.marker = 42));
  const opened = context.waitForEvent("page");
  await page.locator('.site-header a[href="/about"]').click({ modifiers: ["ControlOrMeta"] });
  const next = await opened;
  await expect(next).toHaveURL(/\/about$/);
  await next.close();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => window.marker)).toBe(42);
});

test("Escape and a same-destination click cannot strand a delayed Back traversal", async ({
  page,
}) => {
  await page.goto("/about");
  await page.locator('.site-header a[href="/glossary"]').click();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/glossary");
  let release,
    started = false;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route("**/about", async (route) => {
    if (route.request().resourceType() === "fetch") {
      started = true;
      await gate;
    }
    await route.continue();
  });
  await page.goBack();
  await expect.poll(() => started).toBe(true);
  await page.keyboard.press("Escape");
  await page.locator('.site-header a[href="/about"]').click();
  release();
  await expect(page.locator("html")).toHaveAttribute("data-navigation-ready", "/about");
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByRole("heading", { level: 1, name: "About Trevor Hartman" })).toBeVisible();
});

test("native fragment entries restore the saved reading point on Forward and cross-page return", async ({
  page,
}) => {
  await page.goto("/compiled-queries-in-scala");
  await page.locator('article a[href="#further-reading"]:not(.header-anchor)').click();
  await expect(page).toHaveURL(/#further-reading$/);
  await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
  await page.goBack();
  await expect(page).not.toHaveURL(/#further-reading$/);
  await page.goForward();
  await expect(page).toHaveURL(/#further-reading$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(600);
  await openPage(page, "About Trevor Hartman", "/about");
  await page.goBack();
  await expect(page.locator("html")).toHaveAttribute(
    "data-navigation-ready",
    "/compiled-queries-in-scala",
  );
  await expect(page).toHaveURL(/#further-reading$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(600);
});

test("harmless clicks cannot commit a pending category traversal", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/?category=oss#writing");
  await expect(page.locator("[data-category-label]")).toHaveText("oss");
  await page.locator('.site-footer a[href="#top"]').click();
  await page.locator('.entry:visible a[href="/?category=culture#writing"]').first().click();
  await expect(page.locator("[data-category-label]")).toHaveText("culture");
  let release,
    started = false;
  const gate = new Promise((resolve) => (release = resolve));
  await page.route(
    (url) => url.pathname === "/" && url.searchParams.get("category") === "oss",
    async (route) => {
      started = true;
      await gate;
      await route.continue();
    },
  );
  await page.goBack();
  await expect.poll(() => started).toBe(true);
  await page.locator("[data-search-status]").click();
  await page.goBack();
  release();
  await expect(page).toHaveURL(/category=oss#writing$/);
  await expect(page.locator("[data-category-label]")).toHaveText("oss");
  await expect(page.locator("#search")).toHaveValue("");
  for (const entry of await page.locator(".entry:visible").all())
    expect(JSON.parse(await entry.getAttribute("data-categories"))).toContain("oss");
});

test("repeated custom fragment entries preserve distinct reading points", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/on-learning");
  const memory = page.locator('[data-toc] a[href="#memory"]'),
    other = page.locator('[data-toc] a:not([href="#memory"])').first();
  await memory.click();
  await expect(page).toHaveURL(/#memory$/);
  await page.evaluate(() => scrollTo({ top: 600, behavior: "instant" }));
  await other.evaluate((link) => link.focus({ preventScroll: true }));
  await page.keyboard.press("Enter");
  await expect(page).not.toHaveURL(/#memory$/);
  await memory.evaluate((link) => link.focus({ preventScroll: true }));
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#memory$/);
  await page.evaluate(() => {
    scrollTo({ top: 900, behavior: "instant" });
    document.body.dispatchEvent(new MouseEvent("click", { bubbles: true, button: 0 }));
  });
  await page.goBack();
  await expect(page).not.toHaveURL(/#memory$/);
  await page.goBack();
  await expect(page).toHaveURL(/#memory$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(600);
  await page.goForward();
  await expect(page).not.toHaveURL(/#memory$/);
  await page.goForward();
  await expect(page).toHaveURL(/#memory$/);
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(900);
});

test("failed HTML and a changed build fall back to native navigation", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => (window.marker = 1));
  await page.route("**/about", async (route) => {
    if (route.request().resourceType() === "fetch") return route.abort();
    await route.continue();
  });
  await page.locator('.site-header a[href="/about"]').click();
  await expect(page.getByRole("heading", { name: "About Trevor Hartman" })).toBeVisible();
  expect(await page.evaluate(() => window.marker)).toBeUndefined();
  await page.unroute("**/about");
  await page.evaluate(() => (window.marker = 2));
  await page.route("**/glossary", async (route) => {
    if (route.request().resourceType() !== "fetch") return route.continue();
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /name="site-build" content="[^"]+"/,
        'name="site-build" content="changed"',
      ),
    });
  });
  await page.locator('.site-header a[href="/glossary"]').click();
  await expect(page.getByRole("heading", { level: 1, name: "Glossary" })).toBeVisible();
  expect(await page.evaluate(() => window.marker)).toBeUndefined();
});
