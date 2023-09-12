import fs from "fs";
import path from "path";

// POSTS_PATH is useful when you want to get the path to a specific file
export const POSTS_PATH = path.join(process.cwd(), "posts");
export const NON_POSTS_PATH = path.join(process.cwd(), "non-posts");

// postFilePaths is the list of all mdx files inside the POSTS_PATH directory
export const postFilePaths = fs
  .readdirSync(POSTS_PATH)
  // Only include md(x) files
  .filter((path) => /\.mdx?$/.test(path));

export const postFilePathPattern = /(\d{4})-(\d{2})-(\d{2})-(.+)\.mdx?$/;

export const matchFilePath = (path: string) => {
  const match = path.match(postFilePathPattern);
  if (!match) {
    throw new Error(`Invalid path: ${path}`);
  }
  const [, year, month, day, slug] = match;
  return { year, month, day, slug };
};

export const findFilePath = (slug: string) => {
  console.log("find file path", { slug, postFilePaths });
  return postFilePaths.find((path) => path.endsWith(`${slug}.mdx`));
};

export const filePathFromSegments = ({
  year,
  month,
  day,
  slug,
}: {
  year: string;
  month: string;
  day: string;
  slug: string;
}) => {
  return `${year}-${month}-${day}-${slug}.mdx`;
};
