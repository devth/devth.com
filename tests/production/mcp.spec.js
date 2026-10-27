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

test("MCP stays outside search indexing and rejects unsupported methods and browser origins", async ({
  request,
}) => {
  const response = await request.get("/mcp");
  expect(response.status()).toBe(405);
  expect(response.headers()["allow"]).toBe("POST, OPTIONS");
  expect(response.headers()["x-robots-tag"]).toBe("noindex");
  expect(response.headers()["cache-control"]).toBe("no-store");
  const blocked = await request.post("/mcp", {
    headers: { Origin: "https://evil.example" },
    data: {},
  });
  expect(blocked.status()).toBe(403);
});
