---
title: React Native
---

Boss CSS can emit a React Native runtime alongside the existing web output. The native runtime uses the same `$$` API but maps props into React Native `style` and passes non-style props through as native component props.

## What you get

- `.bo$$/native.js` and `.bo$$/native.d.ts` generated next to the web runtime.
- `$$` defaults to `View` (not `div`).
- `$$.Text`, `$$.Image`, etc map to React Native components.
- Tokens resolve to literal values at runtime (no CSS variables).

## Setup

1) Ensure `react-native` is installed in the project (Boss reads RN types to build the prop list).

2) Add the native plugin to your `.bo$$/config.js`:

```js
import * as native from 'boss-css/native/server'

export default {
  folder: './.bo$$',
  plugins: [
    // web plugins...
    native,
  ],
}
```

3) Import the native runtime in your app entry:

```tsx
// App.tsx (or your RN entry)
import $$ from './.bo$$/native'

export default function App() {
  return <$$ padding={12}><$$.Text>Native UI</$$.Text></$$>
}
```

If you want the global `$$`, the native plugin enables it by default. You can disable it in config:

```js
import * as native from 'boss-css/native/server'

native.settings.set('globals', false)
```

## Expo setup (managed workflow)

Minimal setup for Expo projects:

1) Add the native plugin to `.bo$$/config.js` (same as above).
2) Import the native runtime in your Expo entry:

```tsx
// App.tsx
import $$ from './.bo$$/native'

export default function App() {
  return (
    <$$ padding={12}>
      <$$.Text>Expo + Boss</$$.Text>
    </$$>
  )
}
```

If you want full CSS output on web (selectors, pseudos, media queries), keep the web runtime available and use a web-specific entry:

```tsx
// App.web.tsx
import $$ from './.bo$$'
```

```tsx
// App.native.tsx
import $$ from './.bo$$/native'
```

## Using `as` and custom components

`as` works with native component references, not DOM tag strings:

```tsx
import { Pressable } from 'react-native'

<$$ as={Pressable} padding={12} borderRadius={10}>
  <$$.Text>Press me</$$.Text>
</$$>
```

Custom components also work as long as they forward `style` and props:

```tsx
import { View } from 'react-native'

const Card = ({ style, ...props }) => <View style={style} {...props} />

<$$ as={Card} padding={16} />
```

## Component mapping

The native runtime maps the following keys to React Native components:

- `View` (default)
- `Text`
- `Image`
- `ScrollView`
- `Pressable`
- `TextInput`
- `SafeAreaView`
- `Modal`
- `FlatList`
- `SectionList`
- `Switch`
- `TouchableOpacity`
- `TouchableHighlight`
- `TouchableWithoutFeedback`
- `ActivityIndicator`

Example:

```tsx
<$$ padding={12}>
  <$$.Text fontSize={16}>Hello</$$.Text>
  <$$.Image source={{ uri: 'https://example.com/img.png' }} />
</$$>
```

## Props and style mapping

Native props are split into two buckets:

- **Style props**: anything that matches React Native style types (`ViewStyle`, `TextStyle`, `ImageStyle`) is placed into `style`.
- **Non-style props**: passed through to the native component.

Boss merges style props with existing `style` values:

- If `style` is an object, it merges objects.
- If `style` is an array, it appends the Boss styles to the array.

```tsx
<$$
  testID="card"
  style={{ opacity: 0.7 }}
  margin={12}
  shadowOffset={{ width: 0, height: 4 }}
/>
```

Resulting `style`:

```ts
{ opacity: 0.7, margin: 12, shadowOffset: { width: 0, height: 4 } }
```

### Custom native style props

If you rely on additional style props, add them in config:

```js
export default {
  nativeStyleProps: ['shadowRadius', 'gap'],
}
```

### Numeric values

String numbers are converted to numbers:

```tsx
<$$ margin="12" /> // -> 12
```

Arrays are preserved (useful for transforms):

```tsx
<$$ transform={[{ scale: 1.1 }]} />
```

### Dynamic values

Functions are evaluated at runtime:

```tsx
<$$ padding={() => 12} />
```

## Tokens in native

Native output resolves tokens to literal values:

```tsx
<$$ color="primary" />
<$$ color={$$.token.color.primary} />
```

Define tokens in your config:

```js
export default {
  tokens: {
    color: {
      primary: '#ed4b9b',
    },
    spacing: {
      sm: 8,
      md: 12,
    },
  },
}
```

Tokens are read from your config and embedded into `native.d.ts` for autocomplete.

## TypeScript notes

- `native.d.ts` includes React Native style prop types.
- Autocomplete appears as soon as you import `./.bo$$/native` anywhere in the project.
- The token type surface is embedded into the generated typings.

## Unsupported features (native)

React Native does not support CSS selectors or classnames. The native runtime ignores:

- `className`
- `child` (arbitrary selectors)
- `pseudo` nesting
- `at` queries

Keep those in the web pipeline only.

## Expo web

Expo renders React Native components on web. You can still use the native runtime in Expo, and the web runtime stays available for full CSS output when needed.

## Troubleshooting

**"native: react-native is not installed in this project"**
- Install `react-native` so Boss can read its type definitions.

**No `native.js` output**
- Ensure `boss-css/native/server` is included in the plugin list.
- Ensure the config is being loaded from the correct `.bo$$` folder.
