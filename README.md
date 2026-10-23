# devth.com

Trevor Hartman’s writing, built with **Vite+** and hosted as **Cloudflare Workers Static Assets**. Every page is pre-rendered HTML: no React, hydration, SSR, or third-party fonts. Reading and navigation work without JavaScript. Small scripts enhance archive/category filtering, keyboard search, scroll-tracking contents, and geometric link hovers; the isolated `/cosmos` experiment loads Three.js only on that page. A separate Cloudflare Worker with Durable Object storage serves the retro per-page hit-counter images.

## Develop

Use Node 22.18+, 24.11+, or 26+ (see `engines` in `package.json`).

```sh
npm ci
npm run dev
```

Vite+ is a pinned project dependency; no global `vp` installation is required. Changes to content and `src/` regenerate the site and reload the browser.

```sh
npm run check        # Vite+ format and lint checks
npm run build        # Generate HTML, then bundle assets with Vite+
npm test             # Validate the built site, all posts, links, images, feed
npm run test:browser # Desktop/mobile, accessibility, filtering, no-JS, redirects
npm run preview      # Vite's static build preview
```

Browser tests run against local Wrangler so routing, redirects, and true HTTP 404 responses match Cloudflare. Install the matching Chromium build on a new machine with `npx playwright install chromium`. Set `BASE_URL` to test an existing deployment without starting a local server. Local tests start both the static site and counter service. Screenshots are written to `test-results/`. CI runs build/checks and browser/counter tests in parallel jobs, caches lockfile-matched dependencies and the exact Chromium version, and uploads failure artifacts for seven days. Each build writes its measured end-to-end time to the GitHub job summary. Only PRs and pushes to `master` run automatically, avoiding duplicate feature-branch runs; newer runs cancel stale ones.

## Content

- `posts/YYYY-MM-DD-slug.mdx` — all 17 existing posts, including the 2016 Yetibot post missing from the old live index.
- `content/about.md`, `content/overture.md` — standalone pages, migrated from JSX without changing the original prose.
- `tests/fixtures/original-copy.json` — original titles, excerpts and prose-text hashes from pre-rebuild commit `3f2089d`. Regression tests ignore whitespace and markup changes, but preserve the authored words and punctuation. The homepage remains an archive, without an invented biography; page descriptions quote the original text. The exact, author-approved tagline “work in progress” appears under the logo.
- `non-posts/glossary.mdx` — the glossary.
- `drafts/` and other `non-posts/` files — never published.
- `src/style.css` — design, responsive layout, system light/dark modes, print styles.
- `src/main.js` — archive/category filtering, quick-navigation entry point, and randomized geometric link sigils; `/` focuses archive filtering, Escape clears it.
- `src/search.js` — lazily loaded Cmd+K/Ctrl+K dialog; searches a generated static index using original titles, excerpts and categories.
- `src/toc.js` — sticky heading-derived contents with a stepped SVG scroll-progress rail; native fragment links work without JavaScript.
- `src/cosmos.js`, `src/cosmos.css` — the isolated 3D sculpture experiment.
- `counter/worker.js` — per-page hit counters, independent of static asset serving.
- `scripts/site.js` — Markdown renderer, layouts, archive, RSS, sitemap, and legacy redirects.

Preserve the author’s exact voice. Do not invent taglines, biographies, summaries, asides or other editorial copy. Keep existing prose, titles and excerpts verbatim; new interface controls should use neutral functional labels. New editorial text requires the author’s wording or explicit approval.

The `.mdx` extension is retained for existing content, but content is now Markdown with trusted inline HTML, **not executable MDX/React**. Code is highlighted at build time using Shiki’s high-contrast themes. Heading IDs use GitHub slug rules to retain existing anchor URLs. Use fenced code blocks and ordinary HTML images with descriptive `alt` text.

To add a post:

```md
---
title: A good title
categories: [engineering]
excerpt: A short description.
---

Your Markdown here.
```

Name it `posts/YYYY-MM-DD-a-good-slug.md` (or `.mdx`), then build. The index, feed, sitemap, reading time, adjacent-post navigation, and old `/:year/:slug` permanent redirects are generated automatically. `.site/` and `dist/` are generated and ignored. Run build before the static publishing tests.

## Cloudflare preview

Preview: <https://preview.devth.com>

`wrangler.jsonc` names a separate `devth-com-preview` deployment in the **Trevor Hartman** Cloudflare account, which owns the `devth.com` zone. Its only custom domain is **`preview.devth.com`**; it has no production routes, `workers.dev` hostname, or version-preview URLs. Deploying it cannot move `devth.com` away from the existing Vercel site.

The counter Worker remains in the original **devth** account (`wrangler.counter.jsonc`), preserving its Durable Object namespace and existing counts. Both configs pin their account IDs; the deploying login needs access to both accounts when running `npm run deploy`. The original `devth-com-preview.devth.workers.dev` deployment is left intact as a fallback.

```sh
npx wrangler login
npm run deploy
```

`npm run deploy` publishes the small counter Worker first, then Wrangler runs `npm run build` and uploads `dist/` directly. `npm run deploy:counter` updates only the counter service. Use `npx wrangler deploy` for a site-only update that leaves the counter Worker untouched. Missing URLs use `404.html`; post URLs have no trailing slash. `_redirects` retains both forms of the old year-prefixed URLs. The preview sends `X-Robots-Tag: noindex` via `public/_headers`; canonical URLs, RSS links, and sitemap URLs continue to identify `https://devth.com`.

After the preview is approved, production promotion requires explicitly attaching `devth.com` (and deciding the `www` redirect), removing the preview-only `X-Robots-Tag` header, and verifying the domain. **No production DNS, routes, email records, or Vercel settings have been changed.** Automatic Cloudflare deployments are intentionally not enabled during preview review; CI only validates.

## Experiments

### Cosmos

Open [/cosmos](https://preview.devth.com/cosmos). The scene fills the viewport behind overlaid navigation and controls: shader-deformed interlocking ribbons, additive wire meshes, instanced nodes, rotating cages, orbital loops and 2,600 stars. Drag to orbit; pinch to zoom, or focus the canvas and use arrow keys and +/−. Pause, recenter, or randomize the sculpture. The seed stays in the URL so a particular sculpture can be shared. The page is linked in the footer, not promoted into the main navigation or homepage. It is excluded from the sitemap and marked noindex.

Reduced-motion users start with drift paused. The scene stops rendering offscreen or in background tabs, and a still SVG appears without JavaScript or WebGL. Only this page downloads the 3D renderer. Other pages never request Three.js; search code and its static index load only when the dialog is first opened, and the contents tracker loads only on pages with a ToC.

Link hovers draw a short, randomized node/edge sigil beside the link without moving or obscuring its text. Keyboard focus works too. Reduced-motion users get ordinary link/focus styling, without the animation.

### Navigation and contents

Header/footer navigation and category links use lowercase labels; authored titles retain their original casing. Category labels link to `/?category=…#writing`, where the enhanced archive applies an exact category filter. With JavaScript disabled, these remain native links to the complete, readable archive.

Cmd+K or Ctrl+K opens global quick navigation. Type to filter; arrows select a result, Enter follows its ordinary anchor, and Escape closes and restores focus. Search failure leaves a home link and normal navigation available. Browsers without dialog support retain the existing navigation.

Articles with multiple headings get a native, collapsible contents section. Its desktop sidebar sticks beside the prose; on narrow screens it becomes a compact section above the article. A stepped SVG line follows heading nesting and fills with scroll progress. Reduced motion disables its interpolation, not its progress indication. Existing heading IDs remain unchanged, including `$EDITOR` → `#editor`; trusted inline-HTML headings receive unique IDs too.

### Page transitions

Internal same-origin navigation uses native cross-document View Transitions: a 200 ms crossfade with a small depth shift. Only opacity and transforms animate. There is no wind simulation, tumbling, animated shadow, filter or grid background.

The CSS enhancement needs no JavaScript. Reduced-motion users opt out entirely. Browsers without cross-document View Transitions use ordinary navigation. There is no client-side router, intercepted link navigation or artificial loading delay; fragment links, downloads, external links, modified clicks and browser history retain native behavior.

### Hit counters

Every page embeds an SVG from `devth-hit-counter-preview.devth.workers.dev`. Each GET increments that page’s Durable Object counter atomically; HEAD reads without incrementing. Responses use `Cache-Control: no-store`. Only generated, published page paths are accepted, so arbitrary URLs cannot create new counter objects.

These count counter-image requests, not unique people: reloads and bots can count; disabled images, blockers, and back/forward-cache restores may not. There are no cookies, visitor identifiers, or analytics scripts. Counts start with this deployment, persist across counter-code deployments, and belong to the preview Worker’s namespace. A production counter should use its own namespace rather than inherit preview/test hits. A failed counter cannot prevent the static writing from loading.

Set `COUNTER_ORIGIN` at build time to point at another instance. Local Playwright tests use port 4174; live tests can also set `COUNTER_ORIGIN` to override the deployed counter. The counter’s source page list is regenerated before Wrangler builds; `counter/.generated-pages.json` is ignored.

The 2016 Yetibot article referenced an IRC screenshot absent from both Git history and the live site. The broken image is omitted without adding editorial text. All other local images and article content are retained.
