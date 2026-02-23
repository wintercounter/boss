// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import path from 'path'
import fs from 'fs'
import { createRequire } from 'module'
import { themes as prismThemes } from 'prism-react-renderer'

const require = createRequire(import.meta.url)
const rootPackage = require('../package.json')

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) return {}
    const parsed = {}
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)

    for (const rawLine of lines) {
        const line = rawLine.trim()
        if (!line || line.startsWith('#')) continue

        const normalizedLine = line.startsWith('export ') ? line.slice(7).trim() : line
        const separatorIndex = normalizedLine.indexOf('=')
        if (separatorIndex === -1) continue

        const key = normalizedLine.slice(0, separatorIndex).trim()
        if (!key) continue

        let value = normalizedLine.slice(separatorIndex + 1).trim()
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1)
        }
        parsed[key] = value
    }

    return parsed
}

const fileEnv = Object.assign(
    {},
    parseEnvFile(path.resolve(__dirname, '../.env')),
    parseEnvFile(path.resolve(__dirname, '../.env.local')),
    parseEnvFile(path.resolve(__dirname, '.env')),
    parseEnvFile(path.resolve(__dirname, '.env.local')),
)

const readEnv = name => process.env[name]?.trim() || fileEnv[name]?.trim() || ''

const gtagTrackingID = readEnv('DOCUSAURUS_GTAG_TRACKING_ID') || readEnv('DOCUSAURUS_GTAG_ID')

const algoliaAppId = readEnv('DOCUSAURUS_ALGOLIA_APP_ID')
const algoliaApiKey = readEnv('DOCUSAURUS_ALGOLIA_API_KEY')
const algoliaIndexName = readEnv('DOCUSAURUS_ALGOLIA_INDEX_NAME')
const algoliaEnv = [
    ['DOCUSAURUS_ALGOLIA_APP_ID', algoliaAppId],
    ['DOCUSAURUS_ALGOLIA_API_KEY', algoliaApiKey],
    ['DOCUSAURUS_ALGOLIA_INDEX_NAME', algoliaIndexName],
]
const hasAnyAlgoliaEnv = algoliaEnv.some(([, value]) => value)
const hasAllAlgoliaEnv = algoliaEnv.every(([, value]) => value)

if (hasAnyAlgoliaEnv && !hasAllAlgoliaEnv) {
    const missing = algoliaEnv
        .filter(([, value]) => !value)
        .map(([name]) => name)
        .join(', ')
    throw new Error(
        `Partial Algolia config detected. Set all required vars or none: DOCUSAURUS_ALGOLIA_APP_ID, DOCUSAURUS_ALGOLIA_API_KEY, DOCUSAURUS_ALGOLIA_INDEX_NAME. Missing: ${missing}.`,
    )
}

const algoliaConfig = hasAllAlgoliaEnv
    ? {
          appId: algoliaAppId,
          apiKey: algoliaApiKey,
          indexName: algoliaIndexName,
          contextualSearch: true,
      }
    : undefined

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/** @type {import('@docusaurus/types').Config} */
const config = {
    title: 'Boss CSS',
    tagline: 'A polymorphic CSS-in-JS system where you are the BO$$.',
    favicon: 'img/favicon.webp',

    // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
    future: {
        v4: true, // Improve compatibility with the upcoming Docusaurus v4
    },

    // Set the production url of your site here
    url: 'https://bosscss.com',
    // Set the /<baseUrl>/ pathname under which your site is served
    // For GitHub pages deployment, it is often '/<projectName>/'
    baseUrl: '/',

    // GitHub pages deployment config.
    // If you aren't using GitHub pages, you don't need these.
    organizationName: 'boss-css',
    projectName: 'boss',

    onBrokenLinks: 'throw',

    // Even if you don't use internationalization, you can use this field to set
    // useful metadata like html lang. For example, if your site is Chinese, you
    // may want to replace "en" with "zh-Hans".
    i18n: {
        defaultLocale: 'en',
        locales: ['en'],
    },

    presets: [
        [
            'classic',
            /** @type {import('@docusaurus/preset-classic').Options} */
            ({
                docs: {
                    sidebarPath: './sidebars.js',
                    exclude: ['tutorial-basics/**', 'tutorial-extras/**', 'intro.md'],
                },
                blog: false,
                // blog: {
                //     showReadingTime: true,
                //     blogTitle: 'Blog',
                //     blogDescription: 'Boss CSS updates and announcements.',
                // },
                theme: {
                    customCss: './src/css/custom.css',
                },
                ...(gtagTrackingID
                    ? {
                          gtag: {
                              trackingID: gtagTrackingID,
                              anonymizeIP: true,
                          },
                      }
                    : {}),
            }),
        ],
    ],
    plugins: [
        function () {
            return {
                name: 'webpack-alias-plugin',
                configureWebpack() {
                    return {
                        resolve: {
                            alias: {
                                '@': path.resolve(__dirname, 'src'),
                            },
                        },
                    }
                },
            }
        },
        // [
        //     '@docusaurus/plugin-content-blog',
        //     {
        //         id: 'changelog',
        //         routeBasePath: 'changelog',
        //         path: 'changelog',
        //         blogTitle: 'Changelog',
        //         blogDescription: 'Release notes and version updates for Boss CSS.',
        //         showReadingTime: false,
        //     },
        // ],
        function crossOriginIsolatedHeaders() {
            const coepHeaders = {
                'Cross-Origin-Opener-Policy': 'same-origin',
                'Cross-Origin-Embedder-Policy': 'credentialless',
                'Cross-Origin-Resource-Policy': 'cross-origin',
            }

            return {
                name: 'cross-origin-isolated-headers',
                configureWebpack(_config, isServer) {
                    if (isServer) return {}
                    return {
                        devServer: {
                            headers: coepHeaders,
                        },
                    }
                },
            }
        },
    ],

    themeConfig:
        /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
        ({
            // Replace with your project's social card
            image: 'img/docusaurus-social-card.jpg',
            colorMode: {
                defaultMode: 'dark',
                disableSwitch: true,
                respectPrefersColorScheme: false,
            },
            navbar: {
                title: 'Boss CSS',
                logo: {
                    alt: 'Boss CSS Logo',
                    src: 'img/boss-logo.svg',
                },
                items: [
                    {
                        type: 'docSidebar',
                        sidebarId: 'docs',
                        position: 'left',
                        label: 'Docs',
                    },
                    { to: 'pathname:///playground', label: 'Playground', position: 'left' },
                    // { to: '/blog', label: 'Blog', position: 'left' },
                    // { to: '/changelog', label: 'Changelog', position: 'left' },
                    {
                        to: '/docs/getting-started/quick-start',
                        label: 'Get Started',
                        position: 'right',
                        className: 'navbar-cta',
                    },
                ],
            },
            footer: {
                style: 'light',
                links: [
                    {
                        title: 'Docs',
                        items: [
                            {
                                label: 'Quick Start',
                                to: '/docs/getting-started/quick-start',
                            },
                            {
                                label: 'Configuration',
                                to: '/docs/getting-started/configuration',
                            },
                            {
                                label: 'Pipeline',
                                to: '/docs/concepts/pipeline',
                            },
                            {
                                label: 'Runtime strategies',
                                to: '/docs/concepts/runtime-strategy',
                            },
                        ],
                    },
                    {
                        title: 'Build',
                        items: [
                            {
                                label: 'Playground',
                                to: 'pathname:///playground',
                            },
                            {
                                label: 'Inline-first',
                                to: '/docs/concepts/inline-first',
                            },
                            {
                                label: 'Runtime-only',
                                to: '/docs/recipes/runtime-only',
                            },
                            {
                                label: 'Prepared components',
                                to: '/docs/recipes/prepared-components',
                            },
                        ],
                    },
                    {
                        title: 'Resources',
                        items: [
                            // {
                            //     label: 'Blog',
                            //     to: '/blog',
                            // },
                            // {
                            //     label: 'Changelog',
                            //     to: '/changelog',
                            // },
                            {
                                label: 'Token theming',
                                to: '/docs/recipes/token-theming',
                            },
                            {
                                label: 'Custom plugin',
                                to: '/docs/recipes/custom-plugin',
                            },
                            {
                                label: 'GitHub',
                                href: 'https://github.com/wintercounter/boss',
                            },
                        ],
                    },
                ],
                copyright: `boss-css --version ${rootPackage.version} · Copyright © ${new Date().getFullYear()} Boss CSS. MIT Licensed.`,
            },
            prism: {
                theme: prismThemes.github,
                darkTheme: prismThemes.dracula,
                additionalLanguages: ['php'],
            },
            ...(algoliaConfig
                ? {
                      algolia: algoliaConfig,
                  }
                : {}),
            metadata: [{ name: 'keywords', content: 'css-in-js, design-system, css, boss-css, plugins' }],
        }),
    stylesheets: [
        {
            href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap',
            type: 'text/css',
        },
    ],
    clientModules: [
        require.resolve('./src/playground-hard-navigation'),
        require.resolve('./src/gtag-shim'),
        require.resolve('./src/prism-languages'),
    ],
}

export default config
