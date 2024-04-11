Monorepos have become popular in recent years.

## Problems

Monorepos are typically an alternative to standard build tooling. That means
every feature your favorite, wildly popular, community-supported build tool's
features will likely be missing in your monorepo tooling.

## Go All In

If you're going to use a monorepo, you need to absolutely go all in. You need a
dedicated team to maintain your monorepo indefinitely. It's an incredibly
complex and expensive endeavor.

This team should be come an expert in the tooling, whether it's Bazel, Pants,
Buck, Earthly, Learna, or something else.

The monorepo should be the defacto way of building software at your company. Do
not end up in a state where you still have polyrepos alongside your monorepo.

## Vendors as Outsourced Experts

Because monorepos are incredibly complex and the tooling is nowhere near on-par
with the standard tooling, whole companies have spun up around the monorepo
ecosystem. You can hire them to be your experts and help fill the missing
tooling gaps.

They are expensive, but they are probably worth it when you compare their fee to
a few annual developer salaries.

Once again: monorepos are very expensive. Make sure you're all in before
embarking.

## Monorepos increase coupling

In a large company there are people, teams, services, languages, frameworks that
exist without you actually knowing about them. This is a good thing. We need
boundaries and abstractions in order to make the world smaller.

Counterpoint: Google - developers don't know all the code in Google's monorepo.

## So what's the point?

Atomic code changes that you can be developed, tested, reviewed, and released
together.

## It's a trap

Great, your company is all aboard the monorepo train. Do not make the common
mistake of spinning up multiple monorepos for different parts of the company! By
doing this you are increasing your pain and complexity dramatically.
