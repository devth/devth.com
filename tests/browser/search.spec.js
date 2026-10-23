import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("Cmd+K searches original titles and navigates from an article", async ({ page }) => {
  const indexRequests = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/search.json") indexRequests.push(request.url());
  });
  await page.goto("/iteration-and-play");
  expect(indexRequests).toHaveLength(0);
  await page.keyboard.press("Meta+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(dialog).toBeVisible();
  const query = dialog.getByRole("combobox", { name: "Search pages" });
  await expect(query).toBeFocused();
  await query.fill("monorepo");
  await expect(dialog.getByRole("option")).toHaveCount(1);
  await expect(dialog.getByRole("option")).toContainText("You might not want a Monorepo");
  expect(indexRequests).toHaveLength(1);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(accessibility.violations).toEqual([]);
  await query.press("Enter");
  await expect(page).toHaveURL(/\/you-might-not-want-a-monorepo$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("You might not want a Monorepo");
});

test("Ctrl+K works over fullscreen Cosmos, arrows select and Escape restores focus", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/cosmos?seed=123");
  const trigger = page.getByRole("button", { name: "Search", exact: true });
  await trigger.focus();
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  const query = dialog.getByRole("combobox", { name: "Search pages" });
  await expect(query).toBeFocused();
  await expect(dialog.getByRole("option")).toHaveCount(22);
  await query.press("ArrowDown");
  await expect(dialog.getByRole("option", { name: /^About Trevor Hartman/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await query.press("ArrowUp");
  await expect(dialog.getByRole("option", { name: /^Writing/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await query.fill("no-matching-page-123456");
  await expect(dialog.getByRole("status")).toHaveText("No matching pages.");
  await expect(dialog.getByRole("option")).toHaveCount(0);
  await query.fill("about");
  await expect(dialog.getByRole("option", { name: /^About Trevor Hartman/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("quick-search.png") });
  await query.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(query).toBeFocused();
  await expect(query).toHaveValue("");
  await dialog.getByRole("button", { name: "Close search" }).click();
  await expect(trigger).toBeFocused();
});

test("unavailable search leaves normal navigation usable", async ({ page }) => {
  await page.route("**/search.json", (route) => route.abort());
  await page.goto("/overture");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(dialog.getByRole("status")).toHaveText("Search unavailable.");
  await dialog.getByRole("link", { name: "home", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Writing" })).toBeVisible();
});
