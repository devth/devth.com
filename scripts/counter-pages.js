import { readdir, writeFile } from "node:fs/promises";

const posts = (await readdir(new URL("../posts/", import.meta.url)))
  .filter((file) => /^\d{4}-\d{2}-\d{2}-.+\.mdx?$/.test(file))
  .map((file) => "/" + file.slice(11).replace(/\.mdx?$/, ""));
const pages = ["/", "/about", "/overture", "/glossary", "/cosmos", "/hover-lab", "/404", ...posts];
await writeFile(
  new URL("../counter/.generated-pages.json", import.meta.url),
  JSON.stringify(pages),
);
