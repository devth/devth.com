/* eslint-disable @next/next/no-img-element */
import { Grid, Link, Typography } from "@mui/material";
import { ReactElement } from "react";
import Layout from "../components/Layout";

export default function AboutPage(): ReactElement {
  return (
    <Layout>
      <Grid container>
        <Grid item xs={8}>
          <Typography variant="h4">About Trevor Hartman</Typography>
          <p>
            Full stack software engineer with over two decades experience
            growing web and mobile apps. Cares about Developer Experience as
            much as User Experience. Very interested in making your life easier.
          </p>
          <p>
            I wield technology to build great products and experiences and
            strive toward doing exactly that at every layer of the stack:
          </p>
          <ul>
            <li>
              iterating on meticulously-detailed frontends for client sites,
              interactive experiences, and web applications
            </li>
            <li>
              at the API level efficiently piping and transforming data between
              backend and frontend with considerations around concurrency, authn
              and authz
            </li>
            <li>
              at the very back working on a Scala-based in-memory distributed
              columnar data store for eBay which powered real-time analytics for
              seller tools
            </li>
            <li>
              as a Site Reliability Engineer creating automation, standards, and
              modern container-based infrastructure in public and private clouds
            </li>
          </ul>
          <p>
            Strong proponent of using automation to make processes more
            efficient and repeatable. I build an open source chat bot called{" "}
            <Link href="https://yetibot.com">Yetibot</Link> for this purpose and
            for fun.
          </p>
          <p>
            Obsessed with discovering better ways of expressing solutions to
            programming problems. I abhor unsoundness, boilerplate, repetitive
            code and senseless abstraction. On a path of ongoing language
            discovery, from:
          </p>

          <ul>
            <li>early dark ages in Perl, JavaScript¹, Lingo (wat), VB</li>
            <li>middle ages in C# and ActionScript 3, Ruby and Python, Java</li>
            <li>
              up to recent years using Scala with Scalaz, Datalog (via Datomic),
              some Swift
            </li>
            <li>building open source with Clojure (and ClojureScript)</li>
            <li>grinding as necessary with Golang</li>
            <li>playing with Haskell, Eta, Elm, Unison</li>
            <li>and being pragmatic with TypeScript</li>
          </ul>

          <p>
            Part time Pure Functional Programming zealot and Category Theory
            student.
          </p>
          <p>
            Most of my post topics are areas I wanted to better understand, and
            writing about them was a way to achieve that. I don't claim to be an
            expert. Please give me feedback, good or bad, but especially bad. If
            you'd like to chat, I usually hang out on{" "}
            <Link href="https://slack.yetibot.com">Yetibot Slack</Link>, or you
            can Tweet <Link href="https://twitter.com/devth">@devth</Link>.
          </p>
          <p>
            I work remotely on a globally-distributed team for{" "}
            <Link href="https://carta.com/">Carta</Link> helping build the
            future of financial infrastructure. I live in Montana with my wife
            and five kids. I'm an aspiring electronics tinkerer, musician,
            climber,{" "}
            <Link href="https://www.strava.com/athletes/devth">
              mountain biker and cyclist
            </Link>
            , learner, avid{" "}
            <Link href="https://www.last.fm/user/trevorhartman">
              listener of music
            </Link>
            , and maker of things.
          </p>
          <img
            style={{ maxWidth: "100%" }}
            src="/images/dakota-50.jpg"
            alt="Trevor Hartman at the Dakota 5-0 mountain bike race"
          />
        </Grid>
      </Grid>
    </Layout>
  );
}
