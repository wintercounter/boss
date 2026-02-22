---
title: Plugin Hooks
---

Boss CSS plugins are plain objects with optional hooks.

## Available hooks

- `onBoot(api)`: initialize dictionaries, types, and runtime wiring.
- `onReady(api)`: finalize types or post-process dictionaries.
- `onParse(api, input)`: parse a file into a prop tree.
- `onPropTree(api, data)`: strategy stage that decides variables vs classes.
- `onProp(api, data)`: emit CSS rules for a single prop.
- `onCompileProp(api, data)`: compile-time hook to rewrite non‑CSS props into real DOM attrs.
- `onBrowserObjectStart(api, data)`: runtime hook that maps props to DOM output.
- `onSession(api, session)`: lifecycle hook for build/watch/postcss/compile sessions.
- `onMetaData(api, payload)`: metadata bus for plugins (used by the AI plugin).

`onSession` receives:

```ts
{
  phase: 'start' | 'run' | 'stop'
  kind: 'watch' | 'postcss' | 'build' | 'compile' | 'custom'
  baseDir: string
  configPath: string | null
  runtimePath: string | null
}
```

## Minimal prop plugin example

```ts
export const name = 'my-prop'

export const onBoot = async api => {
  api.dictionary.set('halo', {
    property: 'box-shadow',
    aliases: ['halo'],
    description: 'Custom halo prop',
    values: [],
    initial: 'none',
  })
}

export const onProp = async (api, {name, prop, contexts}) => {
  api.css.selector({
    className: api.contextToClassName(name, prop.value, contexts),
  })
  api.css.rule('box-shadow', prop.value)
  api.css.write()
}
```

## Strategy example

```ts
export const name = 'inline-first'

export const onPropTree = async (api, {tree, preferVariables}) => {
  for (const [name, prop] of Object.entries(tree)) {
    await api.trigger('onProp', {name, prop, contexts: [], preferVariables})
  }
}
```

Hooks can be arrays if you want multiple handlers for the same stage.

## onCompileProp payload

`onCompileProp` is only called during `boss-css compile`. It receives:

```ts
{
  name: string
  prop: BossProp
  output: Record<string, BossProp | unknown>
  tag?: string
  file?: { path?: string; file?: string } | null
  keep?: boolean
  remove?: boolean
}
```

Use it to rewrite non‑CSS props into standard DOM attributes (for example, `tooltip` → `data-tooltip`)
when you’re compiling away the runtime.

## onMetaData payload

`onMetaData` is a general metadata channel. Boss does not enforce the shape, but the AI plugin listens for
`kind: 'ai'`. See [AI Metadata](/docs/api/ai-metadata) for examples.
