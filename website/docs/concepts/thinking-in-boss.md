---
title: Thinking in Boss
---

Boss CSS makes more sense when you stop treating it as “one runtime” or “one authoring style”. It is one engine with separate choices about input, output, and build flow.

## 1) Choose the authoring input first

Boss has two primary authoring inputs:

- `$$` JSX props for component-driven styling
- Static `className` / `class` tokens for string-driven styling

That choice shapes the rest of the setup more than any slogan about “runtime” does.

## 2) Then choose the output strategy

Strategies are output trade-offs:

- `inline-first` keeps base JSX props close to the element.
- `classname-first` moves more static output into reusable class rules.
- `classname-only` is the static class string lane.
- `runtime` is the browser-evaluated lane.

They share the same engine, but they are not perfectly interchangeable:

- `runtime.only` disables className parsing.
- `classname-only` does not generate `.bo$$/index.js` or `.bo$$/index.d.ts`.
- `compile` only supports JSX with `inline-first` and `classname-first`.

So the accurate idea is “shared engine, different constraints”, not “everything works everywhere”.

## 3) Build mode comes after strategy

PostCSS, `build`, and `watch` all generate the same kind of outputs for a given strategy.

`compile` is different:

- it is optional
- it rewrites source code
- it follows your chosen strategy instead of replacing it

## 4) Generated runtime is just one output

When you use JSX-oriented strategies, Boss usually generates:

- `.bo$$/index.js`
- `.bo$$/index.d.ts`
- `.bo$$/styles.css`

Those generated runtime files are not the same thing as the `runtime` strategy plugin.

## 5) Composition is still the point

Once the setup is clear, Boss gives you a consistent language for:

- selectors (`hover`, `child`, `at`)
- tokens (`$$.token`)
- reusable style objects (`$$.$`, `$$.style`)
- variants and composition helpers (`cv`, `scv`, `sv`, `cx`)
