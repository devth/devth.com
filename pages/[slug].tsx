import fs from "fs";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import dynamic from "next/dynamic";
import Head from "next/head";
import path from "path";
import { Link } from "../components/Link";
import Layout from "../components/Layout";
import {
  filePathFromSegments,
  findFilePath,
  matchFilePath,
  postFilePaths,
  POSTS_PATH,
} from "../utils/mdxUtils";
import { Grid } from "@mui/material";

// Custom components/renderers to pass to MDX.
// Since the MDX files aren't loaded by webpack, they have no knowledge of how
// to handle import statements. Instead, you must include components in scope
// here.
const components = {
  a: Link,
  // It also works with dynamically-imported components, which is especially
  // useful for conditionally loading components for certain routes.
  // See the notes in README.md for more details.
  TestComponent: dynamic(() => import("../components/TestComponent")),
  Head,
};

export default function PostPage({ segments, source, frontMatter }) {
  const { year, month, day } = segments;
  const date = new Date(`${year}-${month}-${day}`);
  return (
    <Layout>
      <div className="post-header">
        <h1>{frontMatter.title}</h1>
        <p className="date">{date.toLocaleDateString("en-us")}</p>
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

  const mdxSource = await serialize(content, {
    // Optionally pass remark/rehype plugins
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
    scope: data,
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
