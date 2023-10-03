import { Typography, darken, lighten, useMediaQuery } from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import path from "path";
import Layout from "../components/Layout";
import { Link } from "../components/Link";
import { matchFilePath, postFilePaths, POSTS_PATH } from "../utils/mdxUtils";

/** Format a javascript date like yyyy-mm-dd */
const formatDate = (d: Date) => d.toLocaleDateString("en-us");

// d.toLocaleDateString("en-us", {
//   year: "numeric",
//   month: "numeric",
//   day: "numeric",
// });

type Post = {
  content: string;
  data: {
    [key: string]: any;
  };
  /** ISO 8601 Date string */
  dateString: string;
  slug: string;
  filePath: string;
};

type PostWithDate = Post & {
  date: Date;
};

export default function Index({ posts }: { posts: Post[] }) {
  const postsWithDate = posts
    .flatMap((post) => {
      const date = new Date(post.dateString);
      if (isNaN(date.getTime())) {
        return [];
      }
      const p: PostWithDate = {
        ...post,
        date,
      };
      return [p];
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime());
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const gray = prefersDarkMode ? "#aaa" : "#555";

  return (
    <Layout>
      <ul
        style={{
          listStyle: "none",
          padding: 0,
        }}
      >
        {postsWithDate.map((post) => (
          <li key={post.filePath} style={{ marginTop: 0 }}>
            <Link
              disableHover={false}
              style={{ display: "block", padding: "20px 0" }}
              as={`/${post.slug}`}
              href={`/[slug]`}
            >
              {/* <pre>{JSON.stringify(post, null, 2)}</pre> */}
              <Typography
                sx={{
                  display: "inline",
                  fontSize: "4rem",
                  lineHeight: 1.1,
                  fontWeight: "bold",
                }}
              >
                {post.data.title}
              </Typography>
              <Typography
                variant="subtitle1"
                sx={{ fontSize: ".9rem", color: gray }}
              >
                <b
                  style={{
                    fontSize: "1.2em",
                    color: lighten(gray, 0.4),
                  }}
                >
                  {formatDate(post.date)}
                </b>{" "}
                {post.data.excerpt}
              </Typography>
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
    const { year, month, day, slug } = matchFilePath(filePath);

    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

    const p: Post = {
      content,
      data,
      dateString: date.toISOString(),
      slug,
      filePath,
    };
    return p;
  });

  return { props: { posts } };
}
