import { test, expect } from "@playwright/test";
const key = "devth:hover-preferences:v1";
async function menu(page) {
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(dialog.getByLabel("Structure", { exact: true })).toBeVisible();
  return dialog;
}
test("defaults to random generation, rerolls each hover but not each frame", async ({ page }) => {
  await page.goto("/");
  const about = page.locator('.site-header a[href="/about"]');
  await about.hover();
  const sigil = page.locator(".link-sigil");
  await expect(sigil).toBeVisible();
  await expect(sigil).toHaveAttribute("data-generating", "");
  const first = await sigil.getAttribute("data-structure");
  await page.waitForTimeout(400);
  await expect(sigil).toHaveAttribute("data-structure", first);
  await page.mouse.move(1, 1);
  await about.hover();
  await expect(sigil).not.toHaveAttribute("data-structure", first);
  const dialog = await menu(page);
  await expect(sigil).toBeHidden();
  await expect(dialog.getByLabel("Structure", { exact: true })).toHaveValue("random");
  await expect(dialog.getByRole("switch", { name: "Generation", exact: true })).toBeChecked();
});
test("offscreen ToC targets preview at their visible link without duplicating destination art", async ({
  page,
}) => {
  await page.goto("/on-learning");
  await page.locator("[data-toc][data-enhanced] a[href='#memory']").hover();
  await expect(page.locator(".link-sigil")).toBeVisible();
  await expect(page.locator(".heading-sigil")).toBeHidden();
  await expect(page.locator("svg.link-sigil:visible, svg.heading-sigil:visible")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator(".link-sigil")).toBeHidden();
});

test("CmdK fixed structure and generation choices persist across reload and pages without breaking search", async ({
  page,
}) => {
  await page.goto("/");
  let dialog = await menu(page);
  const structure = dialog.getByLabel("Structure", { exact: true });
  await expect(structure.locator("option")).toHaveCount(16);
  await structure.selectOption("mycelium");
  await dialog.getByRole("switch", { name: "Generation", exact: true }).uncheck();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key)).toEqual({
    structure: "mycelium",
    generation: false,
  });
  await page.keyboard.press("Escape");
  const about = page.locator('.site-header a[href="/about"]');
  await about.hover();
  await expect(page.locator(".link-sigil")).toHaveAttribute("data-structure", "mycelium");
  await expect(page.locator(".link-sigil")).not.toHaveAttribute("data-generating", "");
  await page.reload();
  dialog = await menu(page);
  await expect(dialog.getByLabel("Structure", { exact: true })).toHaveValue("mycelium");
  await expect(dialog.getByRole("switch", { name: "Generation", exact: true })).not.toBeChecked();
  const query = dialog.getByRole("combobox", { name: "Search pages" });
  await query.fill("about");
  await query.press("Enter");
  await expect(page).toHaveURL(/\/about$/);
  dialog = await menu(page);
  await expect(dialog.getByLabel("Structure", { exact: true })).toHaveValue("mycelium");
  await expect(dialog.getByRole("switch", { name: "Generation", exact: true })).not.toBeChecked();
});
test("saved settings synchronize across tabs and reduced motion takes precedence without overwriting them", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const other = await context.newPage();
  await other.goto("/hover-lab");
  const dialog = await menu(page);
  await dialog.getByLabel("Structure", { exact: true }).selectOption("coral");
  await dialog.getByRole("switch", { name: "Generation", exact: true }).uncheck();
  await expect(other.getByRole("switch", { name: "Generator mode", exact: true })).toHaveAttribute(
    "aria-checked",
    "false",
  );
  await dialog.getByRole("switch", { name: "Generation", exact: true }).check();
  await expect(other.getByRole("switch", { name: "Generator mode", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await other.emulateMedia({ reducedMotion: "reduce" });
  await expect(other.getByRole("switch", { name: "Generator mode", exact: true })).toBeDisabled();
  await other.emulateMedia({ reducedMotion: "no-preference" });
  await expect(other.getByRole("switch", { name: "Generator mode", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(other.getByRole("switch", { name: "Generator mode", exact: true })).toBeEnabled();
  await page.keyboard.press("Escape");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.locator('.site-header a[href="/about"]').hover();
  await expect(page.locator(".link-sigil")).toBeHidden();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)).generation, key)).toBe(
    true,
  );
  await other.close();
});
test("malformed or blocked localStorage does not break controls, hovers or navigation", async ({
  page,
}) => {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, "{broken");
    } catch {
      /* storage may be blocked by the next reload */
    }
  }, key);
  await page.goto("/");
  let dialog = await menu(page);
  await expect(dialog.getByLabel("Structure", { exact: true })).toHaveValue("random");
  await page.keyboard.press("Escape");
  await page.addInitScript(() =>
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("Denied", "SecurityError");
      },
    }),
  );
  await page.reload();
  dialog = await menu(page);
  await dialog.getByLabel("Structure", { exact: true }).selectOption("storm");
  await page.keyboard.press("Escape");
  await page.locator('.site-header a[href="/about"]').hover();
  await expect(page.locator(".link-sigil")).toHaveAttribute("data-structure", "storm");
  await page.locator('.site-header a[href="/about"]').click();
  await expect(page).toHaveURL(/\/about$/);
});
