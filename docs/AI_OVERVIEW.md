# AI Overview

This document is the fast orientation guide for contributors and coding agents working in this repository.

For deeper details:
- Architecture and runtime flow: `docs/AI_ARCHITECTURE.md`
- Change recipes and validation steps: `docs/AI_WORKFLOWS.md`
- User-facing docs: `website/docs/` (published at `https://bosscss.com/docs`)

## Project snapshot

Boss CSS is a plugin-driven CSS-in-JS system.

Core behavior:
- Parse source files (`$$` JSX and classname tokens) into a prop tree.
- Transform props through plugin hooks.
- Emit generated runtime/types (and optional native runtime/types).
- Emit CSS for build/watch/postcss flows, or inject CSS at runtime in runtime-only mode.

## Repository map

Primary source:
- `src/api/`: API creation, config loading, dictionary/CSS/file helpers.
- `src/parser/`: JSX/classname parsers.
- `src/prop/`: prop plugins (`css`, `pseudo`, `at`, `child`, `bosswind`) plus runtime-only helpers.
- `src/strategy/`: output strategies (`inline-first`, `classname-first`, `classname-only`, `runtime`, `classic`, `runtime-only/css`).
- `src/use/`: feature plugins (`token`).
- `src/runtime/`: framework runtime adapters and shared runtime entry.
- `src/tasks/`: programmatic tasks (`build`, `watch`, `postcss`, `compile`, `session`).
- `src/cli/`: `boss-css` command surface.
- `src/compile/`: SWC compile pipeline.
- `src/ai/`: LLMS + skills generation plugin.
- `src/dev/` and `src/packages/devtools-app/`: dev server/runtime and devtools UI.
- `src/eslint-plugin/`: lint rules and configs.
- `src/shared/`: shared config/types/helpers.

Support and examples:
- `test/sample/nextjs/`: sample app and generated `.bo$$` output.
- `docs/`: contributor docs.
- `website/`: public docs site content.

Generated artifacts (do not hand-edit):
- `dist/`
- `.bo$$/` (or custom `configDir`/`folder` output)

## Key entry points

Library exports:
- `src/index.ts`
- `package.json` `exports`

Config and API boot:
- `src/api/config.ts` (`loadConfig`)
- `src/api/server.ts` / `src/api/browser.ts` (`createApi`)

Task runners:
- `src/tasks/build.ts`
- `src/tasks/watch.ts`
- `src/tasks/postcss.ts`
- `src/tasks/compile.ts`

CLI dispatch:
- `src/cli/index.ts`
- `src/cli/utils.ts`
- `src/cli/tasks/*`

## Command surface

Main project commands:
- `npm test`
- `npm run build`
- `npm run setup:devtools-app`
- `npm run prepublishOnly`
- `npm run build:devtools-app`
- `npm run generate-playground-registry`

CLI commands:
- `npx boss-css init`
- `npx boss-css build`
- `npx boss-css watch`
- `npx boss-css compile`
- `npx boss-css dev`

## Working conventions

- Update docs with behavior changes (required in this repo).
- Prefer editing source generators/plugins instead of generated output.
- Use `@/` alias only in core `src/` code; keep `src/packages/**` on relative/package imports.
- Quote paths containing `$$` in shell commands (example: `'.bo$$/config.js'`).
- Keep changes covered by tests where a test pattern already exists.
