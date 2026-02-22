---
title: ESLint
---

Boss provides an ESLint plugin that formats Boss class lists and enforces Boss-specific rules.

## Install

```bash
npm install --save-dev boss-css
```

The ESLint plugin ships inside `boss-css` and is imported from `boss-css/eslint-plugin`.
This plugin is ESM-only, so use ESLint flat config or an ESM config file.

## Quick start

```js
// eslint.config.js
import bossCss from 'boss-css/eslint-plugin'

export default [
  bossCss.configs.recommended,
]
```

`bossCss.configs.*` also declares `$$` as a readonly global to avoid `no-undef` when Boss globals are enabled.

## Recommended configs

- `bossCss.configs.stylistic`: formatting only (warn).
- `bossCss.configs.correctness`: correctness only (error).
- `bossCss.configs.recommended`: both (warn for formatting, error for correctness).

Each config also ships `-warn` and `-error` variants (for example `recommended-warn`).

## Rules

Stylistic:
- `boss-css/format-classnames`: Normalizes class lists using `boss-css/merge`.
- `boss-css/redundant-cx`: Disallow wrapping `$$` className with `cx` since `className` already accepts cx inputs.
- `boss-css/prefer-token-values`: Prefer token keys (for example `color="foo"`) instead of `$$.token.*` when the prop has tokens.
- `boss-css/prefer-unitless-values`: Prefer unitless numeric class values for the configured default unit (for example `border:1_solid` over `border:1px_solid`).

Correctness:
- `boss-css/no-unknown-classes`: Disallow unknown or non-Boss class names.

Optional enforcement rules (mutually exclusive by style):
- `boss-css/props-only`: Require Boss props instead of class names.
- `boss-css/classnames-only`: Disallow Boss props; require className instead.
- `boss-css/prefer-classnames`: Prefer className for static Boss props; allow props only for dynamic values.

## How it validates classes

The plugin loads your Boss server API from `.bo$$/config.js` using `boss-css/api/config`. That means custom props, pseudos, and at-variants registered by your plugins are treated as valid. If the API fails to load, it falls back to CSS prop validation via `@boss-css/is-css-prop`.

## Options

### Class list matching

Used by `format-classnames`, `no-unknown-classes`, `props-only`, and `prefer-unitless-values`.

```json
{
  "attributes": ["^class(?:Name)?$"],
  "callees": ["^cx$", "^merge$", "^\\$\\$\\.cx$", "^\\$\\$\\.merge$"],
  "variables": ["^classNames?$", "^classes$"],
  "tags": []
}
```

### Unitless value options

Used by `prefer-unitless-values`.

- `unit`: override the default unit to strip (defaults to project `unit`, otherwise `px`).

### Validation options

Used by `no-unknown-classes` and `props-only`.

```json
{
  "allowCustomContexts": false,
  "additionalContexts": [],
  "additionalProps": [],
  "singleProps": []
}
```

### Boss component options

Used by `classnames-only`, `prefer-classnames`, and `prefer-token-values`.

```json
{
  "components": ["$$"],
  "additionalContexts": [],
  "additionalProps": []
}
```

### Redundant cx options

Used by `redundant-cx`.

```json
{
  "components": ["$$"],
  "callees": ["^cx$", "^\\$\\$\\.cx$"]
}
```

### Merge options

Used only by `format-classnames`.

- `order`: `"none" | "asc" | "desc" | "official" | "improved"` (default: `"improved"`).
- `official`/`improved` use a CSS property order derived from `stylelint-config-recess-order`.
- `merge`: shape matches `boss-css/merge`.

```json
{
  "merge": {
    "cacheSize": 500,
    "sortContexts": true,
    "orderSensitiveContexts": ["before", "after"],
    "compoundContexts": ["at"],
    "conflictMap": {}
  }
}
```

## Example with enforcement

```js
// eslint.config.js
import bossCss from 'boss-css/eslint-plugin'

export default [
  bossCss.configs.recommended,
  {
    rules: {
      'boss-css/prefer-classnames': 'warn',
      // or 'boss-css/props-only': 'error',
      // or 'boss-css/classnames-only': 'error',
    },
  },
]
```
