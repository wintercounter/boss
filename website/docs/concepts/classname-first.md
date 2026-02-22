---
title: Classname-first Strategy
---

The `classname-first` strategy prefers CSS classnames for static values, and uses CSS variables only for dynamic values expressed as functions.

## Why classname-first

- Static values become class selectors, making output predictable and shareable.
- CSS output size is closest to Tailwind-style utilities because each unique value emits a class rule.
- Dynamic values must be written as functions: `prop={() => value}`. Non-function dynamics are skipped.

## Example

Input:

```tsx
<$$
  color="red"
  hover={{ color: () => tone }}
  at={{ 'mobile+': { padding: 12 } }}
/>
```

Output (conceptually):

- Static props become class names: `className="color:red at:mobile+:padding:12"`.
- Dynamic props become CSS variables:

```css
.hover\:color:hover { color: var(--hover-color) }
```

Runtime output from the browser parser builds the `className` and CSS variables automatically.

## Notes

- Dynamic values must be functions for the runtime to decide at render time.
- Tokens are still emitted as CSS variables, but classnames use the token path segment (e.g. `color:white`).
- Non-function dynamic values are skipped (a warning is logged).

## Runtime strategy

When `runtime.strategy` is `classname-first`, the runtime-only handler applies the same rules and injects any required CSS in the browser.
