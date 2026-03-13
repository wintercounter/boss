# Product Positioning Rewrite Plan

This plan is for the next fresh context window.

Goal: make Boss CSS read like one coherent product instead of several overlapping systems.

This is primarily a docs and taxonomy pass. Do not start by changing implementation unless a docs statement is provably false because of current code behavior.

## Canonical taxonomy

Everything should be described through these three layers:

1. Authoring inputs
- `$$` JSX props
- static `className` / `class` syntax

2. Output strategies
- `inline-first`
- `classname-first`
- `classname-only`
- `runtime`

3. Build modes
- PostCSS / `build` / `watch`
- optional `compile`

Everything else is secondary:
- Bosswind: authoring mode on top of the same engine
- CSS boundaries: output organization
- AI plugin: generated agent context
- devtools: developer tooling

## Product language rules

Use these terms consistently:

- `generated runtime`: `.bo$$/index.js` and `.bo$$/index.d.ts`
- `runtime strategy`: the `runtime` strategy plugin
- `browser-evaluated values`: values resolved in the browser
- `compile`: optional source-rewrite step, not a strategy

Avoid these fuzzy phrasings:

- “zero-runtime strategy” for compile
- “switch strategies without changing authoring” as a blanket claim
- “runtime” when you really mean generated runtime files
- “runtime” when you really mean dynamic browser evaluation

## Problems to eliminate

The rewrite should remove or tighten these claims:

- Compile framed as a general “zero-runtime mode”
- `classname-only` framed as the whole zero-runtime story
- Strategy pages implying all strategies preserve the same authoring surface
- Docs that blur generated runtime, runtime-only, and compile
- Pages that describe compile CSS output inconsistently

## Phase 1: Rewrite the README

Primary file:
- `README.md`

Objectives:
- Make the opening identity simpler: Boss is a styling engine with two authoring inputs, multiple output strategies, and an optional compile step.
- Keep compile as its own section.
- Keep strategy comparison focused on:
  - what you write
  - generated files
  - what lands in CSS
  - what runs in the browser
- Add a short decision matrix near the top.
- Keep Bosswind, boundaries, AI, and devtools as secondary features, not core identity.

Target changes:
- tighten `Why Boss CSS`
- add `Choose a Setup` or similar decision table
- keep `Strategy Modes`
- keep `Compile`
- keep `CSS Boundaries`
- keep `AI Ready`
- ensure the table of contents reflects the final structure

## Phase 2: Rewrite the overview/concepts pages

Primary files:
- `website/docs/overview/why-boss.md`
- `website/docs/concepts/core-concepts.md`
- `website/docs/concepts/thinking-in-boss.md`
- `website/docs/overview/compatibility.md`

Objectives:
- Align the product identity with the README.
- Make “strategy vs compile” explicit.
- Reduce taxonomy drift.
- Remove blanket promises about interchangeable authoring when they are not universally true.

Specific notes:
- `why-boss.md`: remove or tighten “zero-runtime paths” language
- `core-concepts.md`: introduce the three-layer model clearly
- `thinking-in-boss.md`: change “strategies are trade-offs, not forks” into something precise
- `compatibility.md`: separate framework support, strategy support, and compile support

## Phase 3: Rewrite quick-start and generated-runtime docs

Primary files:
- `website/docs/getting-started/quick-start.md`
- `website/docs/getting-started/configuration.md`
- `website/docs/api/generated-runtime.md`

Objectives:
- Make the onboarding path answer these questions in order:
  1. What do I author?
  2. Which strategy do I pick?
  3. How is CSS generated?
  4. When do I import generated runtime?
  5. When is compile relevant?

Specific notes:
- quick start should clearly say that `classname-only` is the static className lane
- generated-runtime should clearly distinguish:
  - generated runtime files
  - runtime strategy wrapper
  - runtime-only behavior

## Phase 4: Rewrite the strategy pages

Primary files:
- `website/docs/concepts/inline-first.md`
- `website/docs/concepts/classname-first.md`
- `website/docs/concepts/classname-only.md`
- `website/docs/concepts/runtime-strategy.md`

Every strategy page should use the same structure:

1. What this strategy is
2. What you author
3. What files are generated
4. What lands in CSS
5. What runs in the browser
6. Constraints / caveats
7. When to choose it

Specific notes:
- `classname-only.md`: describe it as CSS-only static className parsing, not the entire zero-runtime story
- `runtime-strategy.md`: make `runtime.only` and hybrid behavior very explicit
- `inline-first.md` and `classname-first.md`: explain generated runtime vs browser-evaluated values more cleanly

## Phase 5: Rewrite compile docs

Primary files:
- `website/docs/tooling/compile.md`
- `docs/COMPILE.md`

Objectives:
- Present compile as a build step, not a strategy
- keep source-rewrite behavior explicit
- clarify when CSS is written in temp mode
- clarify current support scope:
  - only `inline-first` and `classname-first`
  - not a universal runtime-removal guarantee

## Phase 6: Resolve cross-doc contradictions

Primary files:
- `website/docs/usage/css-boundaries.md`
- `website/docs/usage/jsx.md`
- `website/docs/recipes/runtime-only.md`
- any page found by grep

Known contradictions to fix:
- compile CSS output vs boundary docs
- `$$.css` support wording in runtime-only contexts
- dynamic function value wording between JSX docs and strategy docs

## Phase 7: Verification sweep

Run targeted grep checks after the rewrite.

Suggested commands:

```bash
rg -n "zero-runtime|zero runtime|runtime-free|runtime free" README.md website/docs docs
rg -n "switch strategies|without rewriting your authoring style|same pipeline" README.md website/docs docs
rg -n "runtime-only|generated runtime|runtime strategy|compile" README.md website/docs docs
rg -n "does not write CSS files|writes CSS|styles.css" website/docs docs
```

Manual review checklist:
- A new reader can tell the difference between strategy and compile in under 2 minutes.
- A new reader can tell when `.bo$$/index.js` exists and when it does not.
- A new reader can tell when `.bo$$/styles.css` is written and when CSS is injected instead.
- No page uses `runtime` in multiple incompatible senses without clarifying which one.

## Acceptance criteria

The rewrite is done when:

- README, overview docs, strategy docs, and compile docs all use the same taxonomy
- no page presents compile as a strategy
- no page presents `classname-only` as the whole zero-runtime story
- the quick-start path gives a clear strategy choice without requiring concept-page archaeology
- cross-page contradictions found in the audit are removed

## Out of scope for this pass

Do not mix these into the docs rewrite unless necessary:

- fixing the server/browser global API architecture
- refactoring parser internals
- changing strategy semantics
- adding new product features

Those are separate engineering tracks.
