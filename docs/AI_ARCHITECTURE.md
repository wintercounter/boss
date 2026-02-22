# AI Architecture

This doc describes how Boss CSS executes from config load to emitted runtime/CSS outputs.

## 1. Configuration and boot

Config resolution:
1. `loadConfig(baseDir)` reads `package.json` `bo$$` values.
2. It resolves `configDir` (default `.bo$$`) and loads `<configDir>/config.js`.
3. If `configDir === '.bo$$'` and no root config exists, it falls back to `src/.bo$$/config.js`.
4. It merges defaults + package config + user config and resolves `stylesheetPath`.

Primary file: `src/api/config.ts`.

## 2. Server API lifecycle

`createApi(config)` in `src/api/server.ts` initializes:
- `api.dictionary` for prop metadata.
- `api.css` as `CSS` or `NoopCSS` depending on runtime mode.
- `api.file.js` and `api.file.native` output buffers.
- Base type definitions in generated d.ts output.

Hook order on boot:
1. `onBoot`
2. optional auto import of `./styles.css` into runtime output (`css.autoLoad` + runtime settings)
3. `onReady`

Plugin hooks are triggered through `api.trigger(event, payload)`.

## 3. Browser API lifecycle

`createApi(config)` in `src/api/browser.ts` initializes browser-side dictionary/helpers and triggers:
- `onInit`

Runtime style/attribute translation is handled through browser plugins via:
- `onBrowserObjectStart`

## 4. Plugin event model

Declared in `src/types/Plugin.ts`.

Main server-side events:
- `onBoot`
- `onReady`
- `onParse`
- `onPropTree`
- `onProp`
- `onCompileProp`
- `onSession`
- `onMetaData`

Main browser-side events:
- `onInit`
- `onBrowserObjectStart`

Practical split:
- Parsers emit prop trees in `onParse`.
- Strategies decide class vs variable behavior in `onPropTree`.
- Prop plugins emit CSS/runtime metadata in `onProp`.
- AI/dev metadata is emitted through `onMetaData`.

## 5. Task flows

### `build`

File: `src/tasks/build.ts`.

Flow:
1. Resolve build config (`resolveBuildConfig`).
2. Create server API.
3. Emit session `start` and `run`.
4. Parse files from `content` globs via `onParse`.
5. Write generated runtime/types (except `classname-only`).
6. Resolve CSS boundary outputs and write CSS.
7. Emit boundary metadata to AI plugin.
8. Emit session `stop`.

### `watch`

File: `src/tasks/watch.ts`.

Flow:
1. Create API/session context.
2. Subscribe via `@parcel/watcher`.
3. Ignore generated/output directories.
4. Debounce and rerun `build` on relevant changes.

### `postcss`

File: `src/tasks/postcss.ts`.

Flow:
1. Resolve config/API caches per `baseDir`.
2. Process changed content files with transform cache.
3. Trigger `onParse` for changed files.
4. Recompute boundary CSS outputs.
5. Replace PostCSS root with generated CSS for the current stylesheet.
6. Await runtime/types writes before returning from the PostCSS run.
7. Report parse failures as PostCSS warnings (file path + error) instead of silently ignoring them.

### `compile`

Entry: `src/tasks/compile.ts`, implementation under `src/compile/`.

Compile is a source transform pipeline (SWC-driven) that can:
- Rewrite `$$` JSX usage.
- Normalize/transform classname tokens.
- Remove runtime imports when output is runtime-free.
- Emit CSS in temp mode.

## 6. Strategy architecture

Location: `src/strategy/`.

- `inline-first`: prefer inline styles/variables with CSS rules when needed.
- `classname-first`: prefer class output; dynamic values rely on function props.
- `classname-only`: class parsing only, no runtime output.
- `runtime`: runtime-only/hybrid entry that selects runtime behavior and client CSS injection.
- `classic/runtime-only`: supporting runtime-only variants.

Client CSS injection engine:
- `src/strategy/runtime-only/css.ts`

## 7. AI plugin architecture

Files:
- `src/ai/server.ts`
- `src/ai/skills.ts`

Behavior:
- Collects AI metadata from plugins via `onMetaData`.
- Writes/updates LLMS markdown sections using marker blocks.
- Writes built-in and custom skills plus `index.json` under the configured skills directory.
- Runs on session phases `run` and `stop`.

## 8. Output model

Common generated outputs:
- Runtime JS/types: `<folder>/index.js`, `<folder>/index.d.ts`
- Native runtime/types (when enabled): `<folder>/native.js`, `<folder>/native.d.ts`
- CSS: resolved `stylesheetPath` and optional boundary CSS files
- AI docs/skills: LLMS file and skills directory (via AI plugin)

`folder` defaults to `configDir`; both can be overridden in user config.
