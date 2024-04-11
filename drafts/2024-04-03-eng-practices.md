# Engineering Practices

## Oncall

- Every alert should be actionable, and be accompanied by a runbook.
- If an alert is triggered often, build automation to prevent the incident from
  happening again.

## Forcing Functions

If you have a standard it must be automatically enforced.

- Test Coverage
- SLAs
- Retrospectives
- Accountability

## Make the World Small

Well defined interfaces
Loose coupling between teams and organizations
Compare your offering to that of a 3rd party vendor. Consider the differences in
quality between your API and that of Stripe's, or GitHub's.

## Dependency versions up to date

Never be more than 1 version behind latest.
It often makes sense to wait for the x.1 or x.2 version so that initial bugs can
be irioned out.
Example: eslint 9. Eslint loves to break backwards compatability on a regular
basis, causing widespread pain throughout the many projects that depend on it.
If on a Next.js project you upgrade to eslint 9.0.x, you're inviting pain and
incompatabilities between how Next.js expects eslint to be configured, and out
of date docs.

## Tune your notifications

If someone requests your review on a PR or @mentions someone in a task, they
shouldn't _also_ need to ping that user on chat and ask them to follow up.

I've seen teams create entire automation systems around spamming people with
notifications, just because people aren't getting them or responding to them.

If you get so many notifications that they've become noise, unsubscribe from
unimportant, non-actionable notifications so that when someone does @mention you
for something the notification doesn't get buried.

If this is something your team is not already good at, you'll need a [Forcing
Function] to change behavior. One idea would be to use gamification to
incentive behavior change. Create a leaderboard of PR Reviews Requested with
time-to-respond and ratio of Reviews Requested vs Reviews Given.

## Autonomy with Accountability

## Lazy loading product features

## Roadmaps aren't great

## Scrum isn't good

## CD from the beginning

When you create an app setup a CI/CD pipeline that automatically deploys every
commit on your main branch to production. This is non negotiable. Never turn it
off. It's a Forcing Function for so many other good practices.

## Encode correctness in the system

Unit tests, type checkers, linters - encode the notion of correctness however
you possibly can.

## Never check-in generated code

## Avoid automated commits

Except in certain cases where git is just being used as an audit log, or you
have a system like `kargo` that's using git as a serialization engine for a
higher-level process such as automatic environment promotion.

## Do not fork open source internally
