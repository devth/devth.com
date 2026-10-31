import { test, expect } from "@playwright/test";

const collapseDialog = (page) => page.getByRole("dialog", { name: "page collapse", exact: true });

test("footer content tumbles in three dimensions and Escape restores the same real page without counter reloads", async ({
  page,
}) => {
  const errors = [],
    counts = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.url().includes("/counter.svg") && request.method() === "GET")
      counts.push(request.url());
  });
  await page.clock.install();
  await page.goto("/");
  const button = page
    .locator(".site-footer")
    .getByRole("button", { name: "don't press this", exact: true });
  await expect(button).toBeVisible();
  await expect(page.getByRole("img", { name: "Page hit counter" })).toHaveJSProperty(
    "complete",
    true,
  );
  await page.evaluate(() => {
    window.realShell = document.querySelector(".site-shell");
    window.realMain = document.querySelector("main");
    window.realCounter = document.querySelector(".hit-counter img");
  });
  const initialRequests = [...counts];
  await button.click();
  const dialog = collapseDialog(page);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "restore", exact: true })).toBeFocused();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.clock.runFor(1800);
  await expect.poll(() => page.locator(".demolition-piece").count()).toBeGreaterThan(0);
  expect(
    await page.locator(".demolition-piece").evaluateAll((elements) =>
      elements.some((element) => {
        const matrix = new DOMMatrix(getComputedStyle(element).transform);
        return (
          Math.abs(matrix.m13) +
            Math.abs(matrix.m23) +
            Math.abs(matrix.m31) +
            Math.abs(matrix.m32) >
          0.01
        );
      }),
    ),
  ).toBe(true);
  expect(await page.locator(".demolition-piece").count()).toBeLessThanOrEqual(160);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(button).toBeFocused();
  expect(
    await page.evaluate(
      () =>
        window.realShell === document.querySelector(".site-shell") &&
        window.realMain === document.querySelector("main") &&
        window.realCounter === document.querySelector(".hit-counter img"),
    ),
  ).toBe(true);
  expect(counts).toEqual(initialRequests);
  expect(errors).toEqual([]);
});

test("the bottom Cmd+K action crumbles away to i told you and stays until restored with the search state intact", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.install();
  await page.goto("/");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const menu = page.getByRole("dialog", { name: "Search", exact: true });
  const query = menu.getByRole("combobox", { name: "Search pages" });
  await expect(menu.getByRole("listbox", { name: "Pages" }).getByRole("option")).toHaveCount(23);
  await query.fill("glossary");
  await expect(menu.getByRole("listbox", { name: "Pages" })).toContainText("Glossary");
  const button = menu.getByRole("button", { name: "don't press this", exact: true });
  await expect(button).toBeVisible();
  expect(
    await button.evaluate((element) => element === element.parentElement.lastElementChild),
  ).toBe(true);
  await button.click();
  const dialog = collapseDialog(page);
  await expect(dialog).toBeVisible();
  await page.clock.pauseAt(new Date(Date.now() + 100));
  await page.keyboard.press("Control+k");
  await expect(dialog).toBeVisible();
  await expect(menu).toBeHidden();
  await page.clock.runFor(26_000);
  await expect(dialog.getByRole("status")).toHaveText("i told you");
  await expect(page.locator(".demolition-piece")).toHaveCount(0);
  await page.clock.runFor(60_000);
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "restore", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(menu).toBeVisible();
  await expect(query).toHaveValue("glossary");
  await expect(button).toBeFocused();
  expect(errors).toEqual([]);
});
