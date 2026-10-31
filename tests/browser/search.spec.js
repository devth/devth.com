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
  await expect(dialog.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(1);
  await expect(dialog.getByRole("listbox", { name: "Pages" }).getByRole("option")).toContainText(
    "You might not want a Monorepo",
  );
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
  await expect(dialog.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(23);
  await query.press("ArrowDown");
  await expect(
    dialog
      .getByRole("listbox", { name: "Pages" })
      .getByRole("option", { name: /^About Trevor Hartman/ }),
  ).toHaveAttribute("aria-selected", "true");
  await query.press("ArrowUp");
  await expect(
    dialog.getByRole("listbox", { name: "Pages" }).getByRole("option", { name: /^Writing/ }),
  ).toHaveAttribute("aria-selected", "true");
  await query.fill("no-matching-page-123456");
  await expect(dialog.getByRole("status")).toHaveText("No matching pages.");
  await expect(dialog.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Clear search", exact: true }).click();
  await expect(query).toBeFocused();
  await expect(query).toHaveValue("");
  await expect(dialog.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(23);
  await expect(dialog.getByRole("button", { name: "Clear search", exact: true })).toBeHidden();
  await query.fill("about");
  await expect(
    dialog
      .getByRole("listbox", { name: "Pages" })
      .getByRole("option", { name: /^About Trevor Hartman/ }),
  ).toBeVisible();
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

test("Ctrl+N/P selects next and previous search results without changing the query", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Meta+k");
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  const query = dialog.getByRole("combobox", { name: "Search pages" });
  const selected = dialog.locator('[role="option"][aria-selected="true"]');
  await expect(dialog.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(23);
  await query.press("Control+n");
  await expect(selected).toContainText("About Trevor Hartman");
  await query.press("Control+n");
  await expect(selected).toContainText("Overture");
  await query.press("Control+p");
  await expect(selected).toContainText("About Trevor Hartman");
  await query.press("Control+p");
  await expect(selected).toContainText("Writing");
  await query.press("Control+p");
  await expect(selected).toHaveAttribute("href", "/hover-lab");
  await expect(selected.locator(":scope > span")).toHaveText("Hover Lab");
  await query.press("Control+n");
  await expect(selected).toContainText("Writing");
  await expect(query).toHaveValue("");
  await expect(query).toBeFocused();
  await query.press("Control+n");
  await query.press("Enter");
  await expect(page).toHaveURL(/\/about$/);
});

test("unavailable search leaves normal navigation usable", async ({ page }) => {
  await page.route("**/search.json", (route) => route.abort());
  await page.goto("/overture");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Search", exact: true });
  await expect(dialog.getByRole("status")).toHaveText("Search unavailable.");
  await dialog.getByRole("link", { name: "Browse writing", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "devth", exact: true })).toBeVisible();
});
