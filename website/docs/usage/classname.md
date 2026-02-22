---
title: ClassName Syntax
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Boss CSS parses className strings and turns supported patterns into CSS rules. The syntax is designed to stay as close to real CSS as possible.

Boss uses framework detection to decide whether the prop is `className` (React/Next/Preact) or `class` (Solid/Qwik/Stencil).

ClassName parsing is **server-side only**. In `runtime.only` mode, className strings are not converted into CSS.

## Basic format

<Tabs>
<TabItem value="react" label="React / Next.js">

```html
<div className="display:block color:red font-size:32">
  ClassName styles
</div>
```

</TabItem>
<TabItem value="solid" label="Solid / Qwik / Stencil">

```html
<div class="display:block color:red font-size:32">
  Class styles
</div>
```

</TabItem>
</Tabs>

Each segment is `prop:value`. Unsupported segments are ignored.

## Static strings only

ClassName parsing only supports static strings (string literals or template literals without `${}`):

```tsx
<div className="display:flex gap:12" />
```

Template literals with expressions are skipped:

```tsx
<div className={`display:flex ${dynamic}`}/> // skipped by the parser
```

Use `cx` to build className strings from conditionals, but keep the Boss tokens static:

```tsx
<div className={$$.cx("display:flex", isActive && "hover:color:purple")} />
```

## Pseudo chaining

```html
<div className="hover:color:yellow active:color:orange">
  Hover and active
</div>
```

Multiple pseudos can be chained:

```html
<div className="hover:focus:font-size:12">
  Hover + focus
</div>
```

## Grouped pseudo values

Use braces to group multiple declarations under one pseudo token:

```html
<div className="hover:{color:red;text-decoration:underline}">
  Hover group
</div>
```

This is matched as a full class token (exact, but less optimized). When using the compiler, grouped selectors
with multiple entries are normalized into per-prop tokens (sorted by prop name), for example:

```html
<div className="hover:color:red hover:text-decoration:underline">
  Hover group
</div>
```

You can also chain pseudos or media shorthands:

```html
<div className="hover:focus:{color:red;text-decoration:underline}">
  Hover + focus group
</div>

<div className="mobile:hover:{display:block;color:red}">
  Mobile hover group
</div>
```

## Arbitrary selectors

Use bracket syntax to target arbitrary selectors:

```html
<div className="[&>div]:color:red">
  <div>Nested child</div>
</div>
```

Inside `[...]` you can use any CSS selector, relative to the component. Use `_` to represent spaces:

```html
<div className="[&_.title]:font-weight:700">
  <span className="title">Title</span>
</div>
```

If the selector contains `&`, it is replaced with the current selector. If it does not, it is treated as a descendant selector:

```html
<div className="[.title]:color:blue">
  <span className="title">Descendant</span>
</div>

<div className="[.title_&]:color:red">
  <span className="title">Current inside .title</span>
</div>
```

## Media queries with `at`

```html
<div className="at:mobile+:display:block">
  Responsive display
</div>
```

You can also chain media and pseudo:

```html
<div className="mobile:hover:display:block">
  Mobile hover
</div>
```

## Array values

Use underscores to express arrays:

```html
<div className="margin:20_0 padding:8_16">
  margin: 20px 0; padding: 8px 16px;
</div>
```

## `!important`

End a class token with `!` to emit `!important`:

```html
<div className="color:red! hover:color:blue!">
  Important styles
</div>
```

## Content with quotes

```html
<div className="before:content:''">
  before content
</div>
```

## Tailwind and other classes

Boss CSS only acts on known CSS props or pseudo keywords. That means Tailwind-like classes are ignored unless you enable Bosswind:

```html
<div className="hover:bg-gray-100">
  This remains untouched by Boss CSS
</div>
```

If you want utility-style generation, stick to `prop:value` syntax or enable the Bosswind plugin.

## ClassName helper

Use `cx` when you need to compose className strings from arrays, objects, or conditional values. `cx` wraps css-variants input semantics and then applies Boss conflict resolution, so it is preferred over calling `merge` directly.

```ts
$$.cx("card", { "color:red": true }, ["color:blue"])
// -> "card color:blue"
```

You can also import it directly if you prefer:

```ts
import { cx } from "boss-css/variants"

cx("card", { "color:red": true }, ["color:blue"])
// -> "card color:blue"
```
