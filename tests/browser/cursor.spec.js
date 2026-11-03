import { test, expect } from "@playwright/test";

async function ready(page, path = "/about") {
  await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
  await page.goto(path);
  return page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
}

test("native cursor set distinguishes layout, text and nested click targets without an overlay", async ({
  page,
}) => {
  const fine = await ready(page);
  await expect(page.locator(".geometric-cursor")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-geometric-cursor");
  if (!fine) {
    await expect(page.locator("body")).not.toHaveCSS("cursor", /images\/cursors/);
    return;
  }
  await expect(page.locator("body")).toHaveCSS("cursor", /arrow\.svg.*4 4, default$/);
  await expect(page.locator(".prose p").first()).toHaveCSS("cursor", /text\.svg.*16 24, text$/);
  await expect(page.getByRole("link", { name: "about", exact: true })).toHaveCSS(
    "cursor",
    /hand\.svg.*18 5, pointer$/,
  );
  await expect(page.locator(".brand-mark")).toHaveCSS("cursor", /hand\.svg/);
  await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCSS(
    "cursor",
    /hand\.svg/,
  );
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("cursor", /arrow\.svg/);
  await page.getByRole("link", { name: "glossary", exact: true }).click();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.locator(".prose p").first()).toHaveCSS("cursor", /text\.svg/);
  await expect(page.locator(".geometric-cursor")).toHaveCount(0);
});

test("editors, draggable elements and programmatic dialogs keep native cursor semantics", async ({
  page,
}) => {
  if (!(await ready(page))) return;
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "cursor-check";
    host.innerHTML =
      '<input aria-label="Cursor input"><div contenteditable="true">Edit me</div><span draggable="true">Drag me</span><button disabled>Disabled</button><dialog><p>Native dialog text</p><button>Dialog action</button><input></dialog>';
    document.body.append(host);
  });
  for (const selector of ["input", "[contenteditable]", "[draggable]"]) {
    await expect(page.locator(`#cursor-check > ${selector}`)).toHaveCSS("cursor", "auto");
  }
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toHaveCSS(
    "cursor",
    "not-allowed",
  );
  await page.locator("#cursor-check dialog").evaluate((dialog) => dialog.showModal());
  await expect(page.locator("#cursor-check dialog p")).toHaveCSS("cursor", "auto");
  await expect(page.locator("#cursor-check dialog input")).toHaveCSS("cursor", "auto");
  await expect(page.getByRole("button", { name: "Dialog action" })).toHaveCSS("cursor", "pointer");
  await page.locator("#cursor-check").evaluate((host) => host.remove());
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(search).toBeVisible();
  const styles = await search
    .locator("*")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).cursor));
  expect(styles.some((style) => style.includes("/images/cursors/"))).toBe(false);
});

test("reduced motion and forced colors restore native cursors", async ({ page }) => {
  await ready(page);
  for (const media of [
    { reducedMotion: "reduce" },
    { reducedMotion: "no-preference", forcedColors: "active" },
  ]) {
    await page.emulateMedia(media);
    await expect(page.locator("body")).not.toHaveCSS("cursor", /images\/cursors/);
    await expect(page.getByRole("button", { name: "Search", exact: true })).not.toHaveCSS(
      "cursor",
      /images\/cursors/,
    );
  }
});

test("cursor assets work without JavaScript and retain a keyword fallback on image failure", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await page.route("**/images/cursors/*.svg", (route) => route.abort());
  await page.goto(baseURL + "/about");
  const fine = await page.evaluate(() => matchMedia("(hover: hover) and (pointer: fine)").matches);
  if (!fine) {
    await expect(page.locator("body")).not.toHaveCSS("cursor", /images\/cursors/);
    await context.close();
    return;
  }
  await expect(page.locator("body")).toHaveCSS("cursor", /arrow\.svg.*default$/);
  await expect(page.locator(".prose p").first()).toHaveCSS("cursor", /text\.svg.*text$/);
  await expect(page.getByRole("link", { name: "about", exact: true })).toHaveCSS(
    "cursor",
    /hand\.svg.*pointer$/,
  );
  await expect(page.locator(".geometric-cursor")).toHaveCount(0);
  await context.close();
});
