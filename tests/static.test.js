import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { describe, it, expect } from "vite-plus/test";
import { parseHTML } from "linkedom";
import matter from "gray-matter";

const files = readdirSync("posts").filter((file) => /\.mdx?$/.test(file));
const read = (path) => readFileSync(join("dist", path), "utf8");
const documentFor = (path) => parseHTML(read(path)).document;
const originalCopy = JSON.parse(readFileSync("tests/fixtures/original-copy.json", "utf8"));
const normalizeText = (text) => text.replace(/\s+/g, " ").trim();

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

  it("retains the original authored words, titles and excerpts without editorial additions", () => {
    for (const [slug, original] of Object.entries({
      ...originalCopy.posts,
      ...originalCopy.pages,
    })) {
      const doc = documentFor(slug + "/index.html");
      expect(doc.querySelector("h1").textContent, slug).toBe(original.title);
      const body = normalizeText(doc.querySelector("article").textContent);
      expect(createHash("sha256").update(body).digest("hex"), slug).toBe(original.bodySha256);
      if (original.excerpt) {
        expect(doc.querySelector(".article-deck").textContent, slug).toBe(original.excerpt);
        expect(doc.querySelector("meta[name=description]").content, slug).toBe(original.excerpt);
      }
    }
    for (const link of documentFor("index.html").querySelectorAll(".entry-link")) {
      const original = originalCopy.posts[link.getAttribute("href").slice(1)];
      expect(link.querySelector(".entry-title").textContent).toBe(original.title);
      expect(link.querySelector(".entry-body p").textContent).toBe(original.excerpt);
    }
  });

  it("keeps the homepage an archive, uses original metadata and removes invented asides", () => {
    const home = documentFor("index.html");
    expect(home.querySelector("main").children).toHaveLength(1);
    expect(home.querySelector("main > section").id).toBe("writing");
    expect(home.querySelector("meta[name=description]").content).toBe(originalCopy.description);
    expect(read("feed.xml")).toContain(
      "<description>" + originalCopy.description + "</description>",
    );
    expect(home.querySelector(".site-footer").textContent).toContain("Trevor C. Hartman");
    expect(home.querySelector(".site-footer a[href*=Soli_Deo_gloria]").textContent).toBe(
      "Soli Deo Gloria",
    );
    for (const slug of ["about", "overture", "glossary"]) {
      const doc = documentFor(slug + "/index.html");
      expect(doc.querySelector(".reading-aside")).toBeNull();
      expect(doc.querySelector(".article-kicker")).toBeNull();
      if (slug !== "glossary") {
        expect(normalizeText(doc.querySelector("article p").textContent)).toContain(
          doc.querySelector("meta[name=description]").content,
        );
      }
    }
    const cosmos = documentFor("cosmos/index.html");
    expect(cosmos.querySelector("h1").textContent).toBe("Cosmos");
    expect(cosmos.querySelector(".cosmos-heading").textContent.trim()).toBe("Cosmos");
    expect(cosmos.querySelector(".cosmos-colophon").textContent.trim()).toBe("Home ↗");
  });

  it("uses the approved tagline and lowercase navigation with real category links", () => {
    const home = documentFor("index.html");
    expect(home.querySelector(".brand-tagline").textContent).toBe("work in progress");
    for (const link of home.querySelectorAll(".site-header nav a")) {
      expect(link.textContent).toBe(link.textContent.toLowerCase());
    }
    for (const category of home.querySelectorAll(".category-link")) {
      expect(new URL(category.href, "https://devth.com").searchParams.get("category")).toBeTruthy();
      expect(category.closest(".entry-link")).toBeNull();
    }
  });

  it("uses a static decorative graph everywhere and the large home brand instead of Writing", () => {
    const home = documentFor("index.html");
    expect(home.querySelector("h1").textContent).toBe("devth_");
    expect(home.querySelector("#writing h1")).toBeNull();
    for (const path of [
      "index.html",
      "about/index.html",
      "cosmos/index.html",
      "beautiful-constraint/index.html",
      "404.html",
    ]) {
      const graph = documentFor(path).querySelector(".page-graph");
      expect(graph.getAttribute("aria-hidden")).toBe("true");
      expect(graph.querySelectorAll(".graph-node")).toHaveLength(44);
      expect(graph.querySelectorAll("line").length).toBeGreaterThan(44);
    }
  });

  it("indexes original titles and excerpts for lazy global search", () => {
    const index = JSON.parse(read("search.json"));
    expect(index).toHaveLength(22);
    for (const [slug, original] of Object.entries(originalCopy.posts)) {
      expect(index.find((page) => page.path === "/" + slug)).toMatchObject({
        title: original.title,
        excerpt: original.excerpt,
      });
    }
    expect(documentFor("index.html").querySelector("#quick-nav")).not.toBeNull();
  });

  it("derives contents links from the original heading fragments", () => {
    for (const slug of [
      "beautiful-constraint",
      "compiled-queries-in-scala",
      "glossary",
      "overture",
    ]) {
      const doc = documentFor(slug + "/index.html");
      const headings = [...doc.querySelectorAll("article h2, article h3, article h4")];
      const links = [...doc.querySelectorAll(".article-toc a")];
      expect(links).toHaveLength(headings.length);
      links.forEach((link, index) => {
        expect(link.getAttribute("href")).toBe("#" + headings[index].id);
        expect(link.textContent).toBe(headings[index].textContent);
      });
    }
  });

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
    expect(lab.querySelector(".cosmos-fallback")).toBeNull();
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

  it("deploys only the preview hostname and preserves the counter account", () => {
    const config = (path) => JSON.parse(readFileSync(path, "utf8").replace(/,(\s*[}\]])/g, "$1"));
    const site = config("wrangler.jsonc");
    expect(site.account_id).toBe("ab80ed3a83c85462eff2a15e7b38a884");
    expect(site.routes).toEqual([{ pattern: "preview.devth.com", custom_domain: true }]);
    expect(site.workers_dev).toBe(false);
    expect(site.preview_urls).toBe(false);
    const counter = config("wrangler.counter.jsonc");
    expect(counter.account_id).toBe("f1ca5a657f85b1dfa8e4ce92a64aa3db");
    expect(counter.name).toBe("devth-hit-counter-preview");
  });

  it("generates a feed, sitemap, and a real 404 instead of an SPA fallback", () => {
    const feed = read("feed.xml");
    expect(feed.match(/<item>/g) || []).toHaveLength(17);
    expect(read("sitemap.xml")).toContain("https://devth.com/glossary");
    expect(documentFor("404.html").querySelector("h1").textContent).toBe("Page not found");
    expect(read("robots.txt")).toContain("Sitemap: https://devth.com/sitemap.xml");
  });
});
