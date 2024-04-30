import { remarkCodeHike } from "@code-hike/mdx";
import { CH } from "@code-hike/mdx/components";
import { UTCDate } from "@date-fns/utc";
import {
  Grid,
  Stack,
  Typography,
  TypographyProps,
  useTheme,
} from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import { MDXRemote } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import dynamic from "next/dynamic";
import Head from "next/head";
import { useRouter } from "next/router";
import path from "path";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";
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

const HashHeader = (props) => {
  const theme = useTheme();
  const highlightColor = useHighlightColor();
  const router = useRouter();
  return (
    <Typography
      id={props.id}
      variant={props.variant}
      onClick={() => {
        router.push(`#${props.id}`);
      }}
      sx={{
        cursor: "pointer",
        transition: "color .2s ease-out",
        "&:hover": {
          // color: lighten(theme.palette.primary.main, 0.1),
          "&:before": {
            content: '"#"',
            color: highlightColor,
            fontSize: ".8em",
            fontFamily: "monospace",
            fontStyle: "normal",
            position: "relative",
            marginLeft: "-1.3ch",
            paddingRight: "0.3ch",
          },
        },
      }}
    >
      {props.children}
    </Typography>
  );
};
HashHeader.displayName = "HashHeader";

// eslint-disable-next-line react/display-name
const Header = (variant: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => (
  props: TypographyProps & { id: string }
) => {
  return <HashHeader variant={variant} {...props} />;
};
Header.displayName = "Header";

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

  h1: Header("h1"),
  h2: Header("h2"),
  h3: Header("h3"),
  h4: Header("h4"),
  h5: Header("h5"),
  h6: Header("h6"),
};

export default function PostPage({ segments, source, frontMatter }) {
  const highlightColor = useHighlightColor();
  const highlightHoverColor = useHighlightHoverColor();

  const { year, month, day } = segments;
  const date = new UTCDate(`${year}-${month}-${day}`);
  return (
    <>
      <Head>
        <title>{frontMatter.title}</title>
        <meta property="og:title" content={frontMatter.title} />
        <meta property="og:description" content={frontMatter.excerpt} />
        <meta property="og:type" content="article" />
        <meta
          property="article:published_time"
          content={date.toLocaleDateString("en-us")}
        />
        <meta property="article:author" content="Trevor Hartman" />
      </Head>
      <div className="post-header" style={{ textAlign: "center" }}>
        <Typography variant="h1" style={{ marginBottom: 0 }}>
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
