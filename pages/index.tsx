import {
  Timeline,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineItem,
  TimelineSeparator,
  timelineItemClasses,
} from "@mui/lab";
import { Grid, SxProps, Typography, lighten } from "@mui/material";
import fs from "fs";
import matter from "gray-matter";
import { groupBy, sortBy } from "lodash";
import path from "path";
import { Link } from "../components/Link";
import { useIsDarkMode } from "../hooks/useIsDarkMode";
import { POSTS_PATH, matchFilePath, postFilePaths } from "../utils/mdxUtils";
import { UTCDate } from "@date-fns/utc";

/** Format a javascript date like yyyy-mm-dd */
const formatDate = (d: Date) => d.toLocaleDateString("en-us");

const yellow = "#FFCC0033";

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
    const date = new UTCDate(post.dateString);
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

  const isDarkMode = useIsDarkMode();
  const gray = isDarkMode ? "#aaa" : "#666";

  const postLinkSx: SxProps = {
    transition: "all .8s ease-out, padding-bottom .2s ease-out",
    textDecoration: "none",
    display: "inline-block",
    textWrap: "balance",
    position: "relative",
    paddingBottom: 0,

    "&::after": {
      content: "''",
      position: "absolute",
      width: "100%",
      transform: "scaleX(0)",
      borderRadius: "0px",
      height: "8px",
      bottom: "0",
      left: "0",
      background: yellow,
      transformOrigin: "bottom right",
      transition: "transform 0.45s ease-out",
    },
    "&:hover::after": {
      transform: "scaleX(1)",
      transformOrigin: "bottom left",
    },
    "&:hover": {
      paddingBottom: 0,
      // color: "red",
      // textDecoration: "underline",
    },
  };

  return (
    <Grid container>
      <Grid item xs={0} sm={1} />
      <Grid item xs={12} sm={10}>
        <Timeline
          sx={{
            padding: 1,
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
              <TimelineContent sx={{ mt: "-8px" }}>
                <Typography
                  sx={{
                    color: isDarkMode ? "cyan" : "red",
                    // textShadow:
                    //   "1px 1px 0 red, -1px 1px 0 red, -1px -1px 0 red, 1px -1px 0 red",
                    fontWeight: "bold",
                    fontFamily: "monospace",
                  }}
                  variant="h6"
                >
                  {year}
                </Typography>

                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                  }}
                >
                  {posts.map((post) => (
                    <li
                      key={post.filePath}
                      style={{
                        display: "block",
                        marginTop: 25,
                        marginBottom: 25,
                      }}
                    >
                      <Typography
                        variant="h2"
                        sx={{
                          display: "inline",
                        }}
                      >
                        <Link
                          sx={postLinkSx}
                          as={`/${post.slug}`}
                          href={`/[slug]`}
                        >
                          {post.data.title}
                        </Link>
                      </Typography>
                      <Typography
                        variant="subtitle1"
                        sx={{ fontSize: "1rem", color: gray }}
                      >
                        <span
                          style={{
                            fontSize: "1.2em",
                            color: lighten(gray, 0.3),
                          }}
                        >
                          <b>{formatDate(post.date)}</b>
                          {post.data.excerpt && ` •  ${post.data.excerpt}`}
                        </span>
                      </Typography>
                    </li>
                  ))}
                </ul>
              </TimelineContent>
            </TimelineItem>
          ))}
        </Timeline>
      </Grid>
      <Grid item xs={0} sm={1} />
    </Grid>
  );
}

export function getStaticProps() {
  const posts = postFilePaths.map((filePath) => {
    const source = fs.readFileSync(path.join(POSTS_PATH, filePath));
    const { content, data } = matter(source);
    const { year, month, day, slug } = matchFilePath(filePath);

    const date = new UTCDate(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day)
    );

    const p: Post = {
      content,
      data,
      // must be a string for serialization
      dateString: date.toDateString(),
      slug,
      filePath,
    };
    return p;
  });

  return { props: { posts } };
}
