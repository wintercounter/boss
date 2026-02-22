# AI Workflows

This document is a practical playbook for common repository changes.

## Change checklist (always)

Before opening a PR:
1. Update or add docs for behavior changes.
2. Add/update tests in the relevant module.
3. Run the smallest meaningful verification commands.
4. Keep generated outputs out of manual edits.

Minimum verification commands:
- `npm test`
- `npm run build`
- `npm run prepublishOnly` (release validation: builds core + devtools app and runs `npm pack --dry-run`)

Use targeted tests when possible (example: `vitest src/prop/css/runtime-only.test.ts`).

## Add or update a prop plugin

1. Implement server plugin logic in `src/prop/<name>/server.ts` (`onBoot`, `onProp`, optional helpers).
2. Add runtime-only/browser handlers when required in `src/prop/<name>/runtime-only.ts` or browser module.
3. Register dictionary metadata and generated type output updates.
4. Add plugin to config (sample reference: `test/sample/nextjs/.bo$$/config.js`).
5. Add tests under `src/prop/<name>/`.
6. Update docs:
- `docs/AI_ARCHITECTURE.md` if hooks/dataflow changed.
- `docs/AI_WORKFLOWS.md` if contributor workflow changed.

## Add or update a parser

1. Implement parser in `src/parser/<name>/server.ts` with `onParse`.
2. Emit prop trees compatible with `src/api/propTree.ts`.
3. Ensure parser ordering with strategy/prop plugins is correct.
4. Add parser tests.
5. If publicly exported, update `package.json` `exports` and `tsdown.config.mjs`.

## Add or update a strategy

1. Update server behavior in `src/strategy/<name>/server.ts` (`onPropTree`).
2. Update browser/runtime behavior in paired browser/runtime-only files.
3. Ensure runtime-only CSS behavior still matches strategy intent.
4. Add/adjust strategy tests.
5. Update docs where users choose strategy (`README.md`, `docs/COMPILE.md`, AI docs as needed).

## Work on compile pipeline

Primary files: `src/compile/*`.

When changing compile:
1. Keep transformations deterministic and stable across files.
2. Validate runtime pruning behavior.
3. Validate CSS output behavior in temp mode.
4. Update compile tests (`src/compile/test.ts` and related test files).
5. Update `docs/COMPILE.md` and AI docs for behavior changes.

## Work on CLI or task behavior

Primary files:
- CLI: `src/cli/*`
- Tasks: `src/tasks/*`

When changing CLI/task behavior:
1. Confirm command/flag behavior through task entry files.
2. Verify config interactions (`loadConfig`, path resolution, defaults).
3. Update docs (`docs/INIT.md`, `docs/BUILD.md`, `docs/COMPILE.md`, AI docs as needed).

## Work on AI plugin

Primary files:
- `src/ai/server.ts`
- `src/ai/skills.ts`

When changing AI outputs:
1. Keep LLMS section generation idempotent (marker block updates).
2. Keep skill names/spec valid and stable.
3. Add/update tests in `src/ai/test.ts`.
4. Update AI docs to reflect new sections, metadata contracts, or settings.

## Dev server and devtools workflow

Primary files:
- `src/dev/*`
- `src/dev/plugin/*`
- `src/packages/devtools-app/*`

When changing devtools:
1. Validate websocket message compatibility.
2. Validate config/runtime port update behavior.
3. Build devtools app (`npm run build:devtools-app`) when UI bundle changes.
4. Document protocol or UX changes in docs.

## Release and publish workflow

Use this flow before publishing:
1. Install root dependencies (`npm ci`).
2. Run release validation (`npm run prepublishOnly`).
3. Confirm `npm pack --dry-run` includes `dist/devtools-app/index.mjs` when `boss-css/devtools-app` export is present.

Notes:
- The devtools app depends on the local package via `file:../../..`, so `prepublishOnly` runs `npm run setup:devtools-app` first.
- CI mirrors this check in `.github/workflows/ci.yml`.

## Documentation placement guide

Use the right doc to avoid fragmentation:
- `docs/AI_OVERVIEW.md`: stable orientation and entry points.
- `docs/AI_ARCHITECTURE.md`: runtime and plugin dataflow.
- `docs/AI_WORKFLOWS.md`: contributor change recipes and checklists.
- Task-specific docs (`docs/COMPILE.md`, `docs/INIT.md`, etc.): user-facing command details.

If a new topic does not fit any existing doc, add a focused doc and link it from `docs/AI_OVERVIEW.md`.
