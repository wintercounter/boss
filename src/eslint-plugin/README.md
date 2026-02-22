# boss-css/eslint-plugin

ESLint plugin for Boss CSS formatting and rules.

## Install

```
npm install --save-dev boss-css
```

The ESLint plugin ships inside `boss-css` and is imported from `boss-css/eslint-plugin`.

This plugin is ESM-only; use ESLint flat config or an ESM config file.

The plugin loads your Boss server API using the local `.bo$$/config.js` (via `boss-css/api/config`) so it can validate custom props and contexts.

## Usage

```js
// eslint.config.js
import bossCss from 'boss-css/eslint-plugin'

export default [
    bossCss.configs.recommended,
    {
        rules: {
            // Optional: enforce props-only or classnames-only style
            //'boss-css/props-only': 'error',
            //'boss-css/classnames-only': 'error',
            //'boss-css/prefer-classnames': 'warn',
            //'boss-css/require-prop-functions': 'error',
        },
    },
]
```

`bossCss.configs.*` also declares `$$` as a readonly global to avoid `no-undef` when Boss globals are enabled.

## Rules

- `boss-css/format-classnames`: Normalizes class lists using `boss-css/merge`.
- `boss-css/no-unknown-classes`: Disallow unknown/non-Boss class names.
- `boss-css/props-only`: Require Boss props instead of class names.
- `boss-css/classnames-only`: Disallow Boss props; require className.
- `boss-css/prefer-classnames`: Prefer className for static Boss props, allow props for dynamic values.
- `boss-css/require-prop-functions`: Require `prop={() => value}` for dynamic Boss props when classname-first is enabled.
- `boss-css/redundant-cx`: Disallow wrapping `$$` className with `cx` since `className` already accepts cx inputs.
- `boss-css/prefer-token-values`: Prefer token keys (for example `color="foo"`) instead of `$$.token.*` when the prop has tokens.
- `boss-css/prefer-unitless-values`: Prefer unitless numeric class values for the configured default unit (for example `border:1_solid` over `border:1px_solid`).

`boss-css/require-prop-functions` only reports when the project is configured with the classname-first strategy, so it can be enabled globally.

## Options

All class list rules (`format-classnames`, `no-unknown-classes`, `props-only`, `prefer-unitless-values`) support:

```json
{
    "attributes": ["^class(?:Name)?$"],
    "callees": ["^cx$", "^merge$", "^\\$\\$\\.cx$", "^\\$\\$\\.merge$"],
    "variables": ["^classNames?$", "^classes$"],
    "tags": []
}
```

`prefer-unitless-values` also accepts:

- `unit`: override the default unit to strip (defaults to project `unit`, otherwise `px`).

`format-classnames` also accepts:

- `order`: `"none" | "asc" | "desc" | "official" | "improved"` (default: `"improved"`).
- `official`/`improved` use a CSS property order derived from `stylelint-config-recess-order`.
- `merge`: same shape as `boss-css/merge` config (`cacheSize`, `sortContexts`, `orderSensitiveContexts`, `compoundContexts`, `conflictMap`).

Validation rules (`no-unknown-classes`, `props-only`) also support:

```json
{
    "allowCustomContexts": false,
    "additionalContexts": [],
    "additionalProps": [],
    "singleProps": []
}
```

Boss component rules (`classnames-only`, `prefer-classnames`, `prefer-token-values`) support:

```json
{
    "components": ["$$"],
    "additionalContexts": [],
    "additionalProps": []
}
```

`redundant-cx` supports:

```json
{
    "components": ["$$"],
    "callees": ["^cx$", "^\\$\\$\\.cx$"]
}
```
