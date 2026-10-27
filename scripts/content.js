import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import matter from "gray-matter";

const root = resolve(import.meta.dirname, "..");

const pageFiles = [
  ["about", "content/about.md"],
  ["overture", "content/overture.md"],
  ["glossary", "non-posts/glossary.mdx"],
];

export async function loadContent() {
  const files = (await readdir(resolve(root, "posts"))).filter((file) =>
    /^\d{4}-\d{2}-\d{2}-.+\.mdx?$/.test(file),
  );
  const posts = await Promise.all(
    files.map(async (file) => {
      const [, date, slug] = file.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.mdx?$/);
      const { data, content } = matter(await readFile(resolve(root, "posts", file), "utf8"));
      return {
        ...data,
        title: data.title.trim(),
        excerpt: (data.excerpt || "").trim().replace(/\s+/g, " "),
        categories: Array.isArray(data.categories)
          ? data.categories
          : [data.categories].filter(Boolean),
        date,
        slug,
        content,
        minutes: Math.max(1, Math.ceil(content.split(/\s+/).length / 220)),
      };
    }),
  );
  posts.sort((a, b) => b.date.localeCompare(a.date));
  const pages = await Promise.all(
    pageFiles.map(async ([slug, file]) => {
      const { data, content } = matter(await readFile(resolve(root, file), "utf8"));
      return { ...data, title: data.title || "Glossary", slug, content };
    }),
  );
  return { posts, pages };
}
