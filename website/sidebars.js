// @ts-check

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.

 @type {import('@docusaurus/plugin-content-docs').SidebarsConfig}
 */
const sidebars = {
  docs: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quick-start',
        'getting-started/configuration',
      ],
    },
    {
      type: 'category',
      label: 'Frameworks',
      items: [
        'frameworks/nextjs',
        'frameworks/react',
        'frameworks/solid',
        'frameworks/preact',
        'frameworks/qwik',
        'frameworks/stencil',
        'frameworks/no-framework',
        'frameworks/no-js',
      ],
    },
    {
      type: 'category',
      label: 'Overview',
      items: [
        'overview/why-boss',
        'overview/use-cases',
        'overview/polymorphic-css-in-js',
        'overview/compatibility',
        'overview/faq',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/core-concepts',
        'concepts/thinking-in-boss',
        'concepts/tooling-agnostic',
        'concepts/pipeline',
      ],
    },
    {
      type: 'category',
      label: 'Strategies',
      items: [
        'concepts/inline-first',
        'concepts/classname-first',
        'concepts/classname-only',
        'concepts/runtime-strategy',
      ],
    },
    {
      type: 'category',
      label: 'Usage',
      items: [
        'usage/jsx',
        'usage/spreads-and-markers',
        'usage/dollar-proxy',
        'usage/polymorphic-components',
        'usage/classname',
        'usage/bosswind',
        'usage/cx',
        'usage/tokens',
        'usage/theming',
        'usage/pseudo-and-at',
        'usage/prepared-components',
        'usage/css-boundaries',
        'usage/fonts',
        'usage/react-native',
      ],
    },
    {
      type: 'category',
      label: 'Tooling',
      items: [
        'tooling/postcss',
        'tooling/build-watch',
        'tooling/compile',
        'tooling/playground',
        'tooling/eslint',
        'tooling/cli',
        'tooling/devtools',
        'tooling/ai',
        'tooling/debugging',
      ],
    },
    {
      type: 'category',
      label: 'API',
      items: [
        'api/create-api',
        'api/runners',
        'api/plugin-hooks',
        'api/ai-metadata',
        'api/dictionary-and-css',
        'api/generated-runtime',
      ],
    },
    {
      type: 'category',
      label: 'Recipes',
      items: [
        'recipes/custom-plugin',
        'recipes/custom-props',
        'recipes/custom-non-css-props',
        'recipes/responsive-patterns',
        'recipes/interactive-states',
        'recipes/composition-and-variants',
        'recipes/token-theming',
        'recipes/prepared-components',
        'recipes/runtime-only',
        'recipes/classname-only',
        'recipes/css-boundaries-layout',
        'recipes/bosswind-migration',
      ],
    },
  ],
};

export default sidebars;
