import { test, expect } from "@playwright/test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

test("a real MCP client discovers, searches and reads published writing through the production Worker", async ({
  baseURL,
}) => {
  const client = new Client({ name: "devth-integration", version: "1.0.0" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", baseURL)));
    expect(client.getServerVersion().name).toBe("devth.com");
    const { tools } = await client.listTools();
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_content",
      "search_content",
      "read_content",
      "get_hit_count",
    ]);
    const { resources } = await client.listResources();
    expect(resources).toHaveLength(20);
    const uri = "https://devth.com/beautiful-constraint";
    const resource = await client.readResource({ uri });
    expect(resource.contents[0].text).toContain("spartan nature");
    const search = await client.callTool({
      name: "search_content",
      arguments: { query: "spartan nature" },
    });
    expect(search.isError).not.toBe(true);
    const found = JSON.parse(search.content[0].text).items.find((item) => item.url === uri);
    expect(found.snippet).toContain("spartan nature");
    const read = await client.callTool({
      name: "read_content",
      arguments: { identifier: found.url },
    });
    const { content, ...metadata } = JSON.parse(read.content[0].text);
    expect(content).toBe(resource.contents[0].text);
    expect(resource.contents[0]._meta).toEqual({ "devth.com/content": metadata });
    const unknown = await client.callTool({
      name: "read_content",
      arguments: { identifier: "/drafts/private" },
    });
    expect(unknown.isError).toBe(true);
  } finally {
    await client.close();
  }
});

test("MCP returns live hit counts without incrementing the persistent counter", async ({
  baseURL,
  request,
}) => {
  const path = "/counter.svg?page=%2Fglossary";
  const initial = Number((await request.head(path)).headers()["x-page-views"]);
  const image = await request.get(path);
  expect(Number(image.headers()["x-page-views"])).toBe(initial + 1);
  const client = new Client({ name: "devth-counter-integration", version: "1.0.0" });
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL("/mcp", baseURL)));
    await client.readResource({ uri: "https://devth.com/glossary" });
    for (const identifier of ["/glossary", "https://devth.com/glossary"]) {
      const reply = await client.callTool({ name: "get_hit_count", arguments: { identifier } });
      expect(reply.isError).not.toBe(true);
      expect(reply.structuredContent).toEqual({
        path: "/glossary",
        url: "https://devth.com/glossary",
        hitCount: initial + 1,
      });
    }
    expect((await request.head(path)).headers()["x-page-views"]).toBe(String(initial + 1));
  } finally {
    await client.close();
  }
});

test("browser MCP instructions work without JavaScript at desktop and mobile widths", async ({
  browser,
  baseURL,
}, testInfo) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    const response = await page.goto(baseURL + "/mcp");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("text/html; charset=utf-8");
    expect(response.headers()["x-robots-tag"]).toBe("noindex");
    expect(response.headers()["cache-control"]).toBe("no-store");
    await expect(page.getByRole("heading", { name: "devth.com MCP", exact: true })).toBeVisible();
    await expect(
      page.getByText("pi mcp add devth --url https://devth.com/mcp", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("get_hit_count", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "devth.com", exact: true })).toHaveAttribute(
      "href",
      "/",
    );
    for (const width of [1440, 393]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath("mcp-help-" + width + ".png") });
    }
  } finally {
    await context.close();
  }
});

test("MCP stays outside search indexing and rejects unsupported methods and browser origins", async ({
  request,
}) => {
  const response = await request.get("/mcp", { headers: { Accept: "text/event-stream" } });
  expect(response.status()).toBe(405);
  expect(response.headers()["allow"]).toBe("GET, POST, OPTIONS");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const blocked = await request.post("/mcp", {
    headers: { Origin: "https://evil.example" },
    data: {},
  });
  expect(blocked.status()).toBe(403);
});
