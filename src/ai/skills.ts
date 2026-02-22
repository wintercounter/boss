export type BuiltinSkill = {
    name: string
    description: string
    body: string
    compatibility?: string
    license?: string
    metadata?: Record<string, string>
    allowedTools?: string
}

const baseMetadata = {
    author: 'boss-css',
}

const baseLicense = 'MIT'

export const builtInSkills: BuiltinSkill[] = [
    {
        name: 'boss-css-authoring',
        description:
            'Boss CSS authoring conventions and style guidelines. Use when writing or reviewing $$ props, tokens, pseudos, @at, or className usage.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Apply Boss CSS props cleanly with tokens and selectors.

# Guidance
- Prefer $$ props for structured styles over raw className strings.
- Use token keys (for example color="primary") when tokens exist.
- Use pseudos and @at for state and breakpoints instead of ad-hoc selectors.
- In classname-first, pass dynamic values as functions (prop={() => value}).
- In classname-first, return $$.token.* from dynamic functions when using tokens.
- Use child for nested selectors instead of manual selector strings.
- Prefer unitless values (padding:12). Use _ for spaces (padding:10_20).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Prefer arrays for shorthands (padding={[0, 10]}).

# References
See .bo$$/LLMS.md for live tokens, pseudos, and breakpoints.
`,
    },
    {
        name: 'boss-css-tokens',
        description:
            'Token authoring and usage. Use when defining tokens, consuming them in props/className, or overriding tokens at runtime.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use tokens consistently and keep theme data centralized.

# Guidance
- Define tokens in config (tokens: { color: { primary: "#..." } }).
- Prefer token keys for props (color="primary") over $$.token.*.
- Use tokens prop for runtime overrides when needed.
- Keep token groups small and named by prop or intent.
- Prefer token shorthands for shadows (boxShadow="md") when provided.

# References
See .bo$$/LLMS.md for live token groups.
`,
    },
    {
        name: 'boss-css-strategy',
        description:
            'Guidance for choosing inline-first, classname-first, or runtime-only. Use when deciding strategy or troubleshooting output size/runtime.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Pick the rendering strategy that matches your app needs.

# Guidance
- inline-first: safest default; good for mixed dynamic/static props.
- classname-first: smallest runtime styles; use function values for dynamics and return $$.token.* for dynamic tokens.
- runtime-only: client-only CSS injection; reset/fontsource/token/$$.css output is controlled by runtime.globals.

# References
See .bo$$/LLMS.md for the active runtime strategy.
`,
    },
    {
        name: 'boss-css-props',
        description:
            'Finding the right Boss props and understanding custom non-CSS props. Use when unsure which prop to use or what shorthand exists.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Find the right prop names and supported values quickly.

# Guidance
- CSS props are generated into .bo$$/index.d.ts.
- Non-CSS props include at, child, pseudo shorthands, and plugin props.

# References
See .bo$$/LLMS.md for the current props summary.
`,
    },
    {
        name: 'boss-css-plugin-authoring',
        description:
            'Creating Boss plugins and emitting metadata. Use when adding plugins or extending the prop pipeline.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Add a new Boss plugin with the correct hooks and tests.

# Checklist
- Implement onBoot and onProp (or onParse/onPropTree for parser/strategy).
- Update dictionary and d.ts types via api.file.js.dts.
- Register the plugin in config order.
- Add tests under src/**/test.ts.
- Emit AI metadata with onMetaData (kind: "ai") when helpful.
`,
    },
    {
        name: 'boss-css-devserver-eval',
        description:
            'Request client-side data via eval-client over the dev server. Use when you need runtime state or DOM data during local dev.',
        license: baseLicense,
        metadata: baseMetadata,
        compatibility: 'Requires devtools plugin and a running dev server.',
        body: `# Goal
Request client-side data by sending eval-client to the dev server.

# Usage
1) Connect to ws://localhost:<port> (port from dev server).
2) Send:
   { "type": "eval-client", "id": 1, "code": "return { href: location.href }" }
3) Receive:
   { "type": "eval-client-result", "id": 1, "ok": true, "result": { ... } }

# Notes
- Dev-only, local workflow. No safety checks.
- The code is executed in the devtools client window.

# References
See .bo$$/LLMS.md for dev server output paths.
`,
    },
    {
        name: 'boss-css-classname',
        description:
            'Classname syntax and shorthands. Use when writing className strings or converting from CSS.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Write correct className tokens and shorthands.

# Guidance
- className tokens are mostly CSS prop:value (1:1 with props).
- Use unitless values (padding:12), and _ for space-separated values (padding:10_20).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Prefer shorthand pseudos and breakpoints: hover:color:red, mobile:gap:12.
- For @at, prefer shorthand (mobile:...) over at:mobile:... when available.

# References
See .bo$$/LLMS.md for live props, pseudos, and breakpoints.
`,
    },
    {
        name: 'boss-css-values',
        description:
            'Preferred value forms (arrays, unitless numbers, shadows). Use when deciding how to express CSS values.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use Boss-friendly value forms for consistent output.

# Guidance
- Prefer unitless numbers for numeric props (padding:12).
- Avoid hardcoded default unit suffixes in class tokens (border:1_solid, not border:1px_solid).
- Use arrays for shorthands: padding={[0, 10]}.
- Use token shorthands when available (boxShadow="md").
- For custom shadow values, use arrays: boxShadow={[1, 1, 0, '#fff']}.

# References
See .bo$$/LLMS.md for live tokens and props.
`,
    },
    {
        name: 'boss-css-breakpoints',
        description:
            'Breakpoint and media shorthand guidance. Use when picking responsive keys or authoring at/mobile styles.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use responsive shorthand keys correctly.

# Guidance
- Prefer shorthand keys (mobile:..., tablet:...) instead of at:mobile:...
- Use the device breakpoint for small screens when available (device:...).

# References
See .bo$$/LLMS.md for the active breakpoint map.
`,
    },
    {
        name: 'boss-css-bosswind',
        description:
            'Bosswind shorthand preferences. Use when Bosswind is enabled and you want concise, Tailwind-like tokens.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use Bosswind shorthands consistently.

# Guidance
- Prefer Bosswind shorthands like flex instead of display:flex.
- Use Bosswind aliases for spacing/typography utilities when enabled.

# References
See .bo$$/LLMS.md for Bosswind aliases and tokens.
`,
    },
    {
        name: 'boss-css-global-css',
        description:
            'Global CSS usage via $$.css(). Use when you need global styles or arbitrary selectors.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Define global styles and arbitrary selectors safely.

# Guidance
- Use $$.css() for global CSS and arbitrary selectors (body, html, [data-*]).
- Keep global blocks small and prefer tokens for values.

# References
See .bo$$/LLMS.md for global outputs and strategy.
`,
    },
    {
        name: 'boss-css-compile-pruning',
        description:
            'How to keep compile output runtime-free. Use when you want compile to prune Boss runtime imports.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Let compile prune Boss runtime imports when possible.

# Guidance
- Avoid dynamic props that require runtime (functions, spreads without compile.spread).
- Avoid unresolved prepared components (they force runtime).
- Keep JSX props static when possible so compile can rewrite fully.
- Ensure your strategy is inline-first or classname-first (compile requirement).

# References
See .bo$$/LLMS.md for strategy and compile settings.
`,
    },
    {
        name: 'boss-css-compile',
        description:
            'Boss compile usage and constraints. Use when running boss-css compile or deciding if compile is appropriate.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use boss-css compile correctly and understand its constraints.

# Guidance
- Compile rewrites $$ JSX into plain elements and can remove runtime imports.
- Compile only supports inline-first or classname-first strategies.
- Avoid spreads if compile.spread is false; spreads can force runtime.
- Prefer static props so compile can fully rewrite output.

# References
See .bo$$/LLMS.md for compile settings and strategy.
`,
    },
    {
        name: 'boss-css-runtime-only',
        description:
            'Runtime-only strategy guidance. Use when enabling runtime.only or troubleshooting client-only CSS injection.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use runtime-only mode safely.

# Guidance
- runtime.only: true disables server CSS output.
- runtime.globals controls reset/fontsource/token/$$.css output in runtime-only:
  - inline injects globals at runtime.
  - file emits styles.css even in runtime-only.
  - none skips global CSS output.
- Keep JSX parser enabled and include the runtime strategy plugin.

# References
See .bo$$/LLMS.md for runtime settings and outputs.
`,
    },
    {
        name: 'boss-css-classname-only',
        description:
            'Classname-only mode guidance. Use when running classname-only strategy or migrating from utility classes.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use classname-only mode correctly.

# Guidance
- Classname-only skips JSX parsing and runtime output.
- Only className strings are processed; props are ignored.
- Import styles.css manually in your app entry.

# References
See .bo$$/LLMS.md for outputs and strategy.
`,
    },
    {
        name: 'boss-css-debugging',
        description:
            'Debug logging and troubleshooting. Use when investigating Boss parsing, strategy, or CSS output issues.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Enable and interpret Boss debug logs.

# Guidance
- Use config.debug or BOSS_DEBUG to enable logs.
- Narrow scopes with namespaces (boss:parser:jsx, boss:strategy:inline-first).
- Disable noisy areas with -boss:css.

# References
See .bo$$/LLMS.md for outputs and active strategy.
`,
    },
    {
        name: 'boss-css-devtools',
        description:
            'Devtools usage and dev server behavior. Use when enabling the devtools plugin or troubleshooting the socket.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Use the devtools plugin and dev server effectively.

# Guidance
- Devtools is dev-only; it starts a WebSocket server.
- Use the devtools app to inspect/edit props and source.
- The dev server also supports eval-client for debugging.

# References
See .bo$$/LLMS.md for dev server host/port info.
`,
    },
    {
        name: 'boss-css-boundaries',
        description:
            'CSS boundary rules and .boss.css behavior. Use when adjusting CSS scoping or boundary outputs.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Understand CSS boundaries and output files.

# Guidance
- .boss.css files define boundary scopes for CSS output.
- Boundaries are resolved by nearest .boss.css in the directory tree.
- Use css.boundaries.ignore to skip paths.

# References
See .bo$$/LLMS.md for boundary files.
`,
    },
    {
        name: 'boss-css-metadata',
        description:
            'Emitting AI metadata from plugins. Use when you want LLMS sections or custom AI hints.',
        license: baseLicense,
        metadata: baseMetadata,
        body: `# Goal
Publish metadata to LLMS.md for agents.

# Guidance
- Emit api.trigger('onMetaData', { kind: 'ai', data: { section, title, content } }).
- Use replace: true for snapshots (prepared, boundaries).
- Keep content as ready-to-render markdown.

# References
See .bo$$/LLMS.md and AI metadata docs.
`,
    },
]
