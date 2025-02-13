# A Zettlekasten of Context

Sorry about the use of the word "Zettlekasten". I couldn't help myself.

A developer who sucks at written communication actually just sucks at their job.

Corollary: A developer who voluntarily annotates their PRs with comments that make
intentions explicit doesn't suck at written communication.

##

Someone opens a PR and asks for your review.

Automation in the system configures a critical piece of infrastructure.

You're invited to a meeting that you weren't expecting.

Someone DMs you in Slack asking for help on something.

You're paged during oncall about an incident in a service that you've never
heard of.

You take over a project to add features on a codebase you've never even heard of
after a re-org.

## Pick up the thread

You're dropped into a single point or resource or context.

Can you pick it up and navigate?

## Follow ups in DMs and Zooms

When you follow up on a message in a public thread with a DM or Zoom or any
other method of non-public communication, you break the thread. In this case,
post a summary of the context or solution in order to connect the dots.

## Navigating in Vim with LSP

I don't use vim plugins that let you jump to an arbitrary character on another
line (there are many). Instead I navigate by jumping to definition or usages,
sometimes navigating LSP symbols in a fuzzy Telescope finder. There's an
underlying graph that makes up definitions and usages in your codebase.
