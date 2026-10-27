---
title: "feat: Expose published writing through MCP"
date: 2026-10-27
type: feat
artifact_contract: ce-unified-plan/v1
product_contract_source: ce-plan-bootstrap
---

# Public Content MCP

## Goal Capsule

Expose the site's published writing at `https://devth.com/mcp` as MCP resources and read-only list/search/read tools. The user approved this scope and asked to ship it. Deliver a tested pull request; merging remains with the user. The user subsequently selected a click-to-load @devth profile timeline on About; implement it as a separate unit with no X requests before consent.

## Product Contract

### Requirements

- R1. Anonymous remote MCP clients can initialize and discover content resources and tools using Streamable HTTP.
- R2. Each published post and the about, overture, and glossary pages has a resource identified by its canonical HTTPS URL; reading returns the author's original Markdown body and metadata, not generated editorial copy.
- R3. `list_content` returns metadata, `search_content` searches titles, categories, excerpts and full bodies with relevant snippets, and `read_content` returns full content by canonical URL or path.
- R4. Drafts, other unpublished files, generated error pages and the Cosmos application's source never enter the catalog. The homepage is an archive, not another authored document.
- R5. The endpoint cannot modify content, fetch arbitrary URLs, read arbitrary files, or increment page counters. Existing pages, redirects, SEO directives and counter namespace stay unchanged.
- R6. About includes a click-to-load @devth profile timeline. Before consent there are no X script, iframe, image or preconnect requests. Retain a normal profile link and usable failure state, preserve authored About prose, and keep X code off other pages.

### Acceptance Examples

- AE1. An MCP client lists 20 resources (17 posts and 3 standalone pages), then reads the resource for Beautiful Constraint and gets its original Markdown.
- AE2. A search for a phrase appearing only inside an article body finds that article with its canonical URL and an excerpt around the match; unknown content returns an MCP error without a filesystem or outbound request.
- AE3. Existing HTML rendering and production counter integration tests still pass. Requests to `/mcp` run Worker code; ordinary pages still use direct static assets.

## Planning Contract

### Key Technical Decisions

- KTD1. Public read-only content, no login, no LLM backend. session-settled: user-approved. Rejected alternative: hosted chatbot or authenticated private content; the approved feature is access to existing public writing.
- KTD2. Expose both resources and tools. session-settled: user-approved. Rejected alternative: resources only; tools cover clients without a resource browser.
- KTD3. Share a published-content loader with `scripts/site.js`, retaining existing parsing and sorting semantics. A build-time generator writes an ignored JSON catalog bundled into the Worker. Do not glob the repository or retrieve Markdown from arbitrary user-supplied URLs at runtime.
- KTD4. Use the official MCP TypeScript SDK's Web Standard Streamable HTTP transport in stateless JSON-response mode, with a fresh server/transport per request. Its Fetch interface works on Workers without a new service, database, Express adapter, Agents framework, or protocol implementation of our own. Validate exact installed SDK exports during implementation.
- KTD5. Restrict MCP routing to `/mcp`, allow origin-less native clients and explicitly validated same-site/local browser origins, reject unsupported methods, bound request bodies and tool inputs, and return noindex/no-store headers on MCP responses. No wildcard credentialed CORS or unbounded persistent SSE connections.
- KTD6. The complete catalog is small enough to list without pagination; search results have a configurable bounded limit and snippets, while read returns a complete article. Search is deterministic literal matching, not regex, embeddings or an external service.

### Evidence and Risks

`scripts/site.js` currently owns all post parsing and the three standalone published pages. `production/worker.js` handles only `/counter.svg`, and `wrangler.production.jsonc` uses `run_worker_first` to preserve static asset serving. Preview is a separate asset-only Worker and will not gain MCP in this change. `scripts/counter-pages.js` is already a precedent for generated build input. `tests/static.test.js` protects original authored prose hashes.

Official SDK documentation describes stateless Streamable HTTP and `registerResource`; its `v1.x` Web Standard transport source explicitly supports Cloudflare Workers, JSON responses, and request-body limits. SDK compatibility and Worker bundling must be verified in the real runtime, not only mocked tests. Public endpoints can incur request costs; rely on existing Cloudflare protection and bounded inputs, not a new paid backend. Unknown content must be an exact catalog lookup, not a URL fetch.

References: https://ts.sdk.modelcontextprotocol.io/server and https://github.com/modelcontextprotocol/typescript-sdk/blob/v1.x/src/server/webStandardStreamableHttp.ts .

## Implementation Units

### U1. Generate the published catalog

- **Files:** `scripts/content.js`, `scripts/site.js`, `scripts/mcp-content.js`, `.gitignore`, `package.json`, `tests/content.test.js`.
- **Approach:** Extract current post/page loading without altering original content or metadata. Generate a deterministic catalog including canonical URL, title, type, optional date, categories, excerpt and verbatim body. Wire generation before Worker bundling and production tests. Only the already published source allowlist is accepted.
- **Test scenarios:** Compare every catalog body's content to parsed source; verify exact published set, order and metadata, and absence of draft/unpublished/Cosmos entries. Preserve the existing static publishing suite.
- **Execution note:** Start with a focused failing catalog contract test.

### U2. Serve MCP resources and tools

- **Files:** `production/mcp.js`, `production/worker.js`, `wrangler.production.jsonc`, `package.json`, `package-lock.json`, `tests/mcp.test.js`, `tests/production.test.js`.
- **Approach:** Register resources and three read-only annotated tools using the catalog. Route `/mcp` to a per-request transport. Implement exact canonical/path lookup, bounded literal full-text search with useful snippets, origin validation and request limits. Keep counter handling unchanged.
- **Test scenarios:** Initialize, tools list/call, resources list/read, full-body search and no matches; read unknown/external/traversal-like identifiers; invalid arguments and JSON, protocol errors, unsupported methods, hostile origins, oversized streamed bodies, and concurrent requests reusing JSON-RPC IDs without shared state. Use real Fetch requests through the handler, not mocked protocol results.
- **Execution note:** Add failing protocol coverage before implementing the endpoint.

### U3. Verify deployed routing and document usage

- **Files:** `tests/production/mcp.spec.js`, `README.md`, `scripts/verify-production.js` if needed.
- **Approach:** Exercise the built Worker using an official SDK client against local Wrangler in the existing production test configuration. Document endpoint, resource/tool examples, publication boundary, auth/origin policy and deployment activation after merge. No MCP-related visual UI changes.
- **Test scenarios:** Real client initialize/list/search/read and resource read round-trip, ordinary page and counter regressions, security headers and method behavior.

### U4. Embed the X profile timeline on About

- **Files:** `scripts/site.js`, `src/main.js`, `src/x-timeline.js`, `src/style.css`, `tests/static.test.js`, `tests/browser/site.spec.js`, `README.md`.
- **Approach:** Add a neutral X section outside the authored article, with a profile link, load button and status. Load the official widgets script and call `twttr.widgets.createTimeline` only after explicit click; request do-not-track mode, use the current color scheme, bound height, and retain a profile link on blocked/failed loading. No automatic embed, scraping, API credentials or tracking preconnects. Update the static generation copy list for the lazy module.
- **Test scenarios:** No third-party requests before click or on other pages; a mocked official widget API renders after click; script/widget failure leaves a useful status and profile link; keyboard and mobile fit; original prose hashes remain unchanged. Browser tests intercept X traffic rather than depend on the live external service.
- **Execution note:** User selected Profile timeline on About through the side-quest decision handshake; this is added scope after the initial MCP plan review.

## Verification Contract

- `npm run check`: formatting and lint pass.
- `npm run build && npm test`: existing site and catalog/protocol unit tests pass; exact prose regression hashes remain intact.
- `npm run build:production`: production asset and indexing checks pass.
- `npm run test:production`: real SDK client and production Worker integration pass alongside existing counters and www redirects.
- `npm run test:browser`: existing browser behavior remains intact; no new UI is introduced.
- `npx wrangler deploy --config wrangler.production.jsonc --dry-run`: Worker bundles successfully without Node-only transport requirements or uploaded secrets.

## Definition of Done

U1-U4 are implemented and verified. Independent review findings are resolved or explicitly reported. The scoped changes are committed and pushed with an open PR and decided CI. The endpoint becomes live through the existing master-only deployment after merge; do not claim production activation before that happens. No changes to authored prose, infrastructure credentials, counter storage or unrelated branches. X integration is confined to the approved click-to-load About section.
