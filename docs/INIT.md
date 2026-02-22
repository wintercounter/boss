# boss-css init

`npx boss-css init` scaffolds a `.bo$$` folder, updates `package.json`, and generates the initial runtime files (unless you choose `classname-only`).

What it does:
- Detects (or asks for) your source root.
  - Next.js default: uses `src` when present, otherwise project root (`.`), so Boss files are not placed in `app/`.
- Chooses where to place `.bo$$` (default is inside the source root).
- Selects a single output strategy (`inline-first`, `classname-first`, `classname-only`, `runtime-only`, or `runtime-hybrid`).
- Lets you pick Boss CSS plugins/features (defaults match the sample config).
- Asks whether to enable global `$$` (defaults to on).
- If ESLint is detected, offers to enable the Boss ESLint plugin or at least add `$$` to globals.
- Adds `boss-css` to `package.json`.
- Records `bo$$.configDir` in `package.json` when you use a non-default folder.
- If PostCSS is detected, creates a `postcss.config.js` (or updates `package.json` postcss config).
- If PostCSS is missing, offers automatic setup or prints manual steps.
- Stencil projects skip PostCSS setup; use `npx boss-css watch` instead and wire `globalScript` + `globalStyle`.
- Stencil projects update `stencil.config.*` and create `src/global/app.ts` to import the Boss runtime when needed.
- Next.js projects set `css.autoLoad: false` in `.bo$$/config.js`; import `.bo$$/styles.css` manually in your root layout.
- New `postcss.config.js` files are generated as ESM (`export default { ... }`).
- Generated blocks in ESLint/PostCSS config and instrumentation files are wrapped with `// bo$$:begin` and `// bo$$:end` so reruns can update safely.
- Adds `// @ts-check` and a `UserConfig` JSDoc annotation in `.bo$$/config.js` for type-safe config editing.
- Adds `.bo$$/jsconfig.json` so TypeScript includes `config.js` even when dot-folders are excluded.

## Flags

- `-y`, `--yes`: Run with defaults and no prompts.
- `--src-root <path>`: Source root folder (relative to project root).
- `--config-dir <path>`: Where `.bo$$` lives (relative to project root).
- `--boss-dir <path>`: Alias for `--config-dir`.
- `--plugins <list>`: Comma-separated plugin list.
- `--strategy <inline-first|classname-first|classname-only|runtime-only|runtime-hybrid>`: Output strategy (only one).
- `--postcss <auto|manual|skip>`: PostCSS handling.
- `--globals <true|false>`: Enable global `$$`.
- `--eslint-plugin <true|false>`: Enable `boss-css/eslint-plugin`.

Example:
```bash
npx boss-css init -y --src-root src --config-dir src/.bo$$ --strategy inline-first --plugins fontsource,reset,token,at,child,css,pseudo,classname,jsx,ai
```

To use classname-first instead:
```bash
npx boss-css init -y --src-root src --config-dir src/.bo$$ --strategy classname-first --plugins fontsource,reset,token,at,child,css,pseudo,classname,jsx,ai
```

To use runtime-only (defaults to inline-first runtime):
```bash
npx boss-css init -y --src-root src --config-dir src/.bo$$ --strategy runtime-only --plugins fontsource,reset,token,at,child,css,pseudo,classname,jsx,ai
```

To use runtime hybrid (server CSS + runtime):
```bash
npx boss-css init -y --src-root src --config-dir src/.bo$$ --strategy runtime-hybrid --plugins fontsource,reset,token,at,child,css,pseudo,classname,jsx,ai
```

To use classname-only (no runtime, no JSX parser):
```bash
npx boss-css init -y --src-root src --config-dir src/.bo$$ --strategy classname-only --plugins fontsource,reset,token,at,child,css,pseudo,classname,ai
```
Classname-only assumes static classnames (Tailwind-style), does not add runtime or dynamic prop handling, and requires importing `styles.css` manually in your app entry.

## Optional plugins

- `reset`: Base reset stylesheet (enabled by default).
- `fontsource`: Font loading via the Fontsource API (enabled by default, no-op without `fonts` config).
- `bosswind`: Tailwind-style aliases and defaults (disabled by default).
- `ai`: LLMS + skills generation (enabled by default).
- `devtools`: Experimental runtime devtools (disabled by default, unavailable for `classname-only`).

## React Native output

To emit a native runtime alongside the web output, add the native plugin to your `.bo$$/config.js`:

```js
import * as native from 'boss-css/native/server'

export default {
  plugins: [
    // ...existing plugins
    native,
  ],
}
```

This generates `.bo$$/native.js` and `.bo$$/native.d.ts` for React Native usage.

## Next.js note

For Next.js, `npx boss-css init` creates or updates `instrumentation.ts` and `instrumentation-client.ts` in the Next source root (`src/` when present, otherwise project root) with Boss CSS imports (`./.bo$$`), unless you use `classname-only`.
It also writes `css.autoLoad: false` in `.bo$$/config.js`, so import the generated stylesheet manually from your root layout (use the path relative to `app/layout.*`, default is usually `../.bo$$/styles.css`):

```tsx
import '../.bo$$/styles.css'
```

## Troubleshooting

- Boss PostCSS auto-disables directory dependencies when a Turbopack env flag is set (`TURBOPACK` or `__NEXT_TURBOPACK`). To override:
```js
// postcss.config.js
export default {
  plugins: {
    'boss-css/postcss': { dirDependencies: false },
  },
}
```
