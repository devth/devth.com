import { readFileSync } from "node:fs";
import { describe, it, expect } from "vite-plus/test";

const config = (path) => JSON.parse(readFileSync(path, "utf8").replace(/,(\s*[}\]])/g, "$1"));

describe("production publishing", () => {
  it("keeps production indexable and preview noindex without losing security headers", async () => {
    const { publishingSettings } = await import("../scripts/publishing.js");
    const production = publishingSettings("production");
    const preview = publishingSettings();
    expect(production.headers).not.toContain("noindex");
    expect(preview.headers).toContain("X-Robots-Tag: noindex");
    for (const settings of [production, preview]) {
      expect(settings.headers).toContain("X-Content-Type-Options: nosniff");
      expect(settings.headers).toContain("X-Frame-Options: DENY");
      expect(settings.headers).toContain("max-age=31536000, immutable");
    }
    expect(production.counterOrigin).toBe("https://devth.com");
    expect(preview.counterOrigin).toBe("https://devth-hit-counter-preview.devth.workers.dev");
    expect(publishingSettings("production", "http://127.0.0.1:4175").counterOrigin).toBe(
      "http://127.0.0.1:4175",
    );
    expect(() => publishingSettings("typo")).toThrow();
  });

  it("uses a fresh production namespace and runs code only for counter requests", () => {
    const production = config("wrangler.production.jsonc");
    expect(production.account_id).toBe("ab80ed3a83c85462eff2a15e7b38a884");
    expect(production.name).toBe("devth-com");
    expect(production.routes).toEqual([{ pattern: "devth.com", custom_domain: true }]);
    expect(production.workers_dev).toBe(false);
    expect(production.preview_urls).toBe(false);
    expect(production.assets.run_worker_first).toEqual(["/counter.svg"]);
    expect(production.assets.not_found_handling).toBe("404-page");
    expect(production.durable_objects.bindings).toEqual([
      { name: "COUNTERS", class_name: "PageCounter" },
    ]);
    expect(production.migrations).toEqual([{ tag: "v1", new_sqlite_classes: ["PageCounter"] }]);
  });

  it("limits the redirect Worker to www without touching preview", () => {
    const redirect = config("wrangler.www.jsonc");
    expect(redirect.account_id).toBe("ab80ed3a83c85462eff2a15e7b38a884");
    expect(redirect.routes).toEqual([{ pattern: "www.devth.com", custom_domain: true }]);
    expect(redirect.workers_dev).toBe(false);
    expect(redirect.preview_urls).toBe(false);
  });

  for (const [source, destination] of [
    ["https://www.devth.com/", "https://devth.com/"],
    [
      "https://www.devth.com/beautiful-constraint?from=www",
      "https://devth.com/beautiful-constraint?from=www",
    ],
    [
      "http://www.devth.com:8080/a%20b/?category=dev%20ops",
      "https://devth.com/a%20b/?category=dev%20ops",
    ],
  ]) {
    it("preserves path and query in the permanent www redirect: " + source, async () => {
      const { default: redirect } = await import("../production/redirect.js");
      const response = redirect.fetch(new Request(source));
      expect(response.status).toBe(308);
      expect(response.headers.get("Location")).toBe(destination);
    });
  }
});
