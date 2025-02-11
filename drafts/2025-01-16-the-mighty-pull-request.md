# The mighty pull request

The PR is the epicenter of developer experience. It's where everything comes
together for changes being proposed to an code base and the environments it's
deployed to.

## Automation

Run all checks possible that provide automated verification of correctness.
These checks must be fast (very fast).

## Humans in the loop

Humans are bad at reviewing code, but they're good at detecting smells or
non-idiomatic patterns.

An approval from a human means something, but not much.

## Help, I'm feeble minded

Humans are also terrible at keeping track of more than a couple signals, and
especially terrible when there are many concerns interacting and creating
combinatorial complexity.

But computers are bicycles for the mind, right? I can't run 100 miles but I can
certainly bike 100 miles, even without training. Let's go.

## Observability

Does this changeset:

1. Degrade performance?
2. Reduce revenue
3. Increase tech debt
4. Introduce any one way door decisions
