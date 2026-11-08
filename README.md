# devth.com

Trevor Hartman’s writing, built with **Vite+** and hosted as **Cloudflare Workers Static Assets**. Every page is pre-rendered HTML: no React, hydration, SSR, or third-party fonts. Reading and navigation work without JavaScript. Small scripts enhance archive/category filtering, keyboard search, scroll-tracking contents, geometric link hovers, and the scroll-driven background; the isolated `/cosmos` experiment loads Three.js only on that page, and `/hover-lab` is a separate SVG hover-study board. Durable Object storage backs the retro per-page hit-counter images: a first-party endpoint in production, and a separate Worker for preview.

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
- `src/navigation.js` / `src/page-lifecycle.js` — persistent shared navigation shell and disposable page features, with native full-page fallbacks.
- `src/search.js` — lazily loaded Cmd+K/Ctrl+K dialog; searches a generated static index using original titles, excerpts and categories.
- `src/toc.js` — sticky heading-derived contents with a stepped SVG scroll-progress rail; native fragment links work without JavaScript.
- `src/cosmos.js`, `src/cosmos.css` — the isolated 3D stellar-neighborhood experiment.
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
- `npm run build:production` generates the counter allowlist, omits preview-only noindex headers, and verifies all 24 HTML pages before publishing. Cosmos, Hover Lab, and the 404 retain their own noindex metadata.
- `npm run deploy:production` updates the www redirect first, then builds and publishes the main site. It never calls the preview deployment scripts.

Nameservers and email records are unchanged. The existing Vercel project is retained for rollback, not used by the new deployment workflow; its legacy GitHub integration is separate from the passing Cloudflare checks.

### Rollback

For a code-only rollback, use `npx wrangler rollback --config wrangler.production.jsonc` and select the previous version, or revert the offending master commit so the checked workflow redeploys it. Do not delete the production Durable Object namespace: counts persist independently of asset/code versions.

For a hosting rollback to Vercel, ensure the old Vercel deployment is active, then remove only the **devth.com/\*** and **www.devth.com/\*** Worker routes. The original DNS records are left untouched by the cutover, so removing the routes exposes the former origin again. Leave preview bindings, MX/TXT email records, nameservers, and counter namespaces alone. Keep any private origin-record backup outside Git; do not guess the former origin from proxied public IPs.

## Experiments

### Cosmos

Open [/cosmos](https://devth.com/cosmos). The viewport contains a real 3D stellar neighborhood: 4,060 catalogued HYG 4.1 objects within 100 light-years, at linear J2000 positions. Twelve named reference objects include the solar system, Proxima Centauri, Sirius, Vega, and Altair. Choose a reference to see its approximate distance from Earth and the origin-to-star guide. Labels avoid each other and the controls. Earth and the Sun share the origin at this scale; symbol sizes and brightness are exaggerated, and this is a catalog sample rather than a complete census. There are no invented background stars; constellation guide lines are perspective aids, not physical connections. Source data and its CC BY-SA 4.0 attribution are vendored under `public/data/`; builds and runtime need no external astronomy service.

The reference menu also includes **Orion, the Big Dipper, Cassiopeia, Cygnus, Leo, Scorpius, and the Southern Cross**. These add 62 real HYG stars beyond the nearby sample. Selecting a pattern frames it from near the Sun (200 AU away, outside the planetary orbits); its shape changes naturally when you move elsewhere. **Guides** toggles the lines and constellation labels, never the stars or planets. Figure definitions are adapted from Stellarium’s Modern (Sky & Telescope) set; the Big Dipper is an asterism within Ursa Major. Sources, licenses, and regeneration instructions are in `public/data/README.md`.

Drag to orbit; pinch to zoom, or focus the canvas and use arrow keys and +/−. Selecting a reference or **New viewpoint** makes a 2.4-second eased flight to that star, arriving beyond it and facing inward toward the catalog’s center; **Recenter** returns to the selected reference. Manual input interrupts a flight. The readout shows actual camera translation speed and range, using light-years or AU at solar scale. The URL seed changes the camera viewpoint, never the catalogued positions. Reduced motion starts paused and snaps to requested views without flying.

The Sun, all eight planets, elliptical orbital paths, Saturn’s rings, and catalog stars remain in one rendered scene at every zoom. Choose **Solar system** or zoom within 400 AU of the Sun for planetary labels, AU readouts, and the orbital clock. Orbital distances stay proportional in AU; bodies are enlarged within bounded AU limits, so they naturally become tiny at stellar distances. Background stars retain their normal brightness in close-up. `src/solar-system.js` uses [JPL’s approximate J2000 elements](https://ssd.jpl.nasa.gov/planets/approx_pos.html) with fixed Keplerian orbits, not a live ephemeris. The visible UTC orbital clock starts from the current date and advances **one simulated day per real second**—Earth takes about six minutes, Mercury about 88 seconds. Pause, hidden tabs, and an offscreen scene stop the clock; changing viewpoint does not reset it. Reference distances remain available without JavaScript, WebGL, or a successful catalog fetch. The page remains footer-linked, noindex, and excluded from the sitemap.

Reduced-motion users start with drift paused. The scene stops rendering offscreen or in background tabs. There is no loading diagram or substitute sculpture: the background stays dark while the renderer loads or JavaScript is unavailable. A WebGL failure shows a short status; header navigation remains usable. The header never requests Three.js; Cosmos loads its renderer on this experiment page, and destruction loads its renderer only when explicitly triggered; search code and its static index load only when the dialog is first opened, and the contents tracker loads only on pages with a ToC.

The **devth\_** wordmark is ordinary native HTML text and the real accessible home link. It has no WebGL overlay, idle motion, pointer parallax, hover garden or letter-wrapping logic. Other link and heading hovers remain independent SVG art; hovering or focusing the logo never activates them. Navigation retains the normal large-to-compact text transition, without a 3D relief transform.

### Native cursors

Cursors stay browser-native and minimal: the standard arrow, text-selection I-beam, and pointing hand for clickable controls. The Cosmos canvas keeps native grab/grabbing states. There are no custom cursor images, overlays, size overrides, or pointer-tracking scripts. Native editing, dialogs, touch, accessibility settings, and JavaScript-free browsing retain their usual behavior.

### Hover Lab

Open [/hover-lab](https://preview.devth.com/hover-lab), linked beside Cosmos in the footer. Fifteen numbered SVG studies compare the original nine geometric structures with asymmetric mycelium, bramble, coral, tendrils, spores, and storm roots. Hover a glyph **or its name**, or focus its preview button; click or tap either to hold, and again to stop. **Compare all** animates visible studies together.

**Generator mode is on by default.** Growth follows each source's own structural rules: the sigil extends triangular struts, the space frame builds cubic trusses, and the geodesic cage adds triangulated shells. Double/triple helices retain their strand counts and rungs; the braid weaves, the spring coils, the torus knot closes into knotwork, and the gyroscope grows joined tilted rings. Mycelium joins fungal runners, bramble carries thorns and leaves, coral forks into rounded polyps, tendrils send out coiled shoots, spores form unequal sacs, and storm fractures into angular discharge. New growth starts at existing nodes; the seed and completed geometry stay at a fixed scale rather than stretching. In Hover Lab, growth pauses on leave and resumes on return. **Clear growth**, Escape, or switching the generator off clears the garden. A pointer-transparent fixed SVG can spill across the screen without creating document overflow or blocking controls. Hover Lab comparison specimens have at most 24 live tips and 680 curves across six paths; a retained core and rolling outer detail keep growth continuous without an ever-growing tree. Completed drawing units retire together, so budget eviction does not shred cages into unrelated struts. Growth draws at 30fps, with fixed simulation steps and active/visible-only lifecycle controls.

Site-wide link and heading hovers choose a fresh random structure by default. During each active hover, completed strokes accumulate rather than recycling older visible lines at the former 680-curve limit. Live tips remain bounded at 24; retained history and rendering cost grow with hover duration and are released after exit/unwind. The entire seed draws in stroke by stroke over 650ms before extensions grow; leaving early unwinds only the portion already drawn. Switching apps or tabs preserves and pauses the current drawing, including any unwind or clicked-heading hold, then resumes without reseeding on return. Seeded variations change subdivisions, winding, proportions, spacing, forks, and birth timing within each visual grammar, rather than merely rotating or scaling a shared plant or ornament stamp. On hover/focus exit, newest growth retracts toward the seed over **800ms** while a fresh hover starts alongside it. Each owner retains at most 12 outgoing specimens during rapid input; expired specimens remove their SVGs, timers, and animation work. Entire writing rows activate title-anchored previews, including metadata and whitespace; hovering a year activates the existing previews on all of that year’s visible titles together, with the same 800ms unwind on leave. Reduced motion keeps the grouped title-color feedback without moving glyphs. Category links keep their separate filter destinations. Escape, reduced motion, and page-lifecycle cleanup remain immediate, and clicked headings keep their separate five-second hold. In **Cmd+K**, the **Structure** selector chooses Random or one of the 15 studies, and **Generation** toggles structural growth. Both preferences persist in `localStorage` under `devth:hover-preferences:v1`, synchronize across tabs, and degrade to in-memory settings if browser storage is unavailable. Hover Lab keeps its named comparison specimens and shares the generation preference. Reduced motion overrides animation without overwriting saved choices.

All shapes are pre-rendered and remain viewable without JavaScript. Reduced motion keeps them static; one animation loop services only active, visible studies and stops when nothing is running, the page loses focus, or it is hidden. This page is noindex, excluded from the sitemap/feed/MCP catalog, but available in quick navigation. Its counter uses its own path in the existing namespace, with no storage or identity changes.

### Navigation and contents

At the author’s request, on-page writing renders lowercase, except Trevor Hartman’s name, explicit acronyms, and case-sensitive literals. `src/lettercase.js` marks known acronyms, visible URLs, and environment-variable names at build time and in dynamic search results; code blocks, inline code, keyboard labels, and user-entered fields keep their case. Add new acronyms to that list when publishing. Original Markdown, headings/anchor IDs, metadata, and MCP document bodies retain their authored content. Header/footer divider rules are removed; X and GitHub are accessible icon links in the footer. About’s photo repeats horizontally in a borderless, full-browser-width strip, 600px high. Each square tile keeps its natural proportions, with the central image retaining its accessible description and no-JavaScript fallback.

Header/footer navigation and category links use lowercase labels. Category labels link to `/?category=…#writing`, where the enhanced archive applies an exact category filter. With JavaScript disabled, these remain native links to the complete, readable archive.

Cmd+K or Ctrl+K opens global quick navigation. Type to filter; arrows or Ctrl+N/Ctrl+P select the next/previous result, Enter follows its ordinary anchor, and Escape closes and restores focus. Search failure leaves a home link and normal navigation available. Browsers without dialog support retain the existing navigation.

Articles with multiple headings get a contents rail without a visible title. Its navigation retains an accessible name. The active heading segment stays visible even before the first section enters the reading marker, including flat heading lists. Its desktop sidebar sticks beside the prose; on narrow screens it becomes a compact section above the article. A stepped SVG line follows heading nesting and fills with scroll progress; the current heading’s whole segment remains highlighted. Hovering a contents link or a section heading visually activates that heading without scrolling. Clicking a contents link activates its destination on arrival; clicking a heading directly does the same. Click activation holds for five seconds, then its accent color and shared hover glyph fade back over 180ms, even if the pointer or focus has stayed put. Fresh hover/focus reactivates it. Link, button, and heading hover colors transition in both directions. Reduced motion keeps immediate color feedback without glyph animation or fades, and disables the rail’s interpolation, not its progress indication. Existing heading IDs remain unchanged, including `$EDITOR` → `#editor`; trusted inline-HTML headings receive unique IDs too.

### Page transitions

The homepage restores an oversized responsive **devth** logo rather than a visible “Writing” title. Its shared `site-brand` view-transition name animates the large mark into the compact header mark when opening an article, and back on return, with a 200ms transition and reduced-motion opt-out.

Vite builds the static pages; a small client-side navigation layer preserves the actual header/nav, background graph, search dialog and loaded index, footer links, preferences, and active nav hover art. It fetches same-origin HTML into an inert template, swaps the main content and page counter, and updates titles, canonical/social/robots metadata, page classes, and styles. Page-specific heading/contents controllers, Hover Lab gardens, and Cosmos observers/listeners/animation/GPU resources are disposed and remounted rather than accumulating. Counter images receive a per-visit cache-buster without changing their page identities or storage.

Supported browsers animate only the content and brand through View Transitions, leaving shared navigation and hover art live. Outgoing content shifts 32px left and fades over 150ms while the incoming content shifts in from 48px right and fades over 280ms. Both start together, with a full-viewport paper surface and no delayed tint animation, including Cosmos's own dark palette. Existing `aria-busy` distinguishes the outgoing snapshot, so there is no additional navigation state or animation dependency. Reduced motion disables the transition entirely. Back/Forward restores reading position and the per-entry writing filter; late layout restoration yields immediately to user input. Keyboard navigation moves focus into the new main content, and a polite live region announces the destination.

Fragment links, downloads, external links, and modified clicks retain their ordinary semantics. A newer site build, failed HTML/style request, non-site response, or missing enhancement falls back to a real document navigation. Without JavaScript, all pages, ordinary links, and the CSS cross-document transition still work. There is no artificial loading delay.

### X profile on About

About has a direct **@devth on X** link outside its authored article. It works without JavaScript and makes no requests to X until the visitor follows the link. There is no embedded timeline, third-party loader, loading state, or local consent state.

The official opt-in timeline was removed after repeated live checks found X returning HTTP 429 for its feed endpoint. `tests/browser/x-profile.spec.js` verifies the direct link, no third-party requests or embed, and the no-JavaScript version. These tests do not claim to verify X’s profile availability.

### Public content MCP

Connect an MCP client using **Streamable HTTP** to **`https://devth.com/mcp`**. No login or API key is needed. Opening the endpoint in a browser shows setup instructions and available tools, without JavaScript. HTML GET responses are noindex/no-store; GET requests without an accepted `text/html` type or requesting an event stream still return 405. MCP POST behavior is unchanged. Production serves MCP through its Worker; preview remains asset-only.

- **Resources:** every published post plus About, Overture, and Glossary, identified by the page's canonical HTTPS URL and served as `text/markdown`. Resource reads return the original Markdown body and allowlisted content metadata in `_meta["devth.com/content"]`.
- **`list_content`** — list titles, canonical URLs, dates, categories, and excerpts without full article bodies.
- **`search_content`** — pass `query` and optionally `limit` (1–20, default 10). Searches titles, categories, excerpts and full bodies using case-insensitive literal terms; every term must match. Returns metadata and passages from matching articles, in archive order.
- **`read_content`** — pass `identifier`, an exact canonical URL or path from the other tools, such as `https://devth.com/beautiful-constraint` or `/beautiful-constraint`. Returns metadata and the complete original Markdown body. Relative links resolve against the returned canonical URL.
- **`get_hit_count`** — pass the same exact canonical URL or path as `read_content`, for example `{ "identifier": "/about" }`. Returns `{ "path": "/about", "url": "https://devth.com/about", "hitCount": 123 }` (illustrative count). Reads the existing production counter directly without incrementing it. These are counter-image requests, not unique visitors. Only published posts and the three authored pages are accepted, not the homepage, Cosmos, Hover Lab or arbitrary URLs. Storage failures return a tool error, not a misleading zero.

Both the website and MCP catalog use `scripts/content.js`. Each site build writes `production/.generated-content.json`, an ignored build input bundled into the Worker, not a new public asset. Only `posts/` and the three explicit authored pages are loaded. Drafts, unpublished non-posts, the homepage's generated archive, Cosmos/Hover Lab application source and error pages are not MCP documents. Frontmatter is allowlisted into public metadata rather than returned wholesale. Content reads never fetch user-supplied URLs or access the filesystem at runtime, and do not increment hit counters. `get_hit_count` uses the existing `COUNTERS` Durable Object binding with `visit(false)`; it does not request the SVG or create another counter namespace.

The official MCP SDK handles initialization, protocol errors and JSON responses. The endpoint is stateless, with a fresh server and transport per request; no new Durable Object or database. POST bodies are limited to 32 KiB, queries to 200 characters, and read identifiers to 2,048 characters. There is no persistent GET/SSE stream or session deletion. Responses are `noindex` and `no-store`.

Native/server-side clients can connect without an Origin header. Browser clients must send the endpoint's exact Origin; same-origin OPTIONS preflight is supported, but arbitrary cross-origin browser embeds are not. Local testing permits localhost-class hosts. Adding another browser client origin requires an explicit allowlist change, not wildcard CORS. Existing Cloudflare protections still apply; anonymous access is not an unlimited-use guarantee.

`tests/production/mcp.spec.js` connects the official SDK client to the built Worker under local Wrangler and checks resource discovery, full-text search, original Markdown reads, live hit-count reads without increments, and HTTP protections. Run it with `npm run test:production`.

### Hit counters

Production pages embed an SVG from `https://devth.com/counter.svg`. Preview pages continue to use `devth-hit-counter-preview.devth.workers.dev`. Each GET increments that page’s Durable Object counter atomically; HEAD reads without incrementing. Responses use `Cache-Control: no-store`. Only generated, published page paths are accepted, so arbitrary URLs cannot create new counter objects.

These count counter-image requests, not unique people: reloads and bots can count; disabled images, blockers, and back/forward-cache restores may not. This counter itself uses no cookies, visitor identifiers, or analytics script. Cloudflare Web Analytics is separately enabled at the edge, rather than embedded in this repository’s HTML. Its dashboard currently includes production and preview traffic; filter by hostname when interpreting those reports. Absence of a beacon in the source or a single fetched response is not sufficient to establish whether edge analytics is enabled. Production counts start fresh in the `devth-com` Worker’s namespace and persist across deployments. Existing preview/test totals remain in the separate original preview namespace; production never imports or resets them. A failed counter cannot prevent the static writing from loading.

Set `COUNTER_ORIGIN` at build time to point at another instance. Local Playwright tests use port 4174; live tests can also set `COUNTER_ORIGIN` to override the deployed counter. The counter’s source page list is regenerated before Wrangler builds; `counter/.generated-pages.json` is ignored.

The 2016 Yetibot article referenced an IRC screenshot absent from both Git history and the live site. The broken image is omitted without adding editorial text. All other local images and article content are retained.
