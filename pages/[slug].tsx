import { remarkCodeHike } from "@code-hike/mdx";
import { CH } from "@code-hike/mdx/components";
import { Grid } from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import dynamic from "next/dynamic";
import Head from "next/head";
import path from "path";
import Layout from "../components/Layout";
import { Link } from "../components/Link";
import {
  POSTS_PATH,
  findFilePath,
  matchFilePath,
  postFilePaths,
} from "../utils/mdxUtils";
import { useIsDarkMode } from "../hooks/useIsDarkMode";

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
  const isDarkMode = useIsDarkMode();

  const { year, month, day } = segments;
  const date = new Date(`${year}-${month}-${day}`);
  return (
    <Layout>
      <div className="post-header">
        <h1 style={{ marginBottom: 0 }}>{frontMatter.title}</h1>
        <h3 style={{ marginTop: 0, color: "#999" }}>
          <time dateTime={date.toLocaleDateString("en-us")}>
            {date.toLocaleDateString("en-us")}
          </time>
        </h3>
        {frontMatter.description && (
          <p className="description">{frontMatter.description}</p>
        )}
      </div>
      <main>
        <Grid container>
          <Grid item xs={8}>
            <MDXRemote {...source} components={components} />
          </Grid>
        </Grid>
      </main>
    </Layout>
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
