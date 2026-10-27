import { describe, it, expect } from "vite-plus/test";
import { readFileSync } from "node:fs";
import matter from "gray-matter";

const headers = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
  "MCP-Protocol-Version": "2025-11-25",
};
async function send(body, extraHeaders = {}) {
  const { handleMcp } = await import("../production/mcp.js");
  return handleMcp(
    new Request("https://devth.com/mcp", {
      method: "POST",
      headers: { ...headers, ...extraHeaders },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}
async function rpc(method, params = {}, id = 1) {
  const response = await send({ jsonrpc: "2.0", id, method, params });
  expect(response.status).toBe(200);
  return response.json();
}
const call = (name, args = {}) => rpc("tools/call", { name, arguments: args });
const data = (reply) => JSON.parse(reply.result.content[0].text);

describe("public content MCP", () => {
  it("initializes statelessly and exposes only read-only content tools", async () => {
    const response = await send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      },
    });
    expect(response.headers.get("mcp-session-id")).toBeNull();
    expect(response.headers.get("x-robots-tag")).toBe("noindex");
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body.result.serverInfo.name).toBe("devth.com");
    expect(body.result.capabilities.resources).toBeDefined();
    const tools = (await rpc("tools/list")).result.tools;
    expect(tools.map((tool) => tool.name)).toEqual([
      "list_content",
      "search_content",
      "read_content",
    ]);
    expect(tools.every((tool) => tool.annotations.readOnlyHint)).toBe(true);
  });

  it("lists exactly the published resources and matching metadata without article bodies", async () => {
    const resources = (await rpc("resources/list")).result.resources;
    const items = data(await call("list_content")).items;
    expect(resources).toHaveLength(20);
    expect(items).toHaveLength(20);
    expect(resources.map((resource) => resource.uri).sort()).toEqual(
      items.map((item) => item.url).sort(),
    );
    expect(resources.every((resource) => resource.mimeType === "text/markdown")).toBe(true);
    expect(items.every((item) => !("content" in item))).toBe(true);
    expect(items.some((item) => item.path === "/cosmos")).toBe(false);
    expect(items[0].path).toBe("/iteration-and-play");
  });

  it("reads verbatim Markdown through both resources and URL/path tools", async () => {
    const expected = matter(
      readFileSync("posts/2015-01-30-beautiful-constraint.mdx", "utf8"),
    ).content;
    const uri = "https://devth.com/beautiful-constraint";
    const resource = (await rpc("resources/read", { uri })).result.contents[0];
    expect(resource).toEqual({ uri, mimeType: "text/markdown", text: expected });
    for (const identifier of [uri, "/beautiful-constraint"]) {
      const article = data(await call("read_content", { identifier }));
      expect(article.url).toBe(uri);
      expect(article.content).toBe(expected);
    }
  });

  it("searches full bodies literally and case-insensitively with matching passages and bounded results", async () => {
    const results = data(await call("search_content", { query: "SPARTAN nature" })).items;
    expect(results.some((item) => item.path === "/beautiful-constraint")).toBe(true);
    expect(results.find((item) => item.path === "/beautiful-constraint").snippet).toMatch(
      /spartan nature/i,
    );
    expect(
      data(await call("search_content", { query: "programming", limit: 1 })).items,
    ).toHaveLength(1);
    expect(data(await call("search_content", { query: "nonexistentwordzxq" })).items).toEqual([]);
    expect(data(await call("search_content", { query: "[.*+?" })).items).toEqual([]);
  });

  it("rejects unknown content, external URLs and invalid arguments without offering writes", async () => {
    for (const identifier of ["/drafts/next-guy", "https://example.com/", "/../about", "/cosmos"]) {
      expect((await call("read_content", { identifier })).result.isError).toBe(true);
    }
    for (const uri of [
      "https://devth.com/drafts/next-guy",
      "https://example.com/",
      "https://devth.com/cosmos",
    ]) {
      expect((await rpc("resources/read", { uri })).error).toBeDefined();
    }
    for (const args of [{ query: " " }, { query: "a", limit: 0 }, { query: "a", limit: 21 }]) {
      expect((await call("search_content", args)).result.isError).toBe(true);
    }
    expect((await call("delete_content", { identifier: "/about" })).result.isError).toBe(true);
  });

  it("handles concurrent reused JSON-RPC IDs without sharing transports", async () => {
    const replies = await Promise.all([
      call("read_content", { identifier: "/about" }),
      call("read_content", { identifier: "/overture" }),
      call("read_content", { identifier: "/glossary" }),
    ]);
    expect(replies.map((reply) => data(reply).path)).toEqual(["/about", "/overture", "/glossary"]);
  });

  it("validates browser origins and supports same-origin preflight without wildcard CORS", async () => {
    const { handleMcp } = await import("../production/mcp.js");
    for (const origin of [
      "https://evil.example",
      "null",
      "not a URL",
      "https://devth.com.evil.example",
    ]) {
      expect((await send("{}", { Origin: origin })).status).toBe(403);
    }
    const response = await handleMcp(
      new Request("https://devth.com/mcp", {
        method: "OPTIONS",
        headers: { Origin: "https://devth.com" },
      }),
    );
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("https://devth.com");
    expect(response.headers.get("access-control-allow-methods")).toContain("POST");
    for (const method of ["GET", "DELETE", "PUT"]) {
      const result = await handleMcp(new Request("https://devth.com/mcp", { method }));
      expect(result.status).toBe(405);
      expect(result.headers.get("allow")).toBe("POST, OPTIONS");
    }
    expect((await handleMcp(new Request("https://evil.example/mcp"))).status).toBe(403);
  });

  it("rejects malformed, oversized and unsupported protocol requests", async () => {
    expect((await send("{")).status).toBe(400);
    expect((await send("{}", { "MCP-Protocol-Version": "bogus" })).status).toBe(400);
    expect((await send("x".repeat(33_000))).status).toBe(413);
    const { handleMcp } = await import("../production/mcp.js");
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("x".repeat(33_000)));
        controller.close();
      },
    });
    expect(
      (
        await handleMcp(
          new Request("https://devth.com/mcp", {
            method: "POST",
            headers,
            body: stream,
            duplex: "half",
          }),
        )
      ).status,
    ).toBe(413);
  });
});
