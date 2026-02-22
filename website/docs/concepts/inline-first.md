---
title: Inline-first Strategy
---

The `inline-first` strategy prioritizes inline styles for top-level CSS props, and uses CSS variables + classes for nested contexts like pseudo states and media queries.

## Why inline-first

- Inline styles are cheap to apply for simple props.
- Nested styles require selectors, so they become CSS classes with variables.
- It produces the smallest CSS output because static top-level props do not emit class rules.
- The runtime stays small and predictable.

## Example

Input:

```tsx
<$$
  color="red"
  hover={{ color: 'blue' }}
  at={{ 'mobile+': { color: 'green' } }}
/>
```

Output (conceptually):

- Inline style for the base prop: `style={{ color: 'red' }}`
- CSS variables + classes for nested props:

```css
.hover\:color:hover { color: var(--hover-color) }
@media screen and (min-width: 376px) {
  .at\:mobile\+\:color { color: var(--at-mobile-plus-color) }
}
```

Runtime output from the browser parser builds the `className` and CSS variables automatically.

## Notes

- Nested CSS props always use variables to avoid inline conflicts.
- Nested selectors are emitted with `!important` so they can override inline styles when needed.
- Shorthand properties and deep props also prefer variables.
- Function values are evaluated by the runtime (use hybrid or runtime-only if you rely on them).

## Runtime strategy

When `runtime.strategy` is `inline-first`, these same rules are applied by the runtime-only handler, and any required CSS is injected in the browser.
