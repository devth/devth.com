import { readFileSync, readdirSync } from "node:fs";
import matter from "gray-matter";
import { describe, expect, it } from "vite-plus/test";

describe("published MCP content", () => {
  it("contains exactly the published posts and authored pages with verbatim Markdown", async () => {
    const { loadContent } = await import("../scripts/content.js");
    const { posts, pages } = await loadContent();
    const files = readdirSync("posts").filter((file) => /\.mdx?$/.test(file));
    expect(posts).toHaveLength(files.length);
    expect(posts[0].slug).toBe("iteration-and-play");
    for (const file of files) {
      const slug = file.slice(11).replace(/\.mdx?$/, "");
      const source = matter(readFileSync("posts/" + file, "utf8"));
      const post = posts.find((entry) => entry.slug === slug);
      expect(post.content).toBe(source.content);
      expect(post.title).toBe(source.data.title.trim());
      expect(post.date).toBe(file.slice(0, 10));
    }
    expect(pages.map((page) => page.slug)).toEqual(["about", "overture", "glossary"]);
    for (const page of pages) {
      const path = page.slug === "glossary" ? "non-posts/glossary.mdx" : `content/${page.slug}.md`;
      expect(page.content).toBe(matter(readFileSync(path, "utf8")).content);
    }
  });

  it("bundles only public metadata and content, never unpublished files or arbitrary frontmatter", async () => {
    const catalog = JSON.parse(readFileSync("production/.generated-content.json", "utf8"));
    expect(catalog).toHaveLength(20);
    expect(catalog.map((entry) => entry.path)).toContain("/glossary");
    expect(catalog.map((entry) => entry.path)).not.toEqual(
      expect.arrayContaining(["/cosmos", "/404", "/next-guy"]),
    );
    expect(catalog.filter((entry) => entry.type === "post")).toHaveLength(17);
    for (const entry of catalog) {
      expect(entry.url).toBe("https://devth.com" + entry.path);
      expect(entry.content).toBeTruthy();
      expect(Object.keys(entry).sort()).toEqual(
        ["title", "path", "url", "type", "date", "categories", "excerpt", "content"].sort(),
      );
    }
  });
});
