import { test, expect } from "@playwright/test";

const origin =
  process.env.COUNTER_ORIGIN ||
  (process.env.BASE_URL
    ? "https://devth-hit-counter-preview.devth.workers.dev"
    : "http://127.0.0.1:4174");
const counter = (page) => origin + "/counter.svg?page=" + encodeURIComponent(page);

test("counter increments atomically, keeps pages separate, and cannot be cached", async ({
  request,
}) => {
  const baseline = await request.head(counter("/on-learning"));
  expect(baseline.status()).toBe(200);
  const before = Number(baseline.headers()["x-page-views"]);
  const untouched = await request.head(counter("/dumb-yaml-ci"));
  const responses = await Promise.all(
    Array.from({ length: 8 }, () => request.get(counter("/on-learning"))),
  );
  const counts = responses
    .map((response) => Number(response.headers()["x-page-views"]))
    .sort((a, b) => a - b);
  expect(counts).toEqual(Array.from({ length: 8 }, (_, i) => before + i + 1));
  for (const response of responses) {
    expect(response.headers()["cache-control"]).toContain("no-store");
    expect(response.headers()["content-type"]).toContain("image/svg+xml");
    const svg = await response.text();
    expect(svg).toContain("<title>" + response.headers()["x-page-views"] + " page views</title>");
    expect(svg).toContain(String(response.headers()["x-page-views"]).padStart(7, "0") + "</text>");
    expect(svg).toContain('<path class="signal"');
    expect(svg).toContain('<path class="ticks"');
    expect(svg).toContain("prefers-color-scheme:dark");
    expect(svg).not.toContain("<rect");
    expect(svg).not.toContain('font-style="italic"');
  }
  const final = await request.head(counter("/on-learning"));
  expect(Number(final.headers()["x-page-views"])).toBe(before + 8);
  const otherPage = await request.head(counter("/dumb-yaml-ci"));
  expect(otherPage.headers()["x-page-views"]).toBe(untouched.headers()["x-page-views"]);
});

test("counter rejects unknown pages and unsupported methods", async ({ request }) => {
  expect((await request.get(counter("/not-a-published-page"))).status()).toBe(404);
  expect((await request.get(origin + "/unrelated")).status()).toBe(404);
  const response = await request.post(counter("/about"));
  expect(response.status()).toBe(405);
  expect(response.headers().allow).toBe("GET, HEAD");
});

test("counter failure does not break the writing or navigation", async ({ page }) => {
  await page.route("**/counter.svg?*", (route) => route.abort());
  await page.goto("/iteration-and-play");
  await expect(page.getByRole("article")).toContainText("Engineers should be having fun.");
  await page.getByRole("link", { name: "about", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Trevor Hartman");
});
