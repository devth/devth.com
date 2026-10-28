export const mcpHelp = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>MCP setup — devth.com</title>
  <style>
    :root { color-scheme: light dark; font-family: system-ui, sans-serif; line-height: 1.6; }
    body { max-width: 48rem; margin: 0 auto; padding: 2rem 1.25rem; }
    a { color: inherit; text-underline-offset: .2em; }
    h1, h2 { line-height: 1.2; }
    h2 { margin-top: 2rem; }
    pre { padding: 1rem; border: 1px solid currentColor; overflow-x: auto; }
    code { font-family: ui-monospace, monospace; overflow-wrap: anywhere; }
    pre code { overflow-wrap: normal; }
    dt { margin-top: 1rem; font-weight: 600; }
    dd { margin: .25rem 0 0; }
  </style>
</head>
<body>
  <nav aria-label="Site"><a href="/">devth.com</a> · <a href="/about">About</a></nav>
  <main>
    <h1>devth.com MCP</h1>
    <p>Connect an MCP client to search and read the site's published writing and check its hit counts. No login or API key is required.</p>
    <h2>Connection</h2>
    <dl>
      <dt>Endpoint</dt><dd><code>https://devth.com/mcp</code></dd>
      <dt>Transport</dt><dd>Streamable HTTP, using POST requests</dd>
    </dl>
    <h2>Set up a client</h2>
    <p>Add this remote server in your client's MCP settings:</p>
    <pre><code>{
  "mcpServers": {
    "devth": {
      "url": "https://devth.com/mcp"
    }
  }
}</code></pre>
    <p>With Pi's built-in MCP support, you can run:</p>
    <pre><code>pi mcp add devth --url https://devth.com/mcp</code></pre>
    <p>Then run <code>/reload</code> in an existing Pi session. If an extension manages MCP instead, add the endpoint through that extension.</p>
    <h2>Available tools</h2>
    <dl>
      <dt><code>list_content</code></dt><dd>List published posts and authored pages with their canonical URLs and metadata.</dd>
      <dt><code>search_content</code></dt><dd>Search titles, categories, excerpts and full Markdown bodies. Pass <code>query</code> and optionally <code>limit</code> (1–20).</dd>
      <dt><code>read_content</code></dt><dd>Read original Markdown and metadata. Pass an exact canonical URL or path as <code>identifier</code>.</dd>
      <dt><code>get_hit_count</code></dt><dd>Read a published document's current hit count without incrementing it. Pass the same <code>identifier</code>. Counts image requests, not unique visitors.</dd>
    </dl>
    <h2>Resources and limits</h2>
    <p>Published posts, About, Overture and Glossary are also available as Markdown resources identified by their canonical HTTPS URLs. Drafts, unpublished files and Cosmos source are excluded.</p>
    <p>Everything is read-only. MCP requests do not increment hit counters. POST bodies are limited to 32 KiB; browser clients must use the endpoint's exact origin.</p>
    <p>This HTML page is for browser visits. MCP clients should use POST; persistent GET event streams are not supported.</p>
  </main>
</body>
</html>`;
