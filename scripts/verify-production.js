import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parseHTML } from "linkedom";

const read = (path) => readFileSync(join("dist", path), "utf8");
assert(!read("_headers").includes("noindex"), "Production must not inherit preview noindex");
const pages = readdirSync("dist", { recursive: true }).filter((path) => path.endsWith(".html"));
assert.equal(pages.length, 24);
for (const path of pages) {
  const document = parseHTML(read(path)).document;
  const counter = new URL(document.querySelector(".hit-counter img").getAttribute("src"));
  assert.equal(counter.origin, process.env.COUNTER_ORIGIN || "https://devth.com", path);
  assert.equal(counter.pathname, "/counter.svg", path);
  if (!["cosmos/index.html", "hover-lab/index.html", "404.html"].includes(path)) {
    assert(!document.querySelector('meta[name="robots"]')?.content.includes("noindex"), path);
  }
}
assert(!read("sitemap.xml").includes("/cosmos"));
assert(!read("sitemap.xml").includes("/hover-lab"));
console.log(
  `Verified ${pages.length} production pages: indexing, first-party counters, and sitemap.`,
);
