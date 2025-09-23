import { remarkCodeHike } from "@code-hike/mdx";
import { CH } from "@code-hike/mdx/components";
import { Grid, Typography } from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import dynamic from "next/dynamic";
import Head from "next/head";
import path from "path";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
import { Header } from "../components/HashHeader";
import { Link } from "../components/Link";
import { FallingText } from "../components/FallingText";

// Custom components/renderers to pass to MDX.
const components = {
  CH,
  a: Link,
  Head,
  h1: Header("h1"),
  h2: Header("h2"),
  h3: Header("h3"),
  h4: Header("h4"),
  h5: Header("h5"),
  h6: Header("h6"),
};

export default function GlossaryPage({ source, frontMatter }) {
  return (
    <>
      <Head>
        <title>{frontMatter.title}</title>
        <meta property="og:title" content={frontMatter.title} />
        <meta property="og:type" content="website" />
      </Head>
      <Grid container>
        <Grid size={{ xs: 0, sm: 2 }} />
        <Grid size={{ xs: 12, sm: 8 }}>
          <Typography textAlign={"center"} variant="h1">
            <FallingText>Glossary</FallingText>
          </Typography>
          <MDXRemote {...source} components={components} />
        </Grid>
        <Grid size={{ xs: 0, sm: 2 }} />
      </Grid>
    </>
  );
}

export const getStaticProps = async () => {
  const filePath = path.join(process.cwd(), "non-posts", "glossary.mdx");
  const source = fs.readFileSync(filePath);
  const { content, data } = matter(source);

  const mdxSource = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [[remarkCodeHike, { theme: "github-from-css" }]],
      rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
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
      source: mdxSource,
      frontMatter: { title: "Glossary: Terms and Concepts", ...data },
    },
  };
};
