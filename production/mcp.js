import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { CfWorkerJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/cfworker-provider.js";
import { z } from "zod";
import catalog from "./.generated-content.json";

const metadata = catalog.map(({ content: _content, ...entry }) => entry);
const byIdentifier = new Map(
  catalog.flatMap((entry) => [
    [entry.path, entry],
    [entry.url, entry],
  ]),
);
const searchIndex = catalog.map((entry) => ({
  entry,
  body: entry.content.replace(/\s+/g, " "),
  text: [entry.title, entry.excerpt, ...entry.categories, entry.content]
    .join(" ")
    .replace(/\s+/g, " ")
    .toLowerCase(),
}));
const annotations = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};
const result = (value) => ({
  content: [{ type: "text", text: JSON.stringify(value) }],
  structuredContent: value,
});

function createServer() {
  const server = new McpServer(
    { name: "devth.com", version: "1.0.0", websiteUrl: "https://devth.com" },
    { jsonSchemaValidator: new CfWorkerJsonSchemaValidator() },
  );
  for (const entry of catalog) {
    const { content, ...info } = entry;
    server.registerResource(
      entry.path,
      entry.url,
      {
        title: entry.title,
        description: entry.excerpt || entry.title,
        mimeType: "text/markdown",
      },
      async () => ({
        contents: [
          {
            uri: entry.url,
            mimeType: "text/markdown",
            text: content,
            _meta: { "devth.com/content": info },
          },
        ],
      }),
    );
  }
  server.registerTool(
    "list_content",
    {
      description:
        "List all published posts and authored pages on devth.com, with canonical URLs and metadata but no article bodies.",
      inputSchema: {},
      annotations,
    },
    async () => result({ items: metadata }),
  );
  server.registerTool(
    "search_content",
    {
      description:
        "Search devth.com's published titles, categories, excerpts and full Markdown bodies. All whitespace-separated terms must match, ignoring case. Returns canonical URLs and matching passages.",
      inputSchema: {
        query: z.string().trim().min(1).max(200),
        limit: z.number().int().min(1).max(20).default(10),
      },
      annotations,
    },
    async ({ query, limit }) => {
      const terms = query.toLowerCase().split(/\s+/);
      const items = searchIndex
        .filter(({ text }) => terms.every((term) => text.includes(term)))
        .slice(0, limit)
        .map(({ entry, body }) => {
          const lower = body.toLowerCase();
          const positions = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
          const start = Math.max(0, (positions.length ? Math.min(...positions) : 0) - 80);
          const { content: _content, ...info } = entry;
          return { ...info, snippet: body.slice(start, start + 320) };
        });
      return result({ items });
    },
  );
  server.registerTool(
    "read_content",
    {
      description:
        "Read the full original Markdown and metadata for a published post or page. Pass an exact canonical https://devth.com URL or a path such as /beautiful-constraint from list_content or search_content. Does not fetch external URLs.",
      inputSchema: { identifier: z.string().min(1).max(2048) },
      annotations,
    },
    async ({ identifier }) => {
      const entry = byIdentifier.get(identifier);
      return entry
        ? result(entry)
        : {
            isError: true,
            content: [
              {
                type: "text",
                text: "Published content not found. Use list_content to find a canonical URL or path.",
              },
            ],
          };
    },
  );
  return server;
}

const responseHeaders = {
  "Cache-Control": "no-store",
  "X-Robots-Tag": "noindex",
  "X-Content-Type-Options": "nosniff",
  Vary: "Origin",
};

export async function handleMcp(request) {
  const url = new URL(request.url);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  const headers = new Headers(responseHeaders);
  const reject = (status, message) => new Response(message, { status, headers });
  if (!local && url.hostname !== "devth.com") return reject(403, "Forbidden host");
  const origin = request.headers.get("Origin");
  if (origin !== null) {
    if (origin !== url.origin) return reject(403, "Forbidden origin");
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id",
    );
  }
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") {
    headers.set("Allow", "POST, OPTIONS");
    return reject(405, "Use an MCP Streamable HTTP client with POST /mcp.");
  }
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 32_768,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    const combined = new Headers(response.headers);
    for (const [key, value] of headers) combined.set(key, value);
    return new Response(response.body, { status: response.status, headers: combined });
  } finally {
    await server.close();
  }
}
