import { test, expect } from "@playwright/test";

test("archive has one RSS action and no inline filter", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^RSS/ })).toHaveCount(1);
  await expect(page.getByRole("searchbox", { name: "Filter writing" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeVisible();
});

test("typeclass further reading links to the author's original article", async ({ page }) => {
  await page.goto("/a-simple-type-class");
  await expect(
    page.getByRole("link", { name: "Introduction to Typeclasses in Scala (2013)", exact: true }),
  ).toHaveAttribute(
    "href",
    "https://github.com/tpolecat/tpolecat.github.io/blob/master/_posts/2013-10-12-typeclass.md",
  );
});

test("reading footer has no divider rules", async ({ page }) => {
  await page.goto("/about");
  await expect(page.locator(".page-bottom")).toHaveCount(0);
  await expect(page.locator(".site-footer")).toHaveCSS("border-top-width", "0px");
});

test("reading pages use the shared navigation instead of redundant back links", async ({
  page,
}) => {
  for (const route of ["/about", "/iteration-and-play"]) {
    await page.goto(route);
    await expect(page.locator(".back-link, .page-bottom")).toHaveCount(0);
    await expect(
      page.locator(".site-header nav").getByRole("link", { name: "writing", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to top", exact: true })).toHaveAttribute(
      "href",
      "#top",
    );
  }
  await expect(page.getByRole("navigation", { name: "More writing" })).toBeVisible();
  await expect(page.getByRole("link", { name: /older post/ })).toBeVisible();
});

test("hovering a year activates its titles together and unwinds without shifting the archive", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      "devth:hover-preferences:v1",
      JSON.stringify({ structure: "double", generation: true }),
    ),
  );
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator(".year-note")).toHaveCount(0);
  const id = await page
    .locator(".year-group")
    .evaluateAll(
      (groups) =>
        [...groups]
          .sort(
            (a, b) => b.querySelectorAll(".entry").length - a.querySelectorAll(".entry").length,
          )[0]
          .querySelector(".year").id,
    );
  const group = page.locator(`.year-group[aria-labelledby="${id}"]`);
  await group.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  const links = group.locator(".entry-link");
  const count = await links.evaluateAll(
    (elements) =>
      elements.filter((element) => {
        const range = document.createRange();
        range.selectNodeContents(element.querySelector(".entry-title"));
        const bounds = range.getBoundingClientRect();
        return bounds.bottom > 0 && bounds.top < innerHeight;
      }).length,
  );
  expect(count).toBeGreaterThan(1);
  const before = await group.boundingBox();
  await group.locator(".year").hover();
  await expect(group.locator(".entry-link.link-distortion")).toHaveCount(count);
  await expect(page.locator(".entry-link.link-distortion")).toHaveCount(count);
  await expect(page.locator('.link-sigil.is-visible[data-structure="double"]')).toHaveCount(count);
  await page.clock.pauseAt(new Date(Date.now() + 50));
  await page.clock.runFor(900);
  expect(await group.boundingBox()).toEqual(before);
  await page.screenshot({ path: testInfo.outputPath("year-hover.png") });
  await page.mouse.move(0, 0);
  await expect(page.locator(".entry-link.link-distortion")).toHaveCount(0);
  await page.clock.runFor(400);
  await expect(page.locator(".link-sigil:not([hidden])")).toHaveCount(count);
  await page.clock.runFor(450);
  await expect(page.locator(".link-sigil:not([hidden])")).toHaveCount(0);
});

test("year previews respect filtered entries, reduced motion and navigation cleanup", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".entry-meta a").first().click();
  await expect(page.locator("[data-category-filter]")).toBeVisible();
  const group = page.locator(".year-group:not([hidden])").first();
  await group.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await group.locator(".year").hover();
  await expect(
    group.locator(".entry:not([hidden]) .entry-link.link-distortion").first(),
  ).toBeVisible();
  await expect(page.locator(".entry[hidden] .link-distortion")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".link-sigil:not([hidden])")).toHaveCount(0);
  await page.mouse.move(0, 0);
  await group.locator(".year").hover();
  await expect(page.locator(".link-sigil:not([hidden])")).toHaveCount(0);
  await page.locator(".site-header nav").getByRole("link", { name: "about", exact: true }).click();
  await expect(page.locator("main")).toHaveAttribute("data-page-class", "about-page");
  await expect(page.locator(".link-sigil")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page
    .locator(".site-header nav")
    .getByRole("link", { name: "writing", exact: true })
    .click();
  const returned = page.locator(".year-group").first();
  await returned.evaluate((element) =>
    element.scrollIntoView({ block: "center", behavior: "instant" }),
  );
  await returned.locator(".year").hover();
  await expect(returned.locator(".entry-link.link-distortion").first()).toBeVisible();
});
