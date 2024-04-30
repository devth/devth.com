import { Grid, Link, Typography } from "@mui/material";
import { ReactElement } from "react";

export default function Overture(): ReactElement {
  return (
    <Grid container>
      <Grid item xs={0} sm={2} />
      <Grid item xs={12} sm={8}>
        <Typography textAlign={"center"} variant="h3">
          Overture
        </Typography>
        <p>
          Programming, tools, and processes are stuck in the past, held in place
          by hordes of OO-wielding proletariats collectively chanting "good
          enough".
        </p>

        <p>Let's find a better way.</p>

        <h2>Recommended works</h2>

        <p>
          We are inundated with programming posts of varying quality. This is a
          curated list of only the best or most important I've come across.
        </p>

        <h3>Philosophy</h3>

        <ul>
          <li>
            <Link href="https://alistapart.com/article/i-am-a-creative/">
              I am a creative
            </Link>
            {" — "} by Jeffrey Zeldman, January 29, 2024
          </li>
          <li>
            <Link href="https://www.technologyreview.com/s/531911/isaac-asimov-asks-how-do-people-get-new-ideas/">
              Isaac Asimov Asks, “How Do People Get New Ideas?”
            </Link>
            — An insightful essay on the fragile process of creativity by the
            brilliant science fiction writer.
          </li>
          <li>
            <Link href="http://mth.io/posts/complexity-and-learning/">
              Complexity and Learning (2011)
            </Link>
            — The view on learning and applying knowledge described here is one
            I've long held and argued for. This post uses an intuitive analogy
            of runtime complexity to describe learning a concept and the cost of
            applying it over time.
          </li>
        </ul>

        <h3>Functional Programming</h3>

        <ul>
          <li>
            <Link href="http://learnyouahaskell.com/chapters">
              Learn You a Haskell for Great Good!
            </Link>{" "}
            by Miran Lipovača — Have you read a million monad tutorials and
            still don't get it? This was the case for me and learning Haskell is
            what made it finally click. As a bonus, this book is also hilarious
            and brilliantly written and illustrated; one of my all-time
            favorites.
          </li>
          <li>
            <Link href="https://bartoszmilewski.com/2014/10/28/category-theory-for-programmers-the-preface/">
              Category Theory for Programmers
            </Link>
            — I'll be working through this for quite a long time, but it's
            mind-blowing and very challenging so far.
          </li>
          <li>
            <Link href="http://www.manning.com/bjarnason/">
              Functional Programming in Scala
            </Link>{" "}
            by Paul Chiusano and Rúnar Bjarnason — Many of my topics and ideas
            came from this book.
          </li>
          <li>
            <Link href="http://eed3si9n.com/learning-scalaz/">
              Learning Scalaz
            </Link>
            — This series of blog posts loosely follows LYAH and introduces
            <Link href="https://github.com/scalaz/scalaz">Scalaz</Link>'
            equivalents to many of Haskell's classes.
          </li>
        </ul>

        <h3>Distributed Systems</h3>

        <ul>
          <li>
            <Link href="http://thesecretlivesofdata.com/raft/">
              Raft: Understandable Distributed Consensus
            </Link>
            - amazing and inspiring data visualization of the Raft consensus
            algorithm. Even if you're not interested in Raft itself, go through
            this because it demonstrates so well the power of visualization in
            understanding complex interactions. (How can we get this level of
            quality in our own systems' documentation?)
          </li>
        </ul>

        <h3>Writing</h3>

        <ul>
          <li>
            <Link href="https://www.youtube.com/watch?v=OV5J6BfToSw">
              Linguistics, Style and Writing in the 21st Century - with Steven
              Pinker
            </Link>{" "}
            (YouTube) — A wonderful and highly entertaining talk about writing.
            We should pursue excellence in this area as knowledge workers since
            writing is a core part of what we do.
          </li>
        </ul>

        <p>Some gems:</p>

        <blockquote>
          <p>Writing is an act of pretense.</p>

          <p>Writing is an act of craftsmanship.</p>

          <p>Writing is an unnatural act</p>

          <p>Prose as a window onto the world</p>

          <ul>
            <li>The writer has seen something in the world</li>
            <li>He positions the reader so she can see it with her own eyes</li>
          </ul>

          <p>The reader and writer are equals</p>

          <p>The goal is to help the reader see objective reality</p>

          <p>
            Beautiful idea that the reader and writer are equals. Do not write
            in a way that is above critics or attempts to cover all bases, to be
            impenetrable.
          </p>

          <p>
            Show examples, often! Focus on the subject! Not meta concerns such
            as the studying of the thing, the process, etc.
          </p>

          <p>
            Minimize the kind of apologizing that academics in particular feel
            compelled to do.
          </p>

          <p>
            Classic prose gives the reader credit for knowing that many concepts
            are hard to define, many controversies hard to resolve. The reader
            is there to see what the writer will do about it.
          </p>

          <p>Minimize hedging</p>

          <p>
            Classic prose: Better to be clear & possibly wrong than muddy and
            "not even wrong."
          </p>

          <p>Count on the cooperative nature of ordinary conversation</p>

          <p>
            Use the active voice. The active voice is usually more direct and
            vigorous than the passive.
          </p>

          <p>
            Interesting idea: a sentence is a linear string of words but it's
            describing a non-linear graph of knowledge. It presents some bits of
            information to the reader before others, affecting the way the
            information is absorbed. The passive voice allows writers to vary
            the order in which ideas are presented and absorbed.
          </p>

          <p>
            Good writers narrate a story, advanced by protagonists who make
            things happen.
          </p>

          <p>
            Bad writers work backward from their own knowledge, writing down
            ideas in the order in which they occur to them.
          </p>

          <p>
            They begin with the outcome of an event, and then throw in the cause
            as an afterthought.
          </p>

          <p>The passive makes that easy.</p>

          <p>Ouch.</p>

          <p>The curse of knowledge</p>

          <p>
            When you know something, it's hard to imagine what it is like for
            someone else not to know it. aka mindblindness, egocentrism,
            hindsight bias
          </p>

          <p>aka Monads 😂</p>

          <p>Something to consider for technical writers!</p>

          <p>
            Such density of good advice in this talk. But if you'd rather not
            watch an hour-long video, start with{" "}
            <Link href="https://threadreaderapp.com/thread/1084490338629242880.html">
              Steven's short Twitter thread on the same topic
            </Link>
            .
          </p>
        </blockquote>
      </Grid>
      <Grid item xs={0} sm={2} />
    </Grid>
  );
}
