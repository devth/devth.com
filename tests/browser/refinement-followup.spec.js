import { test, expect } from "@playwright/test";

test("archive has one RSS action and a quiet filter prompt", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /^RSS/ })).toHaveCount(1);
  await expect(page.getByRole("searchbox", { name: "Filter writing" })).toHaveAttribute(
    "placeholder",
    "filter",
  );
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
  await expect(page.locator(".page-bottom")).toHaveCSS("border-top-width", "0px");
  await expect(page.locator(".site-footer")).toHaveCSS("border-top-width", "0px");
});

test("year inscription is decorative and does not shift the archive", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const year = page.getByRole("heading", { name: "2025", exact: true });
  const note = year.locator(".year-note");
  await expect(note).toHaveAttribute("aria-hidden", "true");
  await expect(note).toHaveText("2025 WAS A GOOD YEAR");
  const before = await page.locator(".entry").first().boundingBox();
  await year.hover();
  if (testInfo.project.name === "mobile") {
    await expect(note).toBeHidden();
  } else {
    await expect(note).toBeVisible();
    await expect(note).toHaveCSS("writing-mode", "vertical-rl");
    const box = await note.boundingBox();
    const viewport = page.viewportSize();
    await expect(note).toHaveCSS("position", "fixed");
    await expect(note).toHaveCSS("right", "0px");
    await expect(note).toHaveCSS("font-weight", "900");
    await expect(note).toHaveCSS("opacity", "0.65");
    expect(box.x + box.width).toBeCloseTo(viewport.width, 0);
    expect(box.height).toBeGreaterThan(viewport.height * 0.75);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(
      parseFloat(await note.evaluate((element) => getComputedStyle(element).fontSize)),
    ).toBeGreaterThanOrEqual(64);
  }
  expect(await page.locator(".entry").first().boundingBox()).toEqual(before);
  if (testInfo.project.name === "desktop") {
    await page.getByRole("searchbox", { name: "Filter writing" }).fill("Iteration");
    await year.hover();
    const noteBox = await note.boundingBox();
    const footer = await page.locator(".site-footer").boundingBox();
    expect(noteBox.x).toBeGreaterThanOrEqual(footer.x + footer.width);
    expect(noteBox.x + noteBox.width).toBeCloseTo(page.viewportSize().width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(
      false,
    );
    await page.emulateMedia({ media: "print" });
    await expect(note).toBeHidden();
  }
});
