import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vite-plus/test";
import { parseHTML } from "linkedom";
import matter from "gray-matter";

const files = readdirSync("posts").filter((file) => /\.mdx?$/.test(file));
const read = (path) => readFileSync(join("dist", path), "utf8");
const documentFor = (path) => parseHTML(read(path)).document;

describe("static publishing contract", () => {
  it("publishes the complete writing archive, newest first", () => {
    const doc = documentFor("index.html");
    const links = [...doc.querySelectorAll(".entry-title")];
    expect(links).toHaveLength(17);
    expect(links[0].textContent).toBe("Iteration and Play");
    expect(links.at(-1).textContent).toBe("Corporate process should mirror open source");
  });

  for (const file of files) {
    const [, date, slug] = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.mdx?$/);
    it("preserves /" + slug + " as fully rendered HTML", () => {
      const { data } = matter(readFileSync(join("posts", file), "utf8"));
      const doc = documentFor(slug + "/index.html");
      expect(doc.querySelector("h1").textContent).toBe(data.title.trim());
      expect(doc.querySelector("article").textContent.length).toBeGreaterThan(200);
      expect(doc.querySelector("time").getAttribute("datetime")).toBe(date);
      expect(doc.querySelector("link[rel=canonical]").href).toBe("https://devth.com/" + slug);
      expect(read("_redirects")).toContain(
        "/" + date.slice(0, 4) + "/" + slug + " /" + slug + " 301",
      );
    });
  }

  it("retains the standalone public pages but never publishes drafts", () => {
    for (const slug of ["about", "overture", "glossary"]) {
      expect(
        documentFor(slug + "/index.html").querySelector("article").textContent.length,
      ).toBeGreaterThan(500);
    }
    expect(existsSync("dist/drafts")).toBe(false);
    expect(read("sitemap.xml")).not.toContain("next-guy");
  });

  it("has valid internal links, fragment targets, and local images on every page", () => {
    const paths = [
      "index.html",
      "404.html",
      "about/index.html",
      "overture/index.html",
      "glossary/index.html",
      "cosmos/index.html",
      ...files.map((f) => f.slice(11).replace(/\.mdx?$/, "/index.html")),
    ];
    for (const path of paths) {
      const doc = documentFor(path);
      expect(doc.querySelectorAll("h1")).toHaveLength(1);
      expect(doc.querySelector("meta[name=description]").content).toBeTruthy();
      for (const node of doc.querySelectorAll("a[href], img[src]")) {
        const href = node.getAttribute(node.tagName === "IMG" ? "src" : "href");
        if (!href || /^(https?:|mailto:)/.test(href)) continue;
        const url = new URL(href, "https://devth.com/" + path.replace(/index.html$/, ""));
        const dest = decodeURIComponent(url.pathname);
        const target =
          dest === "/"
            ? "index.html"
            : dest.includes(".")
              ? dest.slice(1)
              : dest.replace(/^\/|\/$/g, "") + "/index.html";
        expect(existsSync(join("dist", target)), path + " → " + href).toBe(true);
        if (url.hash && target.endsWith(".html")) {
          expect(
            documentFor(target).getElementById(decodeURIComponent(url.hash.slice(1))),
            path + " → " + href,
          ).not.toBeNull();
        }
        if (node.tagName === "IMG")
          expect(node.hasAttribute("alt"), path + ": image alt").toBe(true);
      }
    }
  });

  it("gives every page a real, distinct, no-JavaScript hit counter", () => {
    for (const [path, page] of [
      ["index.html", "/"],
      ["404.html", "/404"],
      ["cosmos/index.html", "/cosmos"],
      ["about/index.html", "/about"],
      ...files.map((file) => {
        const slug = file.slice(11).replace(/\.mdx?$/, "");
        return [slug + "/index.html", "/" + slug];
      }),
    ]) {
      const img = documentFor(path).querySelector(".hit-counter img");
      expect(img).not.toBeNull();
      expect(new URL(img.src).searchParams.get("page")).toBe(page);
      expect(img.getAttribute("referrerpolicy")).toBe("no-referrer");
      expect(img.hasAttribute("loading")).toBe(false);
    }
  });

  it("isolates the 3D experiment and keeps its runtime off normal pages", () => {
    const home = documentFor("index.html");
    const lab = documentFor("cosmos/index.html");
    expect(lab.querySelector("canvas")).not.toBeNull();
    expect(lab.querySelector(".cosmos-fallback title").textContent).toContain("ribbon");
    expect(lab.querySelector("meta[name=robots]").content).toContain("noindex");
    expect(read("sitemap.xml")).not.toContain("/cosmos");
    expect(home.querySelectorAll("script[src]")).toHaveLength(1);
    const labScript = lab.querySelector("script[src]").src.slice(1);
    const homeScript = home.querySelector("script[src]").src.slice(1);
    expect(labScript).not.toBe(homeScript);
    expect(Buffer.byteLength(read(labScript))).toBeGreaterThan(100_000);
    expect(Buffer.byteLength(read(homeScript))).toBeLessThan(10_000);
    expect(home.querySelector('link[rel="modulepreload"]')).toBeNull();
    expect(home.querySelector('nav[aria-label="Main navigation"]').textContent).not.toContain(
      "Cosmos",
    );
  });

  it("generates a feed, sitemap, and a real 404 instead of an SPA fallback", () => {
    const feed = read("feed.xml");
    expect(feed.match(/<item>/g) || []).toHaveLength(17);
    expect(read("sitemap.xml")).toContain("https://devth.com/glossary");
    expect(documentFor("404.html").querySelector("h1").textContent).toBe("Nothing here.");
    expect(read("robots.txt")).toContain("Sitemap: https://devth.com/sitemap.xml");
  });
});
