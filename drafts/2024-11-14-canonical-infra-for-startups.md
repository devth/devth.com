Startups should not be using Kubernetes.

I love Kubernetes, but it's overkill in most situations, and it's too low level.
My dream platform someday is to run Kubernetes, Crossplane, and possibly a set
of custom operators where every single infrastructure component from GitHub repo
to secret to ingress to datastore is represented in a Kubernetes manifest.

But that's not what a startup needs when they're iterating quickly and trying to
find product market fit or build the next set of product improvements.

Instead, they should use a higher level Platform as a Service. They're
expensive, but the overhead is much cheaper than hiring an SRE or three to
manage your chaos.

## IaC is not good

The promise of Terraform is so enticing. When I first learned about it in 2015
and began managing OpenStack VMs with it I was an immediate zealot, solely based
on the concept. (Ok, HashiCorp's slick branding and docs maybe played a part).

But the reality of Terraform is that a developer's velocity will reduced by
-1000% because it removes the dev loop. Instead, you open a PR, run a plan
(Terraform plans will lie by the way), ask for approval like a pleb, 

## What even is an IDP

Product developers need a pretty simple set of infrastructure components to
build on. This is typically:

1. Frontend app. Could be purely client side rendered, or server side, or both.
1. Background functions that react to system events (data created, updated,
   deleted, account created, etc), send notifications, and ensure data consistency.
1. A datastore. Could be relational or NoSQL, or some of both.

They might need a 2-way websocket based pub/sub channel to communicate between
backends and frontends in realtime. (Note: using a datastore like Firestore
gives you this for free).

## Helm is not good

It's a great tool, but heavily misused by the wrong target audience. Product
engineers are not the correct target. Platform engineers are.

## Argo is too complex

## Datadog is incredibly expensive chaos

## Microservices?

## Two way doors aka orthogonality

## Keep the world small

The more teams and services you create without hard boundaries between them

## Environments

Are your environments pets or cattle? Are you creating environments for the
right reasons or is it a bandaid on a larger organizational problem? Could you
use feature flags instead of environments?

## Do whatever you want

All the tech I criticized here are valid and sometimes even great, but every
single one is a liability.

You need engineers to create them, maintain them, document them, and continually
modify them as needs and dependent infrastructure components change.

Using these low level infrastructure components is the ultimate re-invention of
the wheel. It's incredibly wasteful.
