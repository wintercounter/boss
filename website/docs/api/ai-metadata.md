---
title: AI Metadata
---

`onMetaData` is a general metadata channel. The AI plugin listens for `kind: 'ai'` payloads and adds them to `LLMS.md`.

## Payload shape

`kind` is required. Everything else is optional and custom.

```ts
{
  kind: string
  type?: string
  label?: string
  data?: unknown
  replace?: boolean
}
```

## Emit a section

```ts
await api.trigger('onMetaData', {
  kind: 'ai',
  data: {
    section: 'tokens',
    title: 'Tokens',
    content: '- color: primary\n- space: sm | md | lg',
    order: 0,
  },
})
```

- `section` is the section id in `LLMS.md` (letters, numbers, `.`, `_`, `-`).
- `content` should be a ready-to-render markdown snippet.
- `order` controls ordering within a section.

## Emit a skill snippet

Use `type: 'skill'` to append to the `skills` section of `LLMS.md`:

```ts
await api.trigger('onMetaData', {
  kind: 'ai',
  type: 'skill',
  data: {
    title: 'Devtools eval',
    content: '- Send eval-client over the dev socket to query the browser.',
    order: 10,
  },
})
```

This is separate from the skill file output under `.bo$$/skills/`.

## Replace a section

Set `replace: true` to overwrite a section instead of appending:

```ts
await api.trigger('onMetaData', {
  kind: 'ai',
  replace: true,
  data: {
    section: 'prepared',
    title: 'Prepared components',
    content: '- Button (as: button, file: src/ui/button.tsx)',
  },
})
```

## When to emit

You can emit metadata from any hook. If you emit during `onBoot`, place the AI plugin earlier in the plugin list so it captures the payloads before its own `onBoot` clears prior state.
