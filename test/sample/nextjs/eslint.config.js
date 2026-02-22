const { FlatCompat } = require('@eslint/eslintrc')

const compat = new FlatCompat({ baseDirectory: __dirname })

module.exports = (async () => {
    const bossCss = (await import('boss-css/eslint-plugin')).default

    return [
        {
            ignores: ['.bo$$/**', '.bo$$/compiled/**', 'node_modules/**'],
        },
        ...compat.extends('next/core-web-vitals'),
        {
            plugins: {
                '@boss-css/boss-css': bossCss,
            },
            languageOptions: {
                globals: {
                    $$: 'readonly',
                },
            },
            rules: {
                'react/jsx-no-undef': ['error', { allowGlobals: true }],
                '@boss-css/boss-css/format-classnames': 'warn',
                '@boss-css/boss-css/no-unknown-classes': 'error',
                // Choose one of the following if you want to enforce a style:
                // '@boss-css/boss-css/props-only': 'error',
                // '@boss-css/boss-css/classnames-only': 'error',
                // '@boss-css/boss-css/prefer-classnames': 'warn',
            },
        },
    ]
})()
