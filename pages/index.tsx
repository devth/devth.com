import fs from "fs";
import matter from "gray-matter";
import MuiLink, { LinkProps as MuiLinkProps } from "@mui/material/Link";
import path from "path";
import Layout from "../components/Layout";
import { postFilePaths, POSTS_PATH } from "../utils/mdxUtils";
import { Link } from "../components/Link";

type Post = {
  content: string;
  data: {
    [key: string]: any;
  };
  filePath: string;
};

export default function Index({ posts }: { posts: Post[] }) {
  return (
    <Layout>
      <ul>
        {posts.map((post) => (
          <li key={post.filePath}>
            <Link
              as={`/${post.filePath.replace(/\.mdx?$/, "")}`}
              href={`/[slug]`}
            >
              {post.data.date ? `${post.data.date} - ` : ""}
              {post.data.title}
            </Link>
          </li>
        ))}
      </ul>
    </Layout>
  );
}

export function getStaticProps() {
  const posts = postFilePaths.map((filePath) => {
    const source = fs.readFileSync(path.join(POSTS_PATH, filePath));
    const { content, data } = matter(source);

    const p: Post = {
      content,
      data,
      filePath,
    };
    return p;
  });

  return { props: { posts } };
}
