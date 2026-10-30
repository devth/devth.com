import { mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { loadContent } from "./content.js";
import { writeMcpContent } from "./mcp-content.js";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { slug as slugify } from "github-slugger";
import { createHighlighter } from "shiki";
import { cosmosBody } from "./cosmos-page.js";
import { hoverBody } from "./hover-page.js";
import { parseHTML } from "linkedom";
import { background } from "./background.js";
import { publishingSettings } from "./publishing.js";
import { preserveCase } from "../src/lettercase.js";

const publishing = publishingSettings(process.env.SITE_ENV, process.env.COUNTER_ORIGIN);

const origin = "https://devth.com";
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, ".site");
const description = "The blog of Trevor Hartman";
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char],
  );
const highlighter = await createHighlighter({
  themes: ["github-light-high-contrast", "github-dark-high-contrast"],
  langs: [
    "bash",
    "clojure",
    "haskell",
    "java",
    "javascript",
    "json",
    "scala",
    "sql",
    "typescript",
    "yaml",
  ],
});
const markdown = new MarkdownIt({
  html: true,
  linkify: true,
  highlight(code, language) {
    const lang = highlighter.getLoadedLanguages().includes(language) ? language : "text";
    return highlighter.codeToHtml(code, {
      lang,
      themes: { light: "github-light-high-contrast", dark: "github-dark-high-contrast" },
    });
  },
}).use(anchor, { slugify, permalink: anchor.permalink.headerLink({ safariReaderFix: true }) });

function dateLabel(date) {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  }).format(new Date(date));
}

function preserveLiteralCase(html) {
  const { document } = parseHTML(html);
  preserveCase(document.body);
  return document.toString();
}

function layout({
  title,
  slug = "",
  excerpt = description,
  body,
  article = false,
  date,
  noindex = false,
}) {
  const pageTitle = slug ? `${title} — devth` : "devth — Trevor Hartman";
  const counter = new URL("/counter.svg", publishing.counterOrigin);
  counter.searchParams.set("page", slug ? `/${slug}` : "/");
  const nav = [
    ["/", "writing"],
    ["/about", "about"],
    ["/overture", "overture"],
    ["/glossary", "glossary"],
  ];
  return preserveLiteralCase(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escape(pageTitle)}</title>
  <meta name="description" content="${escape(excerpt)}">
  <meta name="author" content="Trevor Hartman">
  ${noindex ? '<meta name="robots" content="noindex, follow">' : ""}
  <link rel="canonical" href="${origin}${slug ? `/${slug}` : "/"}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="devth — Trevor Hartman" href="/feed.xml" vite-ignore>
  <meta property="og:title" content="${escape(pageTitle)}">
  <meta property="og:description" content="${escape(excerpt)}">
  <meta property="og:type" content="${article ? "article" : "website"}">
  <meta property="og:url" content="${origin}${slug ? `/${slug}` : "/"}">
  <meta property="og:site_name" content="devth">
  ${date ? `<meta property="article:published_time" content="${date}">` : ""}
  <link rel="stylesheet" href="/style.css">
  <script type="module" src="/main.js"></script>
  ${slug === "cosmos" ? '<link rel="stylesheet" href="/cosmos.css"><script type="module" src="/cosmos.js"></script>' : ""}
  ${slug === "hover-lab" ? '<link rel="stylesheet" href="/hover-lab.css"><script type="module" src="/hover-lab.js"></script>' : ""}
</head>
<body id="top"${slug === "cosmos" ? ' class="cosmos-page"' : slug === "" ? ' class="home-page"' : slug === "about" ? ' class="about-page"' : ""}>
  ${background}
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="devth home"><${slug === "" ? "h1" : "span"} class="brand-mark">devth<span aria-hidden="true">_</span></${slug === "" ? "h1" : "span"}><span class="brand-tagline">work in progress</span></a>
      <nav aria-label="Main navigation">${nav.map(([href, label]) => `<a href="${href}"${href === `/${slug}` ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <button class="header-search" type="button" data-quick-nav-trigger aria-label="Search" aria-haspopup="dialog" aria-controls="quick-nav" aria-keyshortcuts="Meta+K Control+K" hidden><span aria-hidden="true">⌕</span><span class="header-search-label">search</span><kbd aria-hidden="true">⌘K</kbd></button>
    </header>
    <main id="main" tabindex="-1">${body}</main>
    <footer class="site-footer">
      <p>© ${new Date().getFullYear()} Trevor C. Hartman<br><a href="https://grokipedia.com/page/Soli_Deo_gloria">Soli Deo Gloria</a></p>
      <span class="hit-counter" title="Page loads, not unique visitors. No cookies."><span>HITS</span><img src="${escape(counter.href)}" width="126" height="24" alt="Page hit counter" referrerpolicy="no-referrer"></span>
      <div><a href="/cosmos">Cosmos ◇</a><a href="/hover-lab">Hover Lab ↗</a><a href="/feed.xml">RSS ↗</a><a href="https://github.com/devth/devth.com">view source ↗</a><a class="footer-social" href="https://x.com/devth" aria-label="X profile"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.64 7.584H.47l8.6-9.835L0 1.154h7.594l5.243 6.932 6.064-6.933zm-1.29 19.49h2.039L6.486 3.24H4.298z"/></svg></a><a class="footer-social" href="https://github.com/devth" aria-label="GitHub profile"><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg></a><a href="#top" aria-label="Back to top">↑ Top</a></div>
    </footer>
  </div>
  <dialog id="quick-nav" class="quick-nav" aria-labelledby="quick-nav-title">
    <h2 id="quick-nav-title" class="sr-only">Search</h2>
    <div class="quick-nav-input"><label class="sr-only" for="quick-nav-query">Search pages</label><input id="quick-nav-query" type="search" role="combobox" placeholder="find" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-expanded="true" aria-controls="quick-nav-results" aria-describedby="quick-nav-status" autofocus><button type="button" data-quick-nav-close aria-label="Close search">close</button></div>
    <p id="quick-nav-status" role="status">Loading…</p>
    <button class="text-action quick-nav-reset" type="button" data-clear-search hidden>Clear search</button>
    <ul id="quick-nav-results" role="listbox" aria-label="Pages"></ul>
    <a class="quick-nav-fallback" href="/" hidden>Browse writing</a>
    <p class="quick-nav-help" aria-hidden="true">↑↓ move · enter open · esc close</p>
  </dialog>
</body>
</html>`);
}

function categoryLink(category) {
  return `<a class="category-link" href="/?category=${encodeURIComponent(category)}#writing">${escape(category)}</a>`;
}

function home(posts) {
  const years = [...new Set(posts.map((post) => post.date.slice(0, 4)))];
  return `<section id="writing" class="writing" aria-label="Posts">
    <div class="section-heading"><div class="search" data-search hidden><label class="sr-only" for="search">Filter writing</label><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="filter" autocomplete="off" spellcheck="false" aria-keyshortcuts="/"><kbd aria-hidden="true">/</kbd></div></div>
    <div class="category-filter" data-category-filter hidden><span data-category-label></span><a href="/">all posts</a></div>
    <p class="archive-status sr-only" role="status" data-search-status></p>
    <div class="archive">${years
      .map(
        (year) =>
          `<section class="year-group" aria-labelledby="year-${year}"><h2 id="year-${year}" class="year">${year}<span class="year-note" aria-hidden="true">${year} WAS A GOOD YEAR</span></h2><ol class="entries">${posts
            .filter((post) => post.date.startsWith(year))
            .map(
              (post) =>
                `<li class="entry" data-categories="${escape(JSON.stringify(post.categories))}" data-search-text="${escape([post.title, post.excerpt, ...post.categories, post.date].join(" ").toLowerCase())}"><div class="entry-meta"><time datetime="${post.date}">${escape(dateLabel(post.date))}</time><span>${post.categories.map(categoryLink).join(" / ")}</span></div><a class="entry-link" href="/${post.slug}"><div class="entry-body"><h3 class="entry-title">${escape(post.title)}</h3><p>${escape(post.excerpt)}</p></div></a></li>`,
            )
            .join("")}</ol></section>`,
      )
      .join("")}</div>
    <div class="no-results" data-no-results hidden><p>No matching posts.</p><button class="text-action" type="button" data-clear-filter>Clear filter</button></div>
  </section>`;
}

function articleBody(page, { isPost = false, previous, next } = {}) {
  const doc = parseHTML("<article>" + markdown.render(page.content) + "</article>").document;
  const article = doc.querySelector("article");
  const usedIds = new Set([...article.querySelectorAll("[id]")].map((node) => node.id));
  const headings = [...article.querySelectorAll("h2, h3, h4")].map((heading) => {
    if (!heading.id) {
      const base = slugify(heading.textContent) || "section";
      let id = base;
      let suffix = 1;
      while (usedIds.has(id)) id = base + "-" + suffix++;
      heading.id = id;
      usedIds.add(id);
    }
    return { id: heading.id, title: heading.textContent, depth: Number(heading.tagName[1]) - 2 };
  });
  const rendered = article.innerHTML;
  const toc =
    headings.length > 1
      ? `<div class="article-toc" data-toc><nav aria-label="on this page"><svg aria-hidden="true" width="24"><path class="toc-track"/><path class="toc-progress" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/><path class="toc-arrival" pathLength="1"/></svg><ol>${headings.map(({ id, title, depth }) => `<li><a href="#${escape(id)}" data-depth="${depth}" style="--toc-depth:${depth}">${escape(title)}</a></li>`).join("")}</ol></nav></div>`
      : "";
  return `<header class="article-header">
    ${isPost ? `<div class="article-kicker"><time datetime="${page.date}">${dateLabel(page.date)}</time><span>/</span><span>${page.minutes} MIN READ</span></div>` : ""}
    <h1>${escape(page.title)}</h1>
    ${isPost ? `<p class="article-deck">${escape(page.excerpt)}</p><p class="byline">BY <a href="/about">TREVOR HARTMAN</a></p>` : ""}
  </header>
  <div class="reading-layout${isPost ? "" : " standalone-reading"}${toc ? " with-toc" : ""}">${isPost ? `<aside class="reading-aside"><span>categories</span><p>${page.categories.map(categoryLink).join("<br>")}</p></aside>` : ""}${toc}<article class="prose">${rendered}</article></div>
  ${page.slug === "about" ? '<p class="x-profile"><a href="https://x.com/devth">@devth on X ↗</a></p>' : ""}
  ${isPost ? `<nav class="post-navigation" aria-label="More writing">${previous ? `<a href="/${previous.slug}"><span>← older post</span>${escape(previous.title)}</a>` : "<div></div>"}${next ? `<a href="/${next.slug}"><span>newer post →</span>${escape(next.title)}</a>` : "<div></div>"}</nav>` : ""}`;
}

export async function generateSite() {
  const { posts, pages: contentPages } = await loadContent();
  await writeMcpContent({ posts, pages: contentPages });
  const pages = [{ path: "index.html", html: layout({ title: "Writing", body: home(posts) }) }];
  const navigationPages = [{ title: "Writing", path: "/", excerpt: description }];
  for (const [index, post] of posts.entries()) {
    pages.push({
      path: `${post.slug}/index.html`,
      html: layout({
        ...post,
        article: true,
        body: articleBody(post, {
          isPost: true,
          previous: posts[index + 1],
          next: posts[index - 1],
        }),
      }),
    });
  }
  for (const page of contentPages) {
    const { slug } = page;
    navigationPages.push({ title: page.title, path: `/${slug}`, excerpt: page.excerpt || "" });
    pages.push({ path: `${slug}/index.html`, html: layout({ ...page, body: articleBody(page) }) });
  }
  pages.push({
    path: "cosmos/index.html",
    html: layout({
      title: "Cosmos",
      slug: "cosmos",
      body: cosmosBody,
      noindex: true,
    }),
  });
  pages.push({
    path: "hover-lab/index.html",
    html: layout({
      title: "Hover Lab",
      slug: "hover-lab",
      body: hoverBody,
      noindex: true,
      excerpt: "Nine wireframe hover studies to compare side by side.",
    }),
  });
  pages.push({
    path: "404.html",
    html: layout({
      title: "Page not found",
      slug: "404",
      noindex: true,
      body: '<section class="not-found"><p class="eyebrow">404</p><h1>Page not found</h1><a class="solid-link" href="/">← Home</a></section>',
    }),
  });
  const redirects =
    posts
      .flatMap((post) => [
        `/${post.date.slice(0, 4)}/${post.slug} /${post.slug} 301`,
        `/${post.date.slice(0, 4)}/${post.slug}/ /${post.slug} 301`,
      ])
      .join("\n") + "\n";
  const rss = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>devth — Trevor Hartman</title><link>${origin}/</link><description>${escape(description)}</description><language>en</language><atom:link href="${origin}/feed.xml" rel="self" type="application/rss+xml"/>${posts.map((post) => `<item><title>${escape(post.title)}</title><link>${origin}/${post.slug}</link><guid isPermaLink="true">${origin}/${post.slug}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${escape(post.excerpt)}</description></item>`).join("")}</channel></rss>`;
  const urls = ["/", "/about", "/overture", "/glossary", ...posts.map((post) => `/${post.slug}`)];
  const assets = {
    _headers: publishing.headers,
    _redirects: redirects,
    "search.json": JSON.stringify([
      ...navigationPages,
      ...posts.map(({ title, slug, excerpt, categories }) => ({
        title,
        path: `/${slug}`,
        excerpt,
        categories,
      })),
      { title: "Cosmos", path: "/cosmos", excerpt: "" },
      { title: "Hover Lab", path: "/hover-lab", excerpt: "Compare nine wireframe hover studies." },
    ]),
    "feed.xml": rss,
    "sitemap.xml": `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${origin}${url}</loc></url>`).join("")}</urlset>`,
    "robots.txt": `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`,
  };
  await rm(output, { recursive: true, force: true });
  for (const page of pages) {
    const dest = resolve(output, page.path);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, page.html);
  }
  await Promise.all(
    Object.entries(assets).map(([name, content]) => writeFile(resolve(output, name), content)),
  );
  await Promise.all(
    [
      "style.css",
      "main.js",
      "link-sigil.js",
      "lettercase.js",
      "background.js",
      "graph-geometry.js",
      "search.js",
      "toc.js",
      "cosmos.css",
      "cosmos.js",
      "hover-lab.css",
      "hover-lab.js",
      "hover-studies.js",
    ].map((name) => copyFile(resolve(root, "src", name), resolve(output, name))),
  );
  return { input: pages.map((page) => resolve(output, page.path)), assets };
}
