# devth.com

Trevor Hartman’s writing, built with **Vite+** and hosted as **Cloudflare Workers Static Assets**. Every page is pre-rendered HTML: no React, hydration, SSR, or third-party fonts. Reading and navigation work without JavaScript. Small scripts enhance archive/category filtering, keyboard search, scroll-tracking contents, geometric link hovers, and the scroll-driven background; the isolated `/cosmos` experiment loads Three.js only on that page. Durable Object storage backs the retro per-page hit-counter images: a first-party endpoint in production, and a separate Worker for preview.

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
npm run test:production # Local production Workers: indexing, counters, www redirects
npm run build:production # Indexable production HTML with first-party counters
npm run preview      # Vite's static build preview
```

Browser tests run against local Wrangler so routing, redirects, and true HTTP 404 responses match Cloudflare. Install the matching Chromium build on a new machine with `npx playwright install chromium`. Set `BASE_URL` to test an existing deployment without starting a local server. Local tests start both the static site and counter service. Screenshots are written to `test-results/`. CI runs build/checks and browser/counter tests in parallel jobs, caches lockfile-matched dependencies and the exact Chromium version, and uploads failure artifacts for seven days. Each build writes its measured end-to-end time to the GitHub job summary. Only PRs and pushes to `master` run automatically, avoiding duplicate feature-branch runs. Newer PR runs cancel stale checks; master runs serialize without interrupting an in-flight release. Both jobs must pass before the production deployment job runs. PRs never deploy or receive the Production environment secret.

## Content

- `posts/YYYY-MM-DD-slug.mdx` — all 17 existing posts, including the 2016 Yetibot post missing from the old live index.
- `content/about.md`, `content/overture.md` — standalone pages, migrated from JSX without changing the original prose.
- `tests/fixtures/original-copy.json` — original titles, excerpts and prose-text hashes from pre-rebuild commit `3f2089d`. Regression tests ignore whitespace and markup changes, but preserve the authored words and punctuation. The homepage remains an archive, without an invented biography; page descriptions quote the original text. The exact, author-approved tagline “work in progress” appears under the logo.
- `non-posts/glossary.mdx` — the glossary.
- `drafts/` and other `non-posts/` files — never published.
- `src/style.css` — design, responsive layout, system light/dark modes, print styles.
- `scripts/background.js`, `src/background.js` — pre-rendered decorative node/edge background on every page. Real-depth perspective, scroll-driven yaw/pitch rotation, and randomized bounded node shifts update only on scroll. Four heterogeneous wireframes (icosahedra, dodecahedra, cuboctahedra, and stellated octahedra) vary in size and orientation; no idle animation loop, timers, or 3D dependency. Reduced motion leaves it static.
- `src/main.js` — archive/category filtering, quick-navigation entry point, and randomized geometric link sigils; `/` focuses archive filtering, Escape clears it.
- `src/search.js` — lazily loaded Cmd+K/Ctrl+K dialog; searches a generated static index using original titles, excerpts and categories.
- `src/toc.js` — sticky heading-derived contents with a stepped SVG scroll-progress rail; native fragment links work without JavaScript.
- `src/cosmos.js`, `src/cosmos.css` — the isolated 3D sculpture experiment.
- `counter/worker.js` — per-page hit counters, independent of static asset serving.
- `scripts/content.js` — shared allowlist and loader for published posts and authored pages.
- `scripts/site.js` — Markdown renderer, layouts, archive, RSS, sitemap, and legacy redirects.
- `production/mcp.js` — public read-only MCP resources and tools, backed by the same published content.

Preserve the author’s exact voice. Do not invent taglines, biographies, summaries, asides or other editorial copy. Keep existing prose, titles and excerpts verbatim; new interface controls should use neutral functional labels. New editorial text requires the author’s wording or explicit approval.

At the author’s request, Wikipedia URL destinations were replaced with verified Grokipedia counterparts, including the lowercase `/page/parametricity` and `/page/List_of_Java_bytecode_instructions`. Existing link labels, quotations and prose remain unchanged. Grokipedia paths are case-sensitive; verify actual pages and fragment IDs rather than guessing from Wikipedia slugs.

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

`npm run deploy` publishes the small counter Worker first, then Wrangler runs `npm run build` and uploads `dist/` directly. `npm run deploy:counter` updates only the counter service. Use `npx wrangler deploy` for a site-only update that leaves the counter Worker untouched. Missing URLs use `404.html`; post URLs have no trailing slash. `_redirects` retains both forms of the old year-prefixed URLs. The default build generates `X-Robots-Tag: noindex` in `_headers`; canonical URLs, RSS links, and sitemap URLs continue to identify `https://devth.com`.

## Production and automatic deployments

Production: <https://devth.com>

On each push to `master`, GitHub Actions runs both validation jobs, including production routing/indexing/counter integration tests, then publishes through the pinned Wrangler dependency. A manual workflow dispatch on `master` follows the same checks. Other branches and PRs cannot publish.

The deployment uses the GitHub **Production** environment and its `CLOUDFLARE_API_TOKEN` secret. Limit that environment to the `master` branch. The token is scoped to the **Trevor Hartman** account and **devth.com** zone: Account → Workers Scripts Edit and Account Settings Read; Zone → Workers Routes Edit, Zone Read and DNS Read. DNS Read is for backing up and auditing the old origin records; deployments do not need broad DNS-edit access. Do not use a global API key or a personal Wrangler OAuth token in CI.

- `wrangler.production.jsonc` deploys **devth-com** on the **devth.com/\*** Worker route, with indexable static assets and a new production-only `PageCounter` namespace. The route overrides the old origin without changing its DNS record.
- `/counter.svg` is first-party. Only this path and `/mcp` run Worker code before assets; ordinary pages remain direct static asset responses.
- `wrangler.www.jsonc` deploys **devth-com-www** on **www.devth.com/\***, preserving the existing **308** redirect to the HTTPS apex, including paths and query strings. It has no assets or counter storage.
- Both production configs pin the Trevor Hartman account and devth.com zone, disable `workers.dev` and version-preview URLs, and leave the preview site and original preview counter account untouched. Root and www DNS must remain Cloudflare-proxied for these routes to run.
- `npm run build:production` generates the counter allowlist, omits preview-only noindex headers, and verifies all 23 HTML pages before publishing. Cosmos and the 404 retain their own noindex metadata.
- `npm run deploy:production` updates the www redirect first, then builds and publishes the main site. It never calls the preview deployment scripts.

Nameservers and email records are unchanged. The existing Vercel project is retained for rollback, not used by the new deployment workflow; its legacy GitHub integration is separate from the passing Cloudflare checks.

### Rollback

For a code-only rollback, use `npx wrangler rollback --config wrangler.production.jsonc` and select the previous version, or revert the offending master commit so the checked workflow redeploys it. Do not delete the production Durable Object namespace: counts persist independently of asset/code versions.

For a hosting rollback to Vercel, ensure the old Vercel deployment is active, then remove only the **devth.com/\*** and **www.devth.com/\*** Worker routes. The original DNS records are left untouched by the cutover, so removing the routes exposes the former origin again. Leave preview bindings, MX/TXT email records, nameservers, and counter namespaces alone. Keep any private origin-record backup outside Git; do not guess the former origin from proxied public IPs.

## Experiments

### Cosmos

Open [/cosmos](https://preview.devth.com/cosmos). The scene fills the viewport behind overlaid navigation and controls: shader-deformed interlocking ribbons, additive wire meshes, rotating cages, orbital loops and 2,600 stars. The shared static/scroll-driven node graph sits behind the transparent canvas instead of duplicating a rotating 3D graph. Drag to orbit; pinch to zoom, or focus the canvas and use arrow keys and +/−. Pause, recenter, or randomize the sculpture. The seed stays in the URL so a particular sculpture can be shared. The page is linked in the footer, not promoted into the main navigation or homepage. It is excluded from the sitemap and marked noindex.

Reduced-motion users start with drift paused. The scene stops rendering offscreen or in background tabs. There is no loading diagram or substitute sculpture: the background stays dark while the renderer loads or JavaScript is unavailable. A WebGL failure shows a short status; header navigation remains usable. Only this page downloads the 3D renderer. Other pages never request Three.js; search code and its static index load only when the dialog is first opened, and the contents tracker loads only on pages with a ToC.

Link hovers draw a short, randomized node/edge sigil beside the link without moving or obscuring its text. Keyboard focus works too. Reduced-motion users get ordinary link/focus styling, without the animation.

### Navigation and contents

Header/footer navigation and category links use lowercase labels; authored titles retain their original casing. Category labels link to `/?category=…#writing`, where the enhanced archive applies an exact category filter. With JavaScript disabled, these remain native links to the complete, readable archive.

Cmd+K or Ctrl+K opens global quick navigation. Type to filter; arrows or Ctrl+N/Ctrl+P select the next/previous result, Enter follows its ordinary anchor, and Escape closes and restores focus. Search failure leaves a home link and normal navigation available. Browsers without dialog support retain the existing navigation.

Articles with multiple headings get a contents rail without a visible title. Its navigation retains an accessible name. The active heading segment stays visible even before the first section enters the reading marker, including flat heading lists. Its desktop sidebar sticks beside the prose; on narrow screens it becomes a compact section above the article. A stepped SVG line follows heading nesting and fills with scroll progress; the current heading’s whole segment remains highlighted. Reduced motion disables its interpolation, not its progress indication. Existing heading IDs remain unchanged, including `$EDITOR` → `#editor`; trusted inline-HTML headings receive unique IDs too.

### Page transitions

The homepage restores an oversized responsive **devth** logo rather than a visible “Writing” title. Its shared `site-brand` view-transition name animates the large mark into the compact header mark when opening an article, and back on return. This remains native cross-document navigation with a 200ms transition and reduced-motion opt-out.

Internal same-origin navigation uses native cross-document View Transitions: a 200 ms crossfade with a small depth shift. Only opacity and transforms animate. There is no wind simulation, tumbling, animated shadow, filter or grid background.

The CSS enhancement needs no JavaScript. Reduced-motion users opt out entirely. Browsers without cross-document View Transitions use ordinary navigation. There is no client-side router, intercepted link navigation or artificial loading delay; fragment links, downloads, external links, modified clicks and browser history retain native behavior.

### Public content MCP

Connect an MCP client using **Streamable HTTP** to **`https://devth.com/mcp`**. No login or API key is needed. This is a protocol endpoint, not a browser page; ordinary GET requests return 405. It becomes available when this change reaches the existing master-only production deployment; preview remains asset-only.

- **Resources:** every published post plus About, Overture, and Glossary, identified by the page's canonical HTTPS URL and served as `text/markdown`. Resource reads return the original Markdown body.
- **`list_content`** — list titles, canonical URLs, dates, categories, and excerpts without full article bodies.
- **`search_content`** — pass `query` and optionally `limit` (1–20, default 10). Searches titles, categories, excerpts and full bodies using case-insensitive literal terms; every term must match. Returns metadata and passages from matching articles, in archive order.
- **`read_content`** — pass `identifier`, an exact canonical URL or path from the other tools, such as `https://devth.com/beautiful-constraint` or `/beautiful-constraint`. Returns metadata and the complete original Markdown body. Relative links resolve against the returned canonical URL.

Both the website and MCP catalog use `scripts/content.js`. Each site build writes `production/.generated-content.json`, an ignored build input bundled into the Worker, not a new public asset. Only `posts/` and the three explicit authored pages are loaded. Drafts, unpublished non-posts, the homepage's generated archive, Cosmos application source and error pages are not MCP documents. Frontmatter is allowlisted into public metadata rather than returned wholesale. Content reads never fetch user-supplied URLs or access the filesystem at runtime, and do not increment hit counters.

The official MCP SDK handles initialization, protocol errors and JSON responses. The endpoint is stateless, with a fresh server and transport per request; no new Durable Object or database. POST bodies are limited to 32 KiB, queries to 200 characters, and read identifiers to 2,048 characters. There is no persistent GET/SSE stream or session deletion. Responses are `noindex` and `no-store`.

Native/server-side clients can connect without an Origin header. Browser clients must send the endpoint's exact Origin; same-origin OPTIONS preflight is supported, but arbitrary cross-origin browser embeds are not. Local testing permits localhost-class hosts. Adding another browser client origin requires an explicit allowlist change, not wildcard CORS. Existing Cloudflare protections still apply; anonymous access is not an unlimited-use guarantee.

`tests/production/mcp.spec.js` connects the official SDK client to the built Worker under local Wrangler and checks resource discovery, full-text search, original Markdown reads, and HTTP protections. Run it with `npm run test:production`.

### Hit counters

Production pages embed an SVG from `https://devth.com/counter.svg`. Preview pages continue to use `devth-hit-counter-preview.devth.workers.dev`. Each GET increments that page’s Durable Object counter atomically; HEAD reads without incrementing. Responses use `Cache-Control: no-store`. Only generated, published page paths are accepted, so arbitrary URLs cannot create new counter objects.

These count counter-image requests, not unique people: reloads and bots can count; disabled images, blockers, and back/forward-cache restores may not. There are no cookies, visitor identifiers, or analytics scripts. Production counts start fresh in the `devth-com` Worker’s namespace and persist across deployments. Existing preview/test totals remain in the separate original preview namespace; production never imports or resets them. A failed counter cannot prevent the static writing from loading.

Set `COUNTER_ORIGIN` at build time to point at another instance. Local Playwright tests use port 4174; live tests can also set `COUNTER_ORIGIN` to override the deployed counter. The counter’s source page list is regenerated before Wrangler builds; `counter/.generated-pages.json` is ignored.

The 2016 Yetibot article referenced an IRC screenshot absent from both Git history and the live site. The broken image is omitted without adding editorial text. All other local images and article content are retained.
