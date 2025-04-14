---
layout: article
title: YAML was a bad idea for CI pipelines
categories: [infrastructure]
comments: true
excerpt: |
  YAML was a bad idea for CI pipelines
---

> Let's create a declarative spec that limits what we can do and promotes
> hermetic deterministic pipelines"

but also:

> Let's make it Turing complete but extremely awkward to express basic
> conditionals, control flows, parallelism, and dependencies"

Ok. Should have just used a real programming language. Same concept applies to
Terraform (bad) and CDK (better).

Remember how for decades we researched and iterated a million ways to make
programming languages expressive and correct and built massive ecosystems of
libraries, tooling, testing, type checking around them? 

Then we throw that out and replace it with 1000 line dumb yamls.
