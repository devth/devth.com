import { remarkCodeHike } from "@code-hike/mdx";
import { CH } from "@code-hike/mdx/components";
import { UTCDate } from "@date-fns/utc";
import { Grid, Stack, Typography } from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import dynamic from "next/dynamic";
import Head from "next/head";
import path from "path";
import { Link } from "../components/Link";
import {
  useHighlightColor,
  useHighlightHoverColor,
} from "../hooks/useHighlightColor";
import {
  POSTS_PATH,
  findFilePath,
  matchFilePath,
  postFilePaths,
} from "../utils/mdxUtils";

// Custom components/renderers to pass to MDX.
// Since the MDX files aren't loaded by webpack, they have no knowledge of how
// to handle import statements. Instead, you must include components in scope
// here.
const components = {
  CH,
  a: Link,
  // It also works with dynamically-imported components, which is especially
  // useful for conditionally loading components for certain routes.
  // See the notes in README.md for more details.
  TestComponent: dynamic(() => import("../components/TestComponent")),
  Head,
};

export default function PostPage({ segments, source, frontMatter }) {
  const highlightColor = useHighlightColor();
  const highlightHoverColor = useHighlightHoverColor();

  const { year, month, day } = segments;
  const date = new UTCDate(`${year}-${month}-${day}`);
  return (
    <>
      <div className="post-header" style={{ textAlign: "center" }}>
        <Typography variant="h2" style={{ marginBottom: 0 }}>
          {frontMatter.title}
        </Typography>
        <Typography
          variant="h6"
          style={{
            fontFamily: "monospace",
            marginTop: 0,
            color: highlightColor,
            fontWeight: "normal",
          }}
        >
          Trevor Hartman
          {" • "}
          <time dateTime={date.toLocaleDateString("en-us")}>
            {date.toLocaleDateString("en-us")}
          </time>
        </Typography>
        {frontMatter.description && (
          <p className="description">{frontMatter.description}</p>
        )}
      </div>
      <main>
        <Grid container>
          <Grid item xs={0} sm={2} />
          <Grid item xs={12} sm={8}>
            <MDXRemote {...source} components={components} />
            <Stack direction="row" justifyContent="center">
              <Link
                sx={{
                  p: 2,
                  display: "inline-block",
                  textDecoration: "none",
                  fontFamily: "monospace",
                  color: highlightColor,
                  marginTop: 2,
                  fontSize: 50,
                  transitionDuration: "0.4s",
                  "&:hover": {
                    color: highlightHoverColor,
                    // spin on hover
                    transform: "rotate(360deg)",
                  },
                }}
                href="/"
              >
                ⇽
              </Link>
            </Stack>
          </Grid>
          <Grid item xs={0} sm={2} />
        </Grid>
      </main>
    </>
  );
}

export const getStaticProps = async ({ params }) => {
  const filePath = findFilePath(params.slug);

  const segments = matchFilePath(filePath);
  console.log("getStaticProps", { params, filePath });
  const postFilePath = path.join(POSTS_PATH, filePath);
  const source = fs.readFileSync(postFilePath);

  const { content, data } = matter(source);

  console.log("slug data", { data });

  const mdxSource = await serialize(content, {
    // Optionally pass remark/rehype plugins
    mdxOptions: {
      remarkPlugins: [[remarkCodeHike, { theme: "github-from-css" }]],
      rehypePlugins: [],
    },
    scope: {
      ...data,
      chCodeConfig: {
        lineNumbers: true,
        showCopyButton: true,
        skipLanguages: [],
        autoImport: false,
      },
    },
  });

  return {
    props: {
      segments,
      source: mdxSource,
      frontMatter: data,
    },
  };
};

export const getStaticPaths = async () => {
  const paths = postFilePaths
    // Remove file extensions for page paths
    .map(matchFilePath)
    // Map the path into the static paths object required by Next.js
    .map((segments) => ({ params: segments }));

  // console.log("static paths", paths);

  return {
    paths,
    fallback: false,
  };
};
