import { writeFile } from "node:fs/promises";

export async function writeMcpContent({ posts, pages }) {
  const catalog = [...posts, ...pages].map((entry) => ({
    title: entry.title,
    path: "/" + entry.slug,
    url: "https://devth.com/" + entry.slug,
    type: entry.date ? "post" : "page",
    date: entry.date || null,
    categories: entry.categories || [],
    excerpt: entry.excerpt || "",
    content: entry.content,
  }));
  await writeFile(
    new URL("../production/.generated-content.json", import.meta.url),
    JSON.stringify(catalog),
  );
}
