# devth.com

## Local dev

```bash
yarn dev
```

## Requirements

- [x] Write posts in markdown. Solved via MDX.
- [x] Ability to render React components in posts. Solved via MDX.
- [x] Respect system dark / light mode. Solved via MUI.
- [x] Server side rendering (or static export). Solved via Next.js.
- [x] Super fast. Solved via Next.js client side routing and Vercel hosting.
- [x] Default branch deploys to production automatically. Solved via Vercel. We
      also get preview deploys for PRs!
- [ ] Shift-K to nav to any page
- [ ] Automatic ToC generation
- [ ] Headers create hash links to auto link within posts
- [ ] Animated page transitions
- [x] Preserve the old blog routes which included year in the URL, e.g.
      https://devth.com/2015/thrush-cond-is-not-a-monad. Solved via Next.js URL
      redirects.
- [x] Automatic deploys (via Vercel and GitHub Actions)
- [x] Automatic dependency upgrades (via dependabot)
