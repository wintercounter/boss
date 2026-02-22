<p align="center">
  <img src="./boss-logo.webp" alt="Boss CSS logo" width="520" />
</p>

<h1 align="center">Boss CSS</h1>

<p align="center">
  Polymorphic, usage-driven CSS-in-JS.
</p>

<p align="center">
  <strong>Warning:</strong> Boss CSS is not production-ready yet. Expect breaking changes and stability issues.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/boss-css"><img src="https://img.shields.io/npm/v/boss-css.svg" alt="npm version" /></a>
  <a href="./package.json"><img src="https://img.shields.io/npm/l/boss-css.svg" alt="license" /></a>
</p>

<p align="center">
  <a href="https://bosscss.com">Website</a> | <a href="https://bosscss.com/docs">Documentation</a>
</p>

## Table of Contents

- [Key Features](#key-features)
- [Quick Start](#quick-start)
- [Examples](#examples)
- [Strategy Modes](#strategy-modes)
- [License](#license)

## Key Features

- Polymorphic `$$` authoring with framework-aware runtime adapters.
- Style props and className parsing in one unified API.
- Strong generated TypeScript types for style props and prepared components.
- Plugin-driven parser and prop pipeline (`parser`, `prop`, `strategy`, `use`).
- Server output and browser runtime support with configurable strategy behavior.
- Zero-runtime compilation
- Runtime-only mode for client CSS injection when needed.
- Token support, pseudo selectors, media/breakpoint props, and nested child selectors.
- CLI tooling for init/compile/dev workflows.

## Quick Start

Install and scaffold:

```bash
npx boss-css init
```

Import the generated runtime once near your app root:

```tsx
import './.bo$$'
```

## Examples

Write styles directly with `$$`:

```tsx
export default function Demo() {
    return (
        <$$
            display="flex"
            gap={12}
            padding={16}
            borderRadius={12}
            backgroundColor="#111"
            color="#fff"
            hover={{ backgroundColor: '#222' }}
        >
            Hello Boss CSS
        </$$>
    )
}
```

ClassName syntax (`prop:value` tokens):

```tsx
export function Badge() {
    return (
        <span className="display:inline-block padding:6_10 border-radius:999 color:white background-color:#ed4b9b">
            New
        </span>
    )
}
```

Grouped pseudo and responsive className:

```tsx
export function Button() {
    return (
        <button className="mobile:hover:{color:white;background-color:black} hover:{text-decoration:underline;color:red}">
            Hover me
        </button>
    )
}
```

Mix static className and dynamic props:

```tsx
export function Mixed({ bgColor }: { bgColor: string }) {
    return <div className="display:flex gap:12 border-radius:12" backgroundColor={bgColor} />
}
```

Compose className conditionals with `cx`:

```tsx
import { cx } from 'boss-css/variants'

const className = cx('display:flex gap:8', { 'hover:color:purple': true })
```

Bosswind plugin for Tailwind-like utilities:

```tsx
const Box = () => <div className="flex w:100 bg:blue-500 p:4 hover:bg:blue-700">Tailwind-like Box using classNames</div>

const BoxProps = () => (
    <$$ flex width="100" bg="blue-500" p="4" hover={{ bg: 'blue-700' }}>
        Tailwind-like Box using props
    </$$>
)
```

## Strategy Modes

Boss CSS supports multiple output strategies:

- `inline-first` (default): Inline everything that's possible => smallest CSS output, lowest possible unused styles,
  instant critical CSS.
- `classname-first`: Use class names everywhere possible, variables for dynamic cases.
- `classname-only`: Static class parsing with zero runtime output. (aka TailwindCSS).
- `runtime`: Runtime-only or hybrid behavior, for cases where styles need to be generated at runtime.

Read more: https://bosscss.com/docs/concepts/runtime-strategy

## License

MIT
