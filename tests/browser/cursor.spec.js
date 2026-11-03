import { test, expect } from "@playwright/test";

async function ready(page, path = "/about") {
  await page.emulateMedia({ reducedMotion: "no-preference", forcedColors: "none" });
  await page.goto(path);
}

test("minimal native cursors preserve selection and nested click targets without an overlay", async ({
  page,
}) => {
  const cursorRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/cursors/")) cursorRequests.push(request.url());
  });
  await ready(page);
  await expect(page.locator(".geometric-cursor")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-geometric-cursor");
  await expect(page.locator("body")).toHaveCSS("cursor", "auto");
  await expect(page.locator(".prose p").first()).toHaveCSS("cursor", "auto");
  await expect(page.getByRole("link", { name: "about", exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  await expect(page.locator(".brand-mark")).toHaveCSS("cursor", "pointer");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  await page.locator(".prose p").first().selectText();
  expect(await page.evaluate(() => getSelection().toString().length)).toBeGreaterThan(0);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("cursor", "auto");
  await page.getByRole("link", { name: "glossary", exact: true }).click();
  await expect(page).toHaveURL(/\/glossary$/);
  await expect(page.locator(".prose p").first()).toHaveCSS("cursor", "auto");
  expect(cursorRequests).toEqual([]);
});

test("editors, draggable elements and programmatic dialogs keep native cursor semantics", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    const host = document.createElement("div");
    host.id = "cursor-check";
    host.innerHTML =
      '<input aria-label="Cursor input"><div contenteditable="true">Edit me</div><span draggable="true">Drag me</span><button disabled>Disabled</button><dialog><p>Native dialog text</p><button>Dialog action</button><input></dialog>';
    document.body.append(host);
  });
  for (const selector of ["input", "[contenteditable]", "[draggable]"]) {
    await expect(page.locator(`#cursor-check > ${selector}`)).toHaveCSS(
      "cursor",
      /^(auto|text|default)$/,
    );
  }
  await expect(page.getByRole("button", { name: "Disabled", exact: true })).toHaveCSS(
    "cursor",
    "not-allowed",
  );
  await page.locator("#cursor-check dialog").evaluate((dialog) => dialog.showModal());
  await expect(page.locator("#cursor-check dialog p")).toHaveCSS("cursor", "auto");
  await expect(page.locator("#cursor-check dialog input")).toHaveCSS("cursor", /^(auto|text)$/);
  await expect(page.getByRole("button", { name: "Dialog action" })).toHaveCSS("cursor", "pointer");
  await page.locator("#cursor-check").evaluate((host) => host.remove());
  await page.keyboard.press("Control+k");
  const search = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(search).toBeVisible();
  const styles = await search
    .locator("*")
    .evaluateAll((nodes) => nodes.map((node) => getComputedStyle(node).cursor));
  expect(styles.some((style) => /url\(|none/.test(style))).toBe(false);
});

test("native cursors respect reduced motion and forced colors without custom assets", async ({
  page,
}) => {
  await ready(page);
  for (const media of [
    { reducedMotion: "reduce" },
    { reducedMotion: "no-preference", forcedColors: "active" },
  ]) {
    await page.emulateMedia(media);
    await expect(page.locator("body")).toHaveCSS("cursor", "auto");
    await expect(page.getByRole("button", { name: "Search", exact: true })).toHaveCSS(
      "cursor",
      "pointer",
    );
  }
});

test("minimal cursors work without JavaScript or cursor image requests", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  const cursorRequests = [];
  page.on("request", (request) => {
    if (request.url().includes("/images/cursors/")) cursorRequests.push(request.url());
  });
  await page.goto(baseURL + "/about");
  await expect(page.locator("body")).toHaveCSS("cursor", "auto");
  await expect(page.locator(".prose p").first()).toHaveCSS("cursor", "auto");
  await expect(page.getByRole("link", { name: "about", exact: true })).toHaveCSS(
    "cursor",
    "pointer",
  );
  await expect(page.locator(".geometric-cursor")).toHaveCount(0);
  expect(cursorRequests).toEqual([]);
  await context.close();
});
