import { mkdir, readdir, readFile, writeFile, copyFile, rm } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import matter from "gray-matter";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { slug as slugify } from "github-slugger";
import { createHighlighter } from "shiki";
import { cosmosBody } from "./cosmos-page.js";

const origin = "https://devth.com";
const root = resolve(import.meta.dirname, "..");
const output = resolve(root, ".site");
const description =
  "Trevor Hartman on software, systems, and finding a better way. Independent writing from Montana.";
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
  const counter = new URL(
    "/counter.svg",
    process.env.COUNTER_ORIGIN || "https://devth-hit-counter-preview.devth.workers.dev",
  );
  counter.searchParams.set("page", slug ? `/${slug}` : "/");
  const nav = [
    ["/", "Writing"],
    ["/about", "About"],
    ["/overture", "Overture"],
    ["/glossary", "Glossary"],
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
<body id="top">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="site-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="devth home">devth<span aria-hidden="true">_</span></a>
      <nav aria-label="Main navigation">${nav.map(([href, label]) => `<a href="${href}"${href === `/${slug}` ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
      <a class="header-github" href="https://github.com/devth">GitHub <span aria-hidden="true">↗</span></a>
    </header>
    <main id="main" tabindex="-1">${body}</main>
    <footer class="site-footer">
      <p>Trevor Hartman <span class="muted">/</span> Montana, USA</p>
      <span class="hit-counter" title="Page loads, not unique visitors. No cookies."><span>HITS</span><img src="${escape(counter.href)}" width="126" height="24" alt="Page hit counter" referrerpolicy="no-referrer"></span>
      <div><a href="/cosmos">Cosmos ◇</a><a href="/feed.xml">RSS ↗</a><a href="https://github.com/devth/devth.com">Source ↗</a><a href="#top" aria-label="Back to top">↑ Top</a></div>
    </footer>
  </div>
</body>
</html>`;
}

function home(posts) {
  const years = [...new Set(posts.map((post) => post.date.slice(0, 4)))];
  return `<section class="intro" aria-labelledby="intro-title">
    <div class="intro-label"><span class="status-mark" aria-hidden="true"></span> INDEPENDENT NOTES ON SOFTWARE & SYSTEMS</div>
    <div class="intro-grid">
      <h1 id="intro-title">Build things.<br>Question things.</h1>
      <div class="intro-aside"><p>I’m <a href="/about">Trevor Hartman</a>.<br>Engineer, open source builder,<br>perpetual beginner.</p><p class="muted">Looking for a better way<br>to make things work.</p></div>
    </div>
    <div class="hero-wordmark" aria-hidden="true">devth<span>↗</span></div>
    <div class="intro-bottom"><span>SOFTWARE / SYSTEMS / THE HUMAN PART</span><a href="#writing">READ THE NOTES <span aria-hidden="true">↓</span></a></div>
  </section>
  <section id="writing" class="writing" aria-labelledby="writing-title">
    <div class="section-heading"><h2 id="writing-title">Writing<span class="count">[${String(posts.length).padStart(2, "0")}]</span></h2><div class="search" data-search hidden><label class="sr-only" for="search">Filter writing</label><span aria-hidden="true">⌕</span><input id="search" type="search" placeholder="Filter the archive" autocomplete="off" spellcheck="false" aria-keyshortcuts="/"><kbd aria-hidden="true">/</kbd></div></div>
    <p class="sr-only" role="status" data-search-status></p>
    <div class="archive">${years
      .map(
        (year) =>
          `<section class="year-group" aria-labelledby="year-${year}"><h3 id="year-${year}" class="year">${year}</h3><ol class="entries">${posts
            .filter((post) => post.date.startsWith(year))
            .map(
              (post) =>
                `<li class="entry" data-search-text="${escape([post.title, post.excerpt, ...post.categories, post.date].join(" ").toLowerCase())}"><a class="entry-link" href="/${post.slug}"><div class="entry-meta"><time datetime="${post.date}">${escape(dateLabel(post.date))}</time><span>${escape(post.categories[0] || "notes")}</span></div><div class="entry-body"><h4 class="entry-title">${escape(post.title)}</h4><p>${escape(post.excerpt)}</p></div><span class="entry-arrow" aria-hidden="true">↗</span></a></li>`,
            )
            .join("")}</ol></section>`,
      )
      .join("")}</div>
    <p class="no-results" data-no-results hidden>No matching notes. Try a different word.</p>
    <div class="archive-end"><span>END OF INDEX</span><a href="/feed.xml">Follow along via RSS ↗</a></div>
  </section>`;
}

function articleBody(page, { isPost = false, previous, next } = {}) {
  const rendered = markdown.render(page.content);
  return `<header class="article-header">
    <a class="back-link" href="/">← ALL WRITING</a>
    <div class="article-kicker">${isPost ? `<time datetime="${page.date}">${dateLabel(page.date)}</time><span>/</span><span>${page.minutes} MIN READ</span>` : "<span>FIELD NOTES / " + escape(page.slug.toUpperCase()) + "</span>"}</div>
    <h1>${escape(page.title)}</h1>
    ${isPost ? `<p class="article-deck">${escape(page.excerpt)}</p><p class="byline">BY <a href="/about">TREVOR HARTMAN</a></p>` : ""}
  </header>
  <div class="reading-layout"><aside class="reading-aside"><span>${isPost ? "FILE UNDER" : "ON THIS SITE"}</span><p>${isPost ? page.categories.map(escape).join("<br>") || "notes" : "Software.<br>Curiosity.<br>A better way."}</p></aside><article class="prose">${rendered}</article></div>
  ${isPost ? `<nav class="post-navigation" aria-label="More writing">${previous ? `<a href="/${previous.slug}"><span>← OLDER NOTE</span>${escape(previous.title)}</a>` : "<div></div>"}${next ? `<a href="/${next.slug}"><span>NEWER NOTE →</span>${escape(next.title)}</a>` : "<div></div>"}</nav>` : '<div class="page-bottom"><a href="/">← Back to the writing</a></div>'}`;
}

export async function generateSite() {
  const files = (await readdir(resolve(root, "posts"))).filter((file) => /\.mdx?$/.test(file));
  const posts = await Promise.all(
    files.map(async (file) => {
      const [, date, slug] = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.mdx?$/);
      const { data, content } = matter(await readFile(resolve(root, "posts", file), "utf8"));
      return {
        ...data,
        title: data.title.trim(),
        excerpt: (data.excerpt || "").trim().replace(/\s+/g, " "),
        categories: Array.isArray(data.categories)
          ? data.categories
          : [data.categories].filter(Boolean),
        date,
        slug,
        content,
        minutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 220)),
      };
    }),
  );
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const pages = [{ path: "index.html", html: layout({ title: "Writing", body: home(posts) }) }];
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
  for (const slug of ["about", "overture", "glossary"]) {
    const file = slug === "glossary" ? "non-posts/glossary.mdx" : `content/${slug}.md`;
    const { data, content } = matter(await readFile(resolve(root, file), "utf8"));
    const page = { ...data, title: data.title || "Glossary", slug, content };
    pages.push({ path: `${slug}/index.html`, html: layout({ ...page, body: articleBody(page) }) });
  }
  pages.push({
    path: "cosmos/index.html",
    html: layout({
      title: "Cosmos / an experiment",
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
      body: '<section class="not-found"><p class="eyebrow">404 / NOT FOUND</p><h1>Nothing here.</h1><p>That path doesn’t lead anywhere.<br>The writing is a better place to start.</p><a class="solid-link" href="/">← Back to the index</a></section>',
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
    _redirects: redirects,
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
    ["style.css", "main.js", "cosmos.css", "cosmos.js"].map((name) =>
      copyFile(resolve(root, "src", name), resolve(output, name)),
    ),
  );
  return { input: pages.map((page) => resolve(output, page.path)), assets };
}
