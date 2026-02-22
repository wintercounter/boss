---
title: Dictionary and CSS Output
---

Boss CSS centralizes prop metadata in a dictionary and writes CSS through a minimal CSS builder.

## Dictionary

```ts
api.dictionary.set('color', {
  property: 'color',
  aliases: ['color'],
  description: 'CSS color property',
  values: [],
  initial: 'currentColor',
  isCSSProp: true,
})
```

- `aliases` let multiple prop names map to the same CSS property.
- `isCSSProp` marks standard CSS properties.
- The dictionary powers type generation and prop lookup.

## CSS builder

```ts
api.css.selector({ className: api.contextToClassName('color', 'red', []) })
api.css.rule('color', 'red')
api.css.write()
```

The builder also supports:

- `pseudos` for pseudo selectors
- `query` for `@media` wrappers
- `root` variables (used by tokens)

## Output format

Boss CSS emits compact CSS:

```css
.color\:red { color: red }
@media screen and (min-width: 376px) {
  .at\:mobile\+\:display\:block { display: block }
}
```
