import { test } from 'vitest'
import { createApi as createServerApi } from '@/api/server'
import { createApi as createBrowserApi } from '@/api/browser'
import type { CompilerOptions } from 'typescript'
import { formatDiagnostics, typecheck } from '@/testing/tsc'
import type { BossApiConfig } from '@/types'

import * as cssServer from '@/prop/css/server'
import * as atServer from '@/prop/at/server'
import * as childServer from '@/prop/child/server'
import * as pseudoServer from '@/prop/pseudo/server'
import * as bosswindServer from '@/prop/bosswind/server'
import * as jsxServer from '@/parser/jsx/server'
import * as classNameServer from '@/parser/classname/server'
import * as inlineFirstServer from '@/strategy/inline-first/server'
import * as classnameFirstServer from '@/strategy/classname-first/server'
import * as classnameOnlyServer from '@/strategy/classname-only/server'
import * as inlineFirstRuntimeOnly from '@/strategy/inline-first/runtime-only'
import * as classnameFirstRuntimeOnly from '@/strategy/classname-first/runtime-only'
import * as classicRuntimeOnly from '@/strategy/classic/runtime-only'
import * as runtimeServer from '@/strategy/runtime/server'
import * as runtimeRuntimeOnly from '@/strategy/runtime/runtime-only'
import * as tokenServer from '@/use/token/server'
import * as tokenBrowser from '@/use/token/browser'
import * as tokenRuntimeOnly from '@/use/token/runtime-only'

import * as atRuntimeOnly from '@/prop/at/runtime-only'
import * as pseudoRuntimeOnly from '@/prop/pseudo/runtime-only'
import * as childRuntimeOnly from '@/prop/child/runtime-only'
import * as bosswindRuntimeOnly from '@/prop/bosswind/runtime-only'

import * as jsxBrowser from '@/parser/jsx/browser'
import * as inlineFirstBrowser from '@/strategy/inline-first/browser'
import * as classnameFirstBrowser from '@/strategy/classname-first/browser'
import * as bosswindBrowser from '@/prop/bosswind/browser'

const defaultConfig = {
    plugins: [],
    content: ['{src,pages,app}/**/*.{html,js,jsx,mjs,cjs,ts,tsx,mdx,md}'],
    globals: true,
};

(globalThis as typeof globalThis & { test: typeof test }).test = test.extend({
    $: async ({}, use) => {
            const buildTypeDts = async (options?: { plugins?: unknown[]; parse?: string }) => {
                const api = await createServerApi(
                    {
                        ...defaultConfig,
                        plugins: options?.plugins ?? [
                        tokenServer,
                        atServer,
                        childServer,
                        cssServer,
                        pseudoServer,
                        classNameServer,
                        jsxServer,
                    ],
                },
                true,
                )

                if (options?.parse) {
                    await api.trigger('onParse', { content: options.parse, preparedOnly: true })
                }

                return { api, dts: api.file.js.dts.text }
            }

        use({
            createBrowserApi(config: Partial<BossApiConfig>) {
                return createBrowserApi(
                    {
                        ...defaultConfig,
                        ...config,
                    },
                    true,
                )
            },
            createServerApi(config: Partial<BossApiConfig>) {
                return createServerApi(
                    {
                        ...defaultConfig,
                        ...config,
                    },
                    true,
                )
            },
            async typeTest(options: {
                files: Record<string, string>
                dts?: string
                parse?: string
                plugins?: unknown[]
                compilerOptions?: CompilerOptions
                moduleStubs?: Record<string, string>
            }) {
                let dtsText = options.dts
                let api

                if (!dtsText) {
                    const result = await buildTypeDts({ plugins: options.plugins, parse: options.parse })
                    dtsText = result.dts
                    api = result.api
                }

                const files = { ...options.files }
                if (!('bo$$.d.ts' in files)) {
                    files['bo$$.d.ts'] = dtsText
                }

                const { diagnostics, cwd } = typecheck({
                    files,
                    compilerOptions: options.compilerOptions,
                    moduleStubs: options.moduleStubs,
                })

                return {
                    api,
                    dts: dtsText,
                    diagnostics,
                    formattedDiagnostics: formatDiagnostics(diagnostics, cwd),
                }
            },
            essentialsServer: [tokenServer, atServer, childServer, cssServer, pseudoServer, classNameServer, jsxServer],
            essentialsBrowser: [tokenBrowser, jsxBrowser],
            parser: {
                jsxServer,
                jsxBrowser,
                classNameServer,
            },
            strategy: {
                inlineFirstServer,
                inlineFirstBrowser,
                classnameFirstServer,
                classnameFirstBrowser,
                classnameOnlyServer,
                inlineFirstRuntimeOnly,
                classnameFirstRuntimeOnly,
                classicRuntimeOnly,
                runtimeServer,
                runtimeRuntimeOnly,
            },
            use: {
                tokenServer,
                tokenBrowser,
                tokenRuntimeOnly,
            },
            prop: {
                cssServer,
                pseudoServer,
                atServer,
                childServer,
                atRuntimeOnly,
                pseudoRuntimeOnly,
                childRuntimeOnly,
                bosswindServer,
                bosswindBrowser,
                bosswindRuntimeOnly,
            },
        })
    },
})
