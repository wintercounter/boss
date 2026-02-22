---
title: CLI
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Boss CSS exposes a CLI via `boss-css` (not meant to be installed globally).

## Run the CLI

<Tabs>
<TabItem value="npm" label="npm">

```bash
npx boss-css init
```

</TabItem>
<TabItem value="pnpm" label="pnpm">

```bash
pnpm dlx boss-css init
```

</TabItem>
<TabItem value="yarn" label="yarn">

```bash
yarn dlx boss-css init
```

</TabItem>
<TabItem value="bun" label="bun">

```bash
bunx boss-css init
```

</TabItem>
<TabItem value="deno" label="deno">

```bash
deno run -A npm:boss-css init
```

</TabItem>
</Tabs>

Replace `init` with `build`, `watch`, `compile`, or `dev` for other commands.

## Init

`npx boss-css init` scaffolds `.bo$$`, wires PostCSS (except for Stencil), updates Next.js instrumentation files, sets `css.autoLoad: false` for Next.js, and only touches ESLint when an ESLint config/dependency already exists or when you pass `--eslint-plugin true`.
If the config folder already exists, answering "No" to overwrite keeps existing files and only writes missing ones.

Flags:
- `-y`, `--yes`: Run with defaults and no prompts.
- `--src-root <path>`: Source root folder (relative to project root).
- `--config-dir <path>`: Where `.bo$$` lives (relative to project root).
- `--plugins <list>`: Comma-separated plugin list.
- `--strategy <inline-first|classname-first|classname-only|runtime-only|runtime-hybrid>`: Output strategy (only one).
- `--postcss <auto|manual|skip>`: PostCSS handling.
- `--globals <true|false>`: Enable global `$$`.
- `--eslint-plugin <true|false>`: Enable `boss-css/eslint-plugin`.
- `--overwrite <true|false>`: Overwrite existing config folder files (default: prompt or `true` with `--yes`).

Generated blocks in ESLint/PostCSS config and instrumentation files are wrapped with `// bo$$:begin` and `// bo$$:end` so reruns can update safely.
Stencil note: PostCSS setup is skipped; use `npx boss-css watch`, set `css.autoLoad: false`, and wire `globalScript` + `globalStyle` in `stencil.config.*`.

When `--strategy runtime-only` is chosen, the generated config includes a `runtime` block with `runtime.only: true` and `runtime.strategy: 'inline-first'`.
When `--strategy runtime-hybrid` is chosen, the generated config includes a `runtime` block with `runtime.only: false` and `runtime.strategy: 'inline-first'`. Edit the config to switch to `classname-first` or `classic` if needed.

When `--strategy classname-only` is chosen, `npx boss-css init` skips JSX/runtime wiring and does not generate `.bo$$/index.js` or `.bo$$/index.d.ts`. Classname-only assumes static classnames (Tailwind-style), does not add dynamic prop handling, and requires manually importing `styles.css`.

## Build (no PostCSS)

```bash
npx boss-css build
```

Build generates runtime output and CSS directly from your source files, without PostCSS. See [Build and Watch](/docs/tooling/build-watch) for details.
For programmatic usage, see [Runners](/docs/api/runners).

## Watch (no PostCSS)

```bash
npx boss-css watch
```

Watch runs build once, then rebuilds on file changes. See [Build and Watch](/docs/tooling/build-watch) for details.
For programmatic usage, see [Runners](/docs/api/runners).

## Compile

The CLI also ships a build-time optimizer:

```bash
npx boss-css compile
```

Stats output can be customized:

```bash
npx boss-css compile --stats detailed
```

See the [Compile](/docs/tooling/compile) docs for configuration, output layout, and examples.
For programmatic usage, see [Runners](/docs/api/runners).

## Current status

The CLI workflow is present but still under construction in this repo. Most teams configure Boss CSS manually by creating `.bo$$/config.js` and enabling the PostCSS plugin.

See the [Quick Start](/docs/getting-started/quick-start) for the manual setup path.
