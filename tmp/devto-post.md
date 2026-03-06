---
slug: introducing-boss-css
title: 'Boss-CSS: I created another "CSS-in-JS" lib, and here is why!'
authors: [wintercounter]
tags: [boss-css, announcement, css-in-js]
---

# Boss-CSS: I created another "CSS-in-JS" lib, and here is why!

> **Boss-CSS** is a _polymorphic_ "CSS-in-JS" library supporting multiple different ways of applying CSS to your codebase, with or without runtime.

Before I get into the details there are a few things I want to clarify. I'm not a content creator or writer, and I don't want to be. For this reason, this will be one single, _detailed, long ass post_. I'll try to explain and justify the choices I made inspired by my past experiences. It'll also serve as some sort of initial documentation.

In case you want to read about the library itself and skip its history, jump here: [Boss CSS](#boss-css)

## History

I'm coding mostly for web for 22 years now, and for 17 professionally. I've used several different ways to do CSS, using all kinds of frameworks, methodologies, different styling solutions, compilers and architectures. We always change for the better, trying to overcome the problems our previous solution suffered from. But this doesn't mean the new solution performs better in all areas, always leaving a gap behind.

My first stop was using raw CSS. To solve organization issues, I started to split files into multiple chunks. To simplify selector usage, I've started to use LESS and SASS with support for nesting. To solve issues with naming and avoid selector collision, I was using methodologies like Atomic CSS and BEM. To simplify usage in the codebase and enable tree-shaking, I started to use CSS Modules. To improve DX, I started to use CSS-in-JS based solutions. To solve runtime performance issues, I started to use build-time static extraction. I started to use Tailwind, because it's lightweight and framework agnostic. All the solutions are coming with their own strengths and flaws, which would deserve their own articles.

Around 8 years ago, I chose Grommet as the UI layer for a project. I immediately fell in love with their Box component, but I still ended up writing custom style objects for specific needs. A few years later, on another project, I ended up creating my own Box component. At the end it got quite complex and still, it didn't give me full CSS support, which again required me to write custom style objects and custom class names in CSS files.

This was the time when [CCSS](https://ccss.dev) and [YouEye](https://youeye.dev) were born. It fundamentally changed how I wrote and used CSS. I'm still using them in production today, but (as it should) they started to reveal their own weaknesses over time.

### My relationship with Tailwind

The last couple of years it became unavoidable to work with Tailwind on a project. I'm using it both in personal and professional projects. It's a classic love-hate relationship. I always loved the idea of utility classes and Atomic CSS. In fact, I've created my first utility class based CSS framework on top of SASS 11 years ago. It was generating utility classes based on configuration, then it was purging the final CSS based on usage. The final results were actually pretty close to Tailwind's AOT compiler.

However, I have some problems using Tailwind:

- I always end up in situations where I have to keep maintaining a separate styling solution for custom needs. Tailwind is only a subset of CSS and it won't cover every area.
- The naming of selectors: I wouldn't be able to count on my 2 hands how many times I've Googled the term `tailwind line-height`, because of course, it's `leading` and I keep forgetting that. What's `font-size` in CSS, it's `text-[size]` in Tailwind. These minor differences are driving me crazy, and in some cases it's seriously interrupting my flow.
- Dynamic cases: whether Tailwind or CSS Modules, I always disliked merging class names using 3rd-party utilities, and by hand using conditions.
- States and pseudo elements: I hate using `hover` 5 times just to style my hover state.
- Breakpoints: I always hated mobile-first approaches, especially nowadays when it doesn't really make sense anymore.

> Please note that at the time of writing this, we only had Tailwind v2 available. It came a long way since then, solving many problems, especially around custom CSS.

I understand those who are in favor of Tailwind over native CSS. It actually solves a lot of quirks and issues coming with native CSS. I believe it's a much better choice for those who started web development in the last couple of years or have a more backend-heavy background and feel uncomfortable writing CSS directly.

However, I spent a lot of years learning, understanding and overcoming these problems. In most cases, **I simply want to write CSS**, and Tailwind just doesn't give me that.

## Today

I actually never intended to write another CSS-in-JS library. But over the years I had so many thoughts about what I'd do differently, how I'd solve certain problems. Sometimes I had sleepless nights thinking about styling in different ways. Over time, these thoughts piled up and I've started to connect the dots in my mind. Last year, during such a night, I've decided to get up and test a few things in an online playground. It was the moment when I decided to start this new project, because I felt like I could offer something new.

The biggest question for me: which solution made me the happiest, the most productive, and had the best possible balance in terms of both DX and UX? For me it was **prop-based CSS-in-JS with static and dynamic extraction**.

Since working remotely I've joined several short-term projects either as a developer or consultant. I've seen dozens of cases where projects had their own `Box` component, each of them suffering from different flaws. This was also a fueling factor, because I know it could be better, I did use better in the past.

### Boss was born

When I first started to work on this new library, my goal was to create a solution that's tooling independent. YouEye and many existing tools are mostly relying on custom Babel plugins by parsing and modifying AST at build time. I moved away from Babel years ago due to performance reasons, first to ESBuild then to SWC. I wanted a way that works regardless of the stack a project is using. Tailwind introduced such a way: parse on your own.

Initially, I simply wanted to have prop-based CSS-in-JS that's extracted as Atomic CSS, while having a lightweight runtime that doesn't emit or manipulate stylesheets. I also wanted to make sure that it's fairly easy to extend its functionality, which led me to an event-based solution for its overall architecture. Soon I realized that this deep control enables me to add support for different syntaxes and extraction strategies, so users can decide which combination suits their project best. This is the reason for the name Boss, it lets you be in control.

I spent a lot of my free time working on the library. Unfortunately, I don't really have much time next to my family and work, which led to very slow progress. At the beginning of 2024 I also had some personal issues, which forced me to pause every personal project. This slow progress definitely caused some fragmentation in my code. However, I spent so much time working on this and I truly believe it offers something new, I simply don't want it to go to waste.

For the above reasons I decided to bring the project into shape for an early Alpha release. I did, it was 90% ready. However after 3 months of sleepless nights and grinding next to work and the fam, I hit a rough burnout phase. Only some minor bugfixes, documentation, website, playground and such were left. I spent so much time away from the project that I ended giving it up.

Last year I slowly moved over to vibe-coding. Today, I mostly just review and instruct the agent's work. I decided to "revive" the project in the middle of boredom. This time with AI only, taking care of all the missing parts. Well, from this point I quickly got into the rabbit hole, asking the AI to add features I previously planned to implement in a future version, features I didn't even want to implement. It only took ~4 weeks of some free time to finish all this. Not the best quality of results, but it works enough.

My hope is that it'll gain some traction in the community, which would force me to find a way to work on it more seriously. I hope to get some help to shape its rough edges, and help to build reliable documentation. In case those things don't happen, I still wanted to put it out there and hopefully inspire fellow developers with some ideas my solution brings to the table.

Honestly, I'm not even sure if the lib has relevance nowadays in this AI era.

## Boss CSS

When building Boss, I tried to bring the **best parts** of different styling solutions I used over the years. While that is subjective, I believe I achieved that for the most part.

### It's just CSS

I often see libraries and frameworks coming with custom props, custom namings for some cases, like the `p` and `m` prop only for margin and padding, but nothing else, or consolidating `font-*` and `text-*` properties under a single prefix. These add extra learning curves, and can disrupt the flow of those coming with a heavy native CSS background.

**Parity with CSS naming and syntax** was one of the most important goals for me. I wanted to be able to write CSS as it is as much as possible, without having to translate it in my head to some custom syntax. Class name based styling is basically almost inline styles by look.

**If you know CSS, you know 98% of Boss.**

### Multiple syntax support

I'm going to showcase all the different syntaxes supported out of the box.

Why support multiple syntax? Because it lets you mix-n-match according to your own preferences, and your own specific needs/use cases.

#### Prop based styling

```jsx
<$$ color="red">
```

Prop-based styling is the **default** for me for a long time now. I simply love it more than anything else. It comes with great flexibility, handles dynamic cases very well, is highly customizable for different design system needs, and can be perfectly typed.

_Read more in the Docs: [JSX usage](https://bosscss.com/docs/usage/jsx)._

#### Class name based styling

```jsx
<div className="color:red">
```

Using class names is really convenient, but when it comes to dynamic cases, this is where it can get messy. In Boss, using class names really just looks like using inline styles. It has almost identical syntax, with the additional benefit of targeting states, pseudo elements, media queries, keyframes, tokens, and more.

_Read more in the Docs: [Classname usage](https://bosscss.com/docs/usage/classname)._

#### Object based styling

```jsx
<span {...$$.style({ color: 'red' })}>
```

It's basically prop-based styling with a different syntax, but if you prefer objects instead of props, no problem. (I know in this example it doesn't look any different from an ordinary style object, and that's a good thing.)

#### Prepared components

```jsx
$$.MyStyledContainer = $$.$({
    width: 1200,
})

const Component = () => <$$.MyStyledContainer>...</$$.MyStyledContainer>
```

A concept Styled Components popularized in the first place, and it's really handy to create reusable elements.

_Read more in the Docs: [Prepared components](https://bosscss.com/docs/usage/prepared-components)._

#### Raw CSS

If needed, you can still append raw CSS blocks with `$$.css` template string/object forms. It remains useful for custom selectors and one-off rules. Because sometimes we still need it.

```js
$$.css(`
  #element .selector ul li {
    /* my custom css */
  }
`)
```

Because sometimes we need it.

#### Mixed

```jsx
<$$.a
    className="display:flex place-content:center"
    color={linkColor}
    hover={{ background: 'red', borderBottom: '1px solid #000' }}
>
    Click me!
</$$.a>
```

#### Bosswind

An optional plugin that provides **Tailwind-like shorthands and tokens out-of-the-box**.

```jsx
// As classNames
<$$ className="flex px:1 text:xl" />
// As props
<$$ flex px={1} text="xl" />
```

In this example I used class names for static styles, and props for dynamic cases, as well as the `hover` prop instead of multiple `hover:*` classes.

_Read more in the Docs: [Bosswind](https://bosscss.com/docs/usage/bosswind)._

### Runtime?!

As you might have seen in the previous examples, prop-based styling is done through a custom component, which might make you think runtime is required. And you're not wrong. However, you have the option to compile away all the components to native elements in a bundler-agnostic way, or just use class names, which doesn't need runtime.

Why I call Boss a **polymorphic** CSS-in-JS library is because **Boss includes runtime based on your usage**. In case you're only using class names with `classname-only`, runtime files won't be generated at all. Plugins can determine when and what code to include based on how you're using styles. This makes it possible to use Boss class names in basically any stack/environment, regardless of framework or programming language.

Having a lightweight runtime can be just as good as not having any, but the **most important part** is that it can give superpowers. There are many never-seen features in my head utilizing runtime, and I'm eager to share them over time. One I can share is the experimental devtool: when you select a DOM element on the page, you can adjust its styling or source code right in the browser, hit save, and it writes the changes back to the source file, without leaving the browser.

This polymorphism also applies to TypeScript types and AI files. Boss generates **TS types, AI docs, and AI skills** based on your configuration, updating them based on your usage. It supports types for custom properties, prepared components and design tokens as well.

Boss runtime also works differently compared to classic CSS-in-JS solutions. In inline-first and classname-first it does not generate full stylesheets on every render. In runtime-only mode it can inject only the needed rules on the client. You can also go hybrid, and have both pre-generated CSS at build time and runtime support for highly dynamic cases, for example when users modify styles or certain rules come from a 3rd-party source. This is one of the biggest ideas behind the architecture.

_Read more in the Docs: [Runtime strategy](https://bosscss.com/docs/concepts/runtime-strategy)._

### Extraction strategies

Boss supports different extraction strategies. Again, this is to facilitate different needs.

#### Inline first

This is the **default strategy**. Boss prioritizes inline styles, putting everything possible inline, saving a large chunk of external, initial and unused CSS.

Performance is arguable. You can find studies saying inline styles are faster and just as many saying it's slower. In my opinion it's circumstantial. But even if it tends to be slower in some cases, you save time on loading external stylesheets, which are normally blocking requests delaying FCP.

Input:

```jsx
<$$ color="red" hover={{ color: 'yellow' }} />
```

Output:

```jsx
<div class="hover:color" style="color: red; --hover-color: yellow" />
```

In the above case we only have external CSS for the hover state.

#### Class name first

This is the opposite of inline first. It uses class names wherever possible and keeps inline only where unavoidable (for example user-flagged dynamic cases using CSS variables). This approach is close to Tailwind-like output.

Input:

```jsx
<$$ color="red" hover={{ color: 'yellow' }} />
```

Output:

```jsx
<div class="color:red hover:color:yellow" />
```

#### Fully runtime

There are projects which need full runtime support and need to generate styles on the fly. Projects with complex WYSIWYG editors or page styles coming from separate databases. Full runtime support is for these cases.

Boss supports this with the `runtime` strategy (`runtime.only: true`) and also supports hybrid mode (`runtime.only: false`) when you want server CSS output plus runtime dynamics.

#### Zero runtime extraction

It is possible to transform source to native HTML elements, classes and style objects at build time, leaving runtime out completely.

Today this can be achieved through:

- `classname-only` strategy for static class usage
- `npx boss-css compile` for source transformation and runtime pruning in supported cases

```bash
npx boss-css compile
```

Simple compile example:

```jsx
// input
const Example = () => <$$ color="red" padding={8} />

// output
const Example = () => <div style={{ color: 'red', padding: '8px' }} />
```

_Read more in the Docs: [Compile](https://bosscss.com/docs/tooling/compile), [Classname-only strategy](https://bosscss.com/docs/concepts/classname-only)._

### Framework-agnostic approach

What I dislike about many extraction tools is that they are mostly tied to a custom compiler integration (Babel plugin, framework plugin, bundler lock-in). Boss is intentionally different here.

Boss is built to run through PostCSS, CLI build/watch, or compile mode, **without requiring Babel/Webpack/Vite-specific plugins**. That makes it easier to carry the same styling API across React, React Native, Next, Preact, Solid, Qwik, Stencil, and non-JSX/non-JS setups using static class names.

_Read more in the Docs: [Tooling agnostic](https://bosscss.com/docs/concepts/tooling-agnostic)._

### Goodies

It's time to write about other random features and goodies Boss supports.

#### `$$` is global

By default, you can access Boss components and utilities using the `$$` global variable. Whoever is old enough to have worked with jQuery can't argue that accessing `$` everywhere was pure simplicity, and with inline styles the feeling is no different. Besides, you don't want to import Boss in every single file where you write markup, just as much as you would not want to do `import { div, a, span, section } from 'react'`.

#### Powerful plugin system

It's so powerful that **basically every feature of Boss is just a plugin**. The core is mainly the event system. Plugins are split into server/browser code: server controls compile-time tasks, browser code ends up in your production bundle when needed.

Example for a simple custom prop plugin:

```js
// .bo$$/plugins/bleed/server.js
export const name = 'bleed-prop'

export const onBoot = api => {
    api.dictionary.set('bleed', {
        property: 'margin',
        aliases: ['bleed'],
        description: 'Custom bleed prop',
        isCSSProp: true,
    })
}

export const onProp = async (api, { name, prop, contexts }) => {
    if (name !== 'bleed') return

    api.css.selector({
        className: api.contextToClassName(name, prop.value, contexts),
    })
    api.css.rule('margin', prop.value)
    api.css.write()
}
```

```js
// .bo$$/config.js
import * as bleedProp from './plugins/bleed/server'

export default {
    plugins: [bleedProp /* ... */],
}
```

```jsx
<$$ bleed={-14} />
```

Numeric values use Boss's built-in unit conversion (`api.unit`), so there is no need for manual `${v}px`.

_Read more in the Docs: [Plugin hooks](https://bosscss.com/docs/api/plugin-hooks)._

#### CLI tools

Boss also ships CLI tools for the full workflow:

```bash
npx boss-css init
npx boss-css build
npx boss-css watch
npx boss-css compile
npx boss-css dev
```

So whether you're on PostCSS or a custom/non-PostCSS setup, you still have a clear path to bootstrap, build, watch, and optimize.

_Read more in the Docs: [CLI](https://bosscss.com/docs/tooling/cli)._

#### AI ready

Boss has built-in AI readiness through the AI plugin. It can generate `LLMS.md` plus an AI skills bundle from your live configuration and usage metadata (tokens, breakpoints, prepared components, strategy context, and more).

This means agents can work with **project-specific styling context**, not just generic guesses.

_Read more in the Docs: [AI plugin](https://bosscss.com/docs/tooling/ai)._

#### Fontsource plugin

Boss can load fonts from the Fontsource catalog through the `fontsource` plugin, and injects the needed CSS when `fonts` is configured.

```js
import * as fontsource from 'boss-css/fontsource/server'

export default {
  plugins: [fontsource, /* ... */],
  fonts: [{ name: 'Inter', token: "body" }],
}

<$$ fontFamily="body" />
```

_Read more in the Docs: [Fonts and Fontsource](https://bosscss.com/docs/usage/fonts)._

#### Grouped selectors

You can use multiple styles inside one state/pseudo while using class names. I have to admit that generated selectors for these are not always pretty. But it works, it's there, and it's nice to have. Besides, if you use compiler, that will split up such selectors for you.

```html
<div class="hover:{color:red;text-decoration:underline} mobile:{width:100vh;background:blue}"></div>
```

#### At (`@`) prop and breakpoints

You can write responsive styles with `at` and with shorthand breakpoints.

```jsx
<$$ at={{ 'mobile+': { fontSize: 18 } }} />
<$$ tablet={{ fontSize: 18 }} />
```

ClassName equivalent:

```html
<div class="at:mobile+:display:block" />
<div class="mobile:hover:display:block" />
```

Built-in defaults include `micro`, `mobile`, `tablet`, `small`, `medium`, `large`, and `device`, with `name`, `name+`, and `name-` forms.

It also supports arbitrary values and ranges, such as `mobile-800`.

Boss also supports container queries through `container`, `containerType`, `containerName`, and `container_*` shorthands.

```jsx
<$$ containerType="inline-size" containerName="card">
    <$$.div container_card={{ mobile: { fontSize: 18 } }}>Child reacts to the parent container</$$.div>
</$$>
```

ClassName equivalent:

```html
<div class="container-type:inline-size container-name:card">
    <div class="container_card:mobile:font-size:18">Child reacts to the parent container</div>
</div>
```

_Read more in the Docs: [Pseudo and @ / responsive contexts](https://bosscss.com/docs/usage/pseudo-and-at)._

#### Design tokens

You can access tokens in different ways:

- `<$$ color="primary">`
- `<$$ color={$$.token.color.primary}>`
- `<div className="color:primary">`
- `<div className="color:$$.token.color.primary">`

TypeScript hints include available token values for each property.

![TypeScript types also include the available tokens for a property.](data:image/png;base64,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aGiTYhkaHQenU1vGZeEKdN3WwR9sOqUf/G6cqdz5+i00X3c1959Gp4NaWHhcidGbRURERETOSI4TuulHjrv7MxwPBNq6v/TvZLMsCHb80C2HOmKV90ff2rQsq5eACOBQb8xRYdAKHr3tiFPyo4hiDepNeAbH6TCvIiIiIiKnjlNyJfFMZEwAv9PH8yylzzy2D8tyR28WERERETkjnbYriWciy3Ljsgfh2SNnMJcdp4AoIiIiInKMFBJPIS4rLrTyhSt0aqf0g4WFC4/tw2UpdIuIiIiIHCudbioiIiIiInKGOObTTU/de2uKiIiIiIjIiaDTTUVERERERCRCIVFEREREREQiFBJFREREREQkQiFRREREREREIhQSRUREREREJEIhUURERERERCIUEkVERERERCRCIVFEREREREQiFBJFREREREQkQiFRREREREREImxM9CYRERERERE5U2klUURERERERCIUEkVERERERCRCIVFEREREREQiFBJFREREREQkQiFRREREREREIhQSRUREREREJEIh8USKc+Eyx/nMkbh4cgoyyU5xwfG2NdiOt68DMV8iIiIiInJMrHEFxeFv4Sb0yMTwP3YA0lIKuu59vHzpTF8wnnGjUkmND9B4sIp33niP7RVtOPZwzvvKFOLfeoMXNrdG1zzlGZPIzCvnMCk5uqSN9/60lrea8vnMNVNI3v4mj/+9CiwresfepeTyqaVFjI63cSrf4YnHd9HUn3b6yFg+8uZOYuakDDKSXLTUHWbvxndYt62BYG/HPc6+mqS8Ps9Xz3PvZ+cLq1lfcXRdk5LPpUvGUv/qy6zdeXT5QIr07/A7PP58PcVXzT2mvoqIiIiIDBTHaQMgx+2NLgLgQKDtxK0kmqSRXHD1XM4u9NGyv4J3dlTRmDSCks+eQ+mYOMBFfJIPn+d0XTmyiUv0keg0sXdXJXsir0PUtAJNNXzw7n7e31UfM/DEkjoln1xfA1ufeY2n/7LvmELXsTLGZtT5c7hoThZ29QG2bdzHgfYkJl9QwsIp3f9CdXbcfT2m+ep57qtbovftYONL8uFzR28fDOH+xbv62VcRERERkRPHlZE24q7ojQCWAz5vWvTmfjHGpuCTZzNrWD1lj7/B69sOUbH7IO+/fRD3uLEUFVrs3tTGqJLhWLs/oi5tJFOKcshJCFJzqIUgFoYkCkvz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RERERCRCIVFEREREREQiFBJFREREREQkQiFRREREREREIhQSRUREREREJEIhUURERERERCIUEkVERERERCRCIVFEREREREQiFBJFREREREQkQiFRREREREREIhQSRUREREREJEIhUURERERERCIUEkVERERERCRCIVFEREREREQiFBJFREREREQkQiFRREREREREIgY1JBoDmZ5UrkzN4WtJPmxjonc57Q21MZ5O4+mprwabsQkZfDFtOP+ens3VSYmMtk7uONzuZL6QdurPqYiIiIhIOCSGv7R2fTsuBjdzU3K4OiWBEW4XyZYVvctpb6iN8XQaT099NcaQ48tkkTeOYKCJt9r82J5UrkhOJO0khTNj3MxPTCLH7T6l51REREREhEFdSXTHM90dZHP9IVa3RxcOEUNtjKfTeHrsq4fJPg8E6ni6oZ61zbU829yOx5PAhMH7be+RMYbh8enMdLexp/3khFQRERERkWMxeF+bg808U3uIV9uDA7IyeUoaamM8ncbTY18DbG48xGONLbSGV+28rtCvub/LfieG5U7iokQ3+xvrKT/lJ1VEREREZBBDomWCVBP6kj5Uz7AbamM8ncbTU18tC+oCfg6GA5llJbDQ66a1rYF3nCP7nQjG2JydmEKWv4GX2oK4oncQERERETkFDVpI7OxM+HI81MZ4Oo2np74ay8unUtMYYZp5vqk1srJ4oqT60pjnCbKxuZFDBlwn9vAiIiIiIv1yAkKidSIOcpINtTGeTuPpvq8GD+cnZzCFNv7RcJid5sQmNGP5+GSCD/zN7Le8TPDGM9wGbC9TvXGknKSb6IiIiIiI9Ka779cD7sR+PT85htoYT6fxRPfVGBdzkjOZ7fKztrGajcGoHU4El5eRNsTFpbIoNYtFKelMdFtYnkQuSE5iRPT+IiIiIiKniBMQEi3s6G/xQ85QG+PpNJ6ufTXG5qzkLM6Ns9jf1kiN7eOsOB/TvfGMdZ3A1btAHT+r3s9/VX0Ufh3gDb/BtNXw39W1lEfvLyIiIiJyijgBIfHUvwnKQBhqYzydxtO1r3FM9rqwLZtRCZn8U0oml6RkcmFyBjN6unhxEFjhu6m2h19txqHjvjktxmBOpwkWERERkTOKNa6g2BB+iEDoMimDAVwBSEspiN5fRERERERETlOO0wZAjtsbXQTAgUDbiVlJFBERERERkdND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Ts1gvNVOWV0tOzqdt9nib6XJk8qi1ExKPbCzsZrX/N0HoL62GYtlOWxoqGaz42ZWciaXJycR395CdfiaxIE4xrFoaK1jvd9iTGIaCzxHnjdJuC+bG6pZF3QxPTmTy5NTyaOZFxob+Li7lVYREREREZFuWOMKik3oar/wQwHD1/65AhZpKQXR+58ANimWodFxcLoJNwZItCzaHYdAN+Xdi91mb4wxuCybBAyN0YURx3eMvjIG3BYEjenxsRUWFokx+yoiIiIiImcix+nhTMxOBnUlsX8c6o3pMWhZQLMxxxAQ6bXN3liWhdNr6Dq+Y/SVZUGw44cemF77KiIiIiIi0r1TMCSKiIiIiIjIyaKQKCIiIiIiIhEKiSIiIiIiIhKhkCgiIiIiIiIRCokiIiIiIiISoZAoIiIiIiIiEQqJIiIiIiIiEqGQKCIiIiIiIhEKiSIiIiIiIhKhkCgiIiIiIiIRCokiIiIiIiISoZAoIiIiIiIiETaY6G3dbhIREREREZGhTyuJIiIiIiIiEjH4IdFoYVJERERERKQvTOSfk8caVzDjSD9MqDfGGFxBi7SUgqjdj13QaSeIH2Oc6CIRERERERHpxLJsXHhw2XHRRQPCcdqiNx1lUFcS/U4LAdOmgCgiIiIiItIHxjgETBt+pyW66IQZnJBoIGjacUwgukRERERERER64ZgAQdN+Uk49HZyQaEHQUUAUERERERHpr6ATACt66+AbnJAIGILRm0RERERERKSPTlamGrSQKCIiIiIiIqcfhUQRERERERGJUEgUERERERGRCIVEERERERERiTgqJJ6EO6yKiIiIiIjIKeKokCgiIiIiIiJnLoVEERERERERiVBIFBERERERkQiFRBEREREREYlQSBQREREREZGIUz4kmlHnMvWx/+FTb91LXqruvSoiIiIiIjKYTvmQmP1//o1hO3/CS2ffyt46K7pYREREREREBtApHRKNY+HNSKal/D0CjgKiiIiIiIjIYDulQ6JlG9rqmolLy4guEhERERERkUFwSodEAH99A67kxOjNIiIiIiIiMgiOhMRT8Z4w3mxS8700frA/ukREREREREQGwSm5kmiyL6d00x/59PqHGGeeYsfva6N3ERERERERkUFwSoZE6+AfWFv8T/xp5r/ynv8qir8yKnoXERERERERGQSnZEjsYAUP03yoHU9q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)

Boss also supports **DTCG/Style Dictionary token JSON** and resolves references/inheritance, which makes existing design token pipelines easier to plug in.

On top of this, Boss supports local token theming with the `tokens` prop, so you can scope theme overrides to a subtree. This is also best shown as a **parent override + child inheritance** case:

```jsx
<$$ tokens={{ color: { brand: '#ea580c' }, spacing: { md: 20 } }}>
    <$$ color="brand" padding="md">
        Parent with local token override
    </$$>
    <$$.span color="brand">Child inherits the same scoped token override</$$.span>
</$$>
```

Token strings also support alpha suffixes, for example:

```jsx
<$$ color="gray.600/60" />
```

And for DTCG users, composite token types like `border`, `shadow`, `transition`, `gradient`, and `typography` are normalized into CSS-ready values.

_Read more in the Docs: [Tokens](https://bosscss.com/docs/usage/tokens)._

#### Powerful TypeScript types

Boss generates type-safe CSS props from real CSS definitions, token-aware props, and prepared component types into `.bo$$/index.d.ts`.

You also get:

- Token autocompletion and token value hints
- Prepared component typing/JSDoc metadata
- Native runtime typings (`native.d.ts`) when React Native runtime is enabled

#### Passing styles using spread

Boss supports marker/helper APIs for spread-heavy patterns:

```jsx
const props = $$.$({ color: 'red', hover: { color: 'purple' } })

<$$ {...props} />
```

For plain elements, use `$$.style(...)`:

```jsx
<div {...$$.style({ padding: 12, hover: { color: 'purple' } })} />
```

_Read more in the Docs: [Spreads and markers](https://bosscss.com/docs/usage/spreads-and-markers)._

#### Target children

Boss supports arbitrary nested selectors both in JSX (`child`) and class names (`[ ... ]` syntax).

```jsx
<$$ child={{ '.title': { color: 'blue' }, '&>div': { color: 'red' } }} />
```

```html
<div class="[&_.title]:font-weight:700" />
```

_Read more in the Docs: [Classname usage](https://bosscss.com/docs/usage/classname)._

#### Server components ready

Boss works with modern server-first frameworks (including Next.js patterns). For Next.js you wire runtime with instrumentation hooks and import CSS manually when `css.autoLoad` is disabled (which init does by default for Next).

_Read more in the Docs: [Next.js integration](https://bosscss.com/docs/frameworks/nextjs)._

#### Style boundaries

Boss can split generated CSS by directory using `*.boss.css` boundaries. This lets you load only what you need while shared rules can hoist to common ancestors or global styles.

```text
src/
  app/
    app.boss.css
    page.tsx
    admin/
      admin.boss.css
      page.tsx
.bo$$/styles.css
```

```tsx
// src/app/layout.tsx
import './app.boss.css'
```

Boundary files stay empty in source and are overwritten by Boss on build/watch/postcss runs.

_Read more in the Docs: [CSS boundaries](https://bosscss.com/docs/usage/css-boundaries)._

#### React Native

I've used YouEye in Expo projects, creating cross-device components and I loved it. You can achieve the same with Boss as well.

Boss can generate native runtime output (`.bo$$/native.js`, `.bo$$/native.d.ts`) using the same `$$` API while mapping props to React Native styles/components.

```js
// .bo$$/config.js
import * as native from 'boss-css/native/server'

export default {
    plugins: [native /* ... */],
}
```

```tsx
export default function App() {
    return (
        <$$ padding={12}>
            <$$.Text>Native UI</$$.Text>
        </$$>
    )
}
```

_Read more in the Docs: [React Native usage](https://bosscss.com/docs/usage/react-native)._

#### Use it as a companion to Tailwind

Boss class names do not collide with Tailwind's by default, which means you can use them together. You can use Boss for CSS cases Tailwind doesn't support, or to handle dynamic cases more nicely.

If you want a more Tailwind-like flavor inside Boss itself, there is Bosswind for aliases/booleans on top of the same pipeline.

#### Variants and class composition

Boss includes `$$.cx`, `$$.cv`, `$$.scv`, `$$.sv` (and direct imports) for class/style composition patterns. This makes conditional/variant flows cleaner than hand-rolled class merging.

The `$$` component's `className` also has built-in support for `cx`.

```jsx
<$$ className={{ 'display:none': isHidden }} />
```

_Read more in the Docs: [Class composition and variants](https://bosscss.com/docs/usage/cx)._

#### Gotchas

Boss has its own gotchas as well. _A few important ones:_

- ClassName parsing supports static strings only. Dynamic template interpolation is intentionally skipped.
- In `runtime.only`, className parsing is disabled (runtime only handles props and nested contexts).
- `classname-only` has zero runtime, so no dynamic function values.
- Compile mode currently focuses on JSX and the main extraction strategies.
- ClassName autocomplete in TS is naturally limited because strings are strings. ESLint helps here.

### ESLint plugin

This one already exists now, and I consider it **essential**. Boss can be used in many different ways, thus it can be abused just as much. Linting gives control to your projects to keep everything in line.

_Read more in the Docs: [ESLint plugin](https://bosscss.com/docs/tooling/eslint)._

## Closing notes

### Why "CSS-in-JS" is in quotes

Boss sits in an **in-between space**. Depending on strategy, it can look like classic CSS-in-JS, static extraction, utility-class generation, or runtime-only behavior. That's why I keep putting it in quotes.

### Generated files

Generated files can look messy. Necessary? In my opinion, yes (kinda). They are the practical output of the polymorphic approach, and they keep source authoring clean while letting the pipeline adapt to usage.

### What's next?

Nothing. I'm not intending to work on this project for now. I just wanted to put it out there, and hopefully inspire some people with the ideas behind it. If it gains traction, maybe I'll find a way to work on it more seriously, but for now, it's done. I'm using it myself in a project now, it helps reveal some rough edges and bugs which I might or might not fix.

### Links

- Website: https://bosscss.com
- Repository: https://github.com/wintercounter/boss
- Playground: https://bosscss.com/playground

The playground is WebContainer-powered and runs a full Vite + React project in the browser, with editor, terminal, and preview. It also has ready starter templates and shareable URL state, so you can deep-link a template (`https://bosscss.com/playground#template=boss-bosswind`) or share your exact workspace setup. If you're curious, this is the fastest place to try ideas, push edge cases, and see how Boss behaves before touching your local setup.
