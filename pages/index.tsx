import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
  timelineItemClasses,
} from "@mui/lab";
import { SxProps, Typography, lighten, useMediaQuery } from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import { groupBy, sortBy } from "lodash";
import path from "path";
import Layout from "../components/Layout";
import { Link } from "../components/Link";
import { POSTS_PATH, matchFilePath, postFilePaths } from "../utils/mdxUtils";
import { useContext } from "react";
import { ColorModeContext } from "../context";

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
  const postsWithDate = posts.flatMap((post) => {
    const date = new Date(post.dateString);
    if (isNaN(date.getTime())) {
      return [];
    }
    const p: PostWithDate = {
      ...post,
      date,
    };
    return [p];
  });

  // group the posts by year, sorted by year descending
  const postsByYear = groupBy(postsWithDate, (p) => p.date.getFullYear());
  const sortedPosts: [string, PostWithDate[]][] = sortBy(
    Object.entries(postsByYear),
    ([year]) => -year
  ).map(([year, posts]) => [year, sortBy(posts, (p) => -p.date.getTime())]);

  const { mode } = useContext(ColorModeContext);
  const isDarkMode = mode === "dark";
  const gray = isDarkMode ? "#aaa" : "#555";

  const postLinkSx: SxProps = {
    display: "block",
    padding: "20px 0px",
    position: "relative",
    paddingLeft: 30,
    "&::before": {
      content: '""',
      backgroundColor: "#FFCC0033",
      borderStyle: "solid",
      borderColor: "#FFCC0033",
      borderWidth: 0,
      position: "absolute",
      // left: "-15px",
      bottom: 0,
      height: "100%",
      width: 0,
      zIndex: -1,
      transition: "all .3s ease-in-out",
    },
    "&:hover::before": {
      bottom: 0,
      width: "100%",
      transition: "all .2s ease-out",
      borderWidth: "0 0 10px 0px",
    },

    "&:hover": {
      color: "black",
      // marginLeft: "20px",
      paddingTop: 20,
      paddingBottom: 20,
      // boxShadow: "inset 0 0 0 0 #FFCC00",
      // transition: "all .2s ease-out",
    },
  };

  return (
    <Layout>
      <Timeline
        sx={{
          [`& .${timelineItemClasses.root}:before`]: {
            flex: 0,
            padding: 0,
          },
        }}
      >
        {sortedPosts.map(([year, posts]) => (
          <TimelineItem key={year}>
            <TimelineSeparator>
              <TimelineDot variant="outlined" color="primary" />
              <TimelineConnector />
            </TimelineSeparator>
            <TimelineContent>
              <Typography sx={{ color: "red", fontWeight: "bold" }}>
                {year}
              </Typography>

              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                }}
              >
                {posts.map((post) => (
                  <li key={post.filePath} style={{ marginTop: 0 }}>
                    <Link sx={postLinkSx} as={`/${post.slug}`} href={`/[slug]`}>
                      <Typography
                        sx={{
                          display: "inline",
                          fontSize: "3rem",
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
            </TimelineContent>
          </TimelineItem>
        ))}
      </Timeline>
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
