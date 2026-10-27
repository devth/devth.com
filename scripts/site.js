import { mkdir, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { loadContent } from "./content.js";
import { writeMcpContent } from "./mcp-content.js";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { slug as slugify } from "github-slugger";
import { createHighlighter } from "shiki";
import { cosmosBody } from "./cosmos-page.js";
import { parseHTML } from "linkedom";
import { background } from "./background.js";
import { publishingSettings } from "./publishing.js";

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
  return `<!doctype html>
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
</head>
<body id="top"${slug === "cosmos" ? ' class="cosmos-page"' : slug === "" ? ' class="home-page"' : ""}>
  ${background}
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="devth home"><${slug === "" ? "h1" : "span"} class="brand-mark">devth<span aria-hidden="true">_</span></${slug === "" ? "h1" : "span"}><span class="brand-tagline">work in progress</span></a>
      <nav aria-label="Main navigation">${nav.map(([href, label]) => `<a href="${href}"${href === `/${slug}` ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <button class="header-search" type="button" data-quick-nav-trigger aria-label="Search" aria-haspopup="dialog" aria-controls="quick-nav" aria-keyshortcuts="Meta+K Control+K" hidden><span aria-hidden="true">⌕</span><kbd aria-hidden="true">⌘K</kbd></button>
      <a class="header-github" href="https://github.com/devth">github <span aria-hidden="true">↗</span></a>
    </header>
    <main id="main" tabindex="-1">${body}</main>
    <footer class="site-footer">
      <p>© ${new Date().getFullYear()} Trevor C. Hartman<br><a href="https://grokipedia.com/page/Soli_Deo_gloria">Soli Deo Gloria</a></p>
      <span class="hit-counter" title="Page loads, not unique visitors. No cookies."><span>HITS</span><img src="${escape(counter.href)}" width="126" height="24" alt="Page hit counter" referrerpolicy="no-referrer"></span>
      <div><a href="/cosmos">Cosmos ◇</a><a href="/feed.xml">RSS ↗</a><a href="https://github.com/devth/devth.com">view source ↗</a><a href="#top" aria-label="Back to top">↑ Top</a></div>
    </footer>
  </div>
  <dialog id="quick-nav" class="quick-nav" aria-labelledby="quick-nav-title">
    <h2 id="quick-nav-title" class="sr-only">Search</h2>
    <div class="quick-nav-input"><label class="sr-only" for="quick-nav-query">Search pages</label><input id="quick-nav-query" type="search" role="combobox" placeholder="Search pages" autocomplete="off" spellcheck="false" aria-autocomplete="list" aria-expanded="true" aria-controls="quick-nav-results" aria-describedby="quick-nav-status" autofocus><button type="button" data-quick-nav-close aria-label="Close search">esc</button></div>
    <p id="quick-nav-status" role="status">Loading…</p>
    <ul id="quick-nav-results" role="listbox" aria-label="Pages"></ul>
    <a class="quick-nav-fallback" href="/" hidden>home</a>
  </dialog>
</body>
</html>`;
}

function categoryLink(category) {
  return `<a class="category-link" href="/?category=${encodeURIComponent(category)}#writing">${escape(category)}</a>`;
}

function home(posts) {
  const years = [...new Set(posts.map((post) => post.date.slice(0, 4)))];
  return `<section id="writing" class="writing" aria-label="Posts">
    <div class="section-heading"><div class="search" data-search hidden><label class="sr-only" for="search">Filter writing</label><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Filter the archive" autocomplete="off" spellcheck="false" aria-keyshortcuts="/"><kbd aria-hidden="true">/</kbd></div></div>
    <div class="category-filter" data-category-filter hidden><span data-category-label></span><a href="/">all posts</a></div>
    <p class="sr-only" role="status" data-search-status></p>
    <div class="archive">${years
      .map(
        (year) =>
          `<section class="year-group" aria-labelledby="year-${year}"><h2 id="year-${year}" class="year">${year}</h2><ol class="entries">${posts
            .filter((post) => post.date.startsWith(year))
            .map(
              (post) =>
                `<li class="entry" data-categories="${escape(JSON.stringify(post.categories))}" data-search-text="${escape([post.title, post.excerpt, ...post.categories, post.date].join(" ").toLowerCase())}"><div class="entry-meta"><time datetime="${post.date}">${escape(dateLabel(post.date))}</time><span>${post.categories.map(categoryLink).join(" / ")}</span></div><a class="entry-link" href="/${post.slug}"><div class="entry-body"><h3 class="entry-title">${escape(post.title)}</h3><p>${escape(post.excerpt)}</p></div><span class="entry-arrow" aria-hidden="true">↗</span></a></li>`,
            )
            .join("")}</ol></section>`,
      )
      .join("")}</div>
    <p class="no-results" data-no-results hidden>No matching posts.</p>
    <div class="archive-end"><a href="/feed.xml">RSS ↗</a></div>
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
      ? `<div class="article-toc" data-toc><nav aria-label="on this page"><svg aria-hidden="true" width="24"><path class="toc-track"/><path class="toc-progress" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/></svg><ol>${headings.map(({ id, title, depth }) => `<li><a href="#${escape(id)}" data-depth="${depth}" style="--toc-depth:${depth}">${escape(title)}</a></li>`).join("")}</ol></nav></div>`
      : "";
  return `<header class="article-header">
    <a class="back-link" href="/">← all writing</a>
    ${isPost ? `<div class="article-kicker"><time datetime="${page.date}">${dateLabel(page.date)}</time><span>/</span><span>${page.minutes} MIN READ</span></div>` : ""}
    <h1>${escape(page.title)}</h1>
    ${isPost ? `<p class="article-deck">${escape(page.excerpt)}</p><p class="byline">BY <a href="/about">TREVOR HARTMAN</a></p>` : ""}
  </header>
  <div class="reading-layout${isPost ? "" : " standalone-reading"}${toc ? " with-toc" : ""}">${isPost ? `<aside class="reading-aside"><span>categories</span><p>${page.categories.map(categoryLink).join("<br>")}</p></aside>` : ""}${toc}<article class="prose">${rendered}</article></div>
  ${page.slug === "about" ? '<section class="x-timeline" aria-labelledby="x-posts-title" data-x-timeline><h2 id="x-posts-title">X posts</h2><p><a href="https://x.com/devth">@devth on X</a></p><p>Loads content from X only when you choose to.</p><button type="button" data-load-timeline hidden>Load @devth timeline</button><p role="status" data-timeline-status></p><div data-timeline-content></div></section>' : ""}
  ${isPost ? `<nav class="post-navigation" aria-label="More writing">${previous ? `<a href="/${previous.slug}"><span>← older post</span>${escape(previous.title)}</a>` : "<div></div>"}${next ? `<a href="/${next.slug}"><span>newer post →</span>${escape(next.title)}</a>` : "<div></div>"}</nav>` : '<div class="page-bottom"><a href="/">← back to the writing</a></div>'}`;
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
      "x-timeline.js",
      "background.js",
      "graph-geometry.js",
      "search.js",
      "toc.js",
      "cosmos.css",
      "cosmos.js",
    ].map((name) => copyFile(resolve(root, "src", name), resolve(output, name))),
  );
  return { input: pages.map((page) => resolve(output, page.path)), assets };
}
