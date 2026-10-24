import { test, expect } from "@playwright/test";

test("production is indexable, readable without JS, and uses its own first-party counter", async ({
  page,
  request,
}) => {
  const response = await page.goto("/");
  expect(response.status()).toBe(200);
  expect(response.headers()["x-robots-tag"]).toBeUndefined();
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  await expect(page.locator(".entry-title")).toHaveCount(17);
  const image = page.locator(".hit-counter img");
  await expect(image).toHaveAttribute("src", "http://127.0.0.1:4175/counter.svg?page=%2F");
  await expect(image).toHaveJSProperty("naturalWidth", 126);
  const article = await request.get("/beautiful-constraint");
  expect(article.status()).toBe(200);
  expect(article.headers()["x-robots-tag"]).toBeUndefined();
  const missing = await request.get("/not-a-published-page");
  expect(missing.status()).toBe(404);
  const legacy = await request.get("/2025/iteration-and-play", { maxRedirects: 0 });
  expect(legacy.status()).toBe(301);
  expect(legacy.headers().location).toBe("/iteration-and-play");
});

test("production counter persists atomic increments and HEAD does not count", async ({
  request,
}) => {
  const path = "/counter.svg?page=%2Foverture";
  const before = await request.head(path);
  const initial = Number(before.headers()["x-page-views"]);
  expect(before.status()).toBe(200);
  expect(before.headers()["cache-control"]).toBe("no-store, max-age=0");
  const visits = await Promise.all([request.get(path), request.get(path)]);
  expect(
    visits.map((response) => Number(response.headers()["x-page-views"])).sort((a, b) => a - b),
  ).toEqual([initial + 1, initial + 2]);
  expect((await request.head(path)).headers()["x-page-views"]).toBe(String(initial + 2));
  expect((await request.head("/counter.svg?page=%2Funknown")).status()).toBe(404);
});

test("www redirects permanently to HTTPS apex while preserving path and query", async ({
  request,
}) => {
  const response = await request.get("http://127.0.0.1:4176/beautiful-constraint?from=www", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("https://devth.com/beautiful-constraint?from=www");
});
