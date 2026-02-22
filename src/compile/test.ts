import { describe, expect } from 'vitest'
import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

import { scanPrepared } from '@/compile/prepared'
import type { PreparedDefinition } from '@/compile/jsx'
import { transformSource } from '@/compile/transform'
import { compileProject } from '@/compile'
import { collectBossClassTokensInSource } from '@/compile/classname'
import { createClassNameMapper } from '@/compile/classname-strategy'
import * as cssServer from '@/prop/css/server'
import * as atServer from '@/prop/at/server'
import * as childServer from '@/prop/child/server'
import * as pseudoServer from '@/prop/pseudo/server'
import * as classnameServer from '@/parser/classname/server'
import * as jsxServer from '@/parser/jsx/server'
import * as inlineFirstServer from '@/strategy/inline-first/server'
import * as tokenServer from '@/use/token/server'

describe('compile', () => {
    test('does not write css in prod mode', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-compile-'))
        const srcDir = path.join(root, 'src')
        const boundaryDir = path.join(srcDir, 'routes')
        const boundaryFile = path.join(boundaryDir, 'routes.boss.css')
        const sourceFile = path.join(boundaryDir, 'page.tsx')
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')

        await fs.mkdir(boundaryDir, { recursive: true })
        await fs.writeFile(boundaryFile, 'KEEP', 'utf8')
        await fs.writeFile(sourceFile, 'export const cls = "color:red";', 'utf8')

        await compileProject({
            prod: true,
            config: {
                content: [path.join(root, 'src/**/*.{ts,tsx}')],
                stylesheetPath,
                plugins: [
                    tokenServer,
                    atServer,
                    childServer,
                    cssServer,
                    pseudoServer,
                    classnameServer,
                    jsxServer,
                    inlineFirstServer,
                ],
            },
        })

        const boundaryContents = await fs.readFile(boundaryFile, 'utf8')
        expect(boundaryContents).toBe('KEEP')

        const cssStat = await fs.stat(stylesheetPath).catch(() => null)
        expect(cssStat).toBeNull()
    })

    test('classNameStrategy hashes className output for static strings', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-compile-'))
        const srcDir = path.join(root, 'src')
        const sourceFile = path.join(srcDir, 'app.ts')
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const tempOutDir = path.join(root, '.bo$$', 'compiled')

        await fs.mkdir(srcDir, { recursive: true })
        await fs.writeFile(sourceFile, 'export const cls = "color:red!";', 'utf8')

        const result = await compileProject({
            prod: false,
            config: {
                content: [path.join(root, 'src/**/*.{ts,tsx}')],
                stylesheetPath,
                compile: {
                    tempOutDir,
                    classNameStrategy: 'hash',
                },
                plugins: [
                    tokenServer,
                    atServer,
                    childServer,
                    cssServer,
                    pseudoServer,
                    classnameServer,
                    jsxServer,
                    inlineFirstServer,
                ],
            },
        })

        const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
        const expected = mapper.getOrCreate('color:red!')
        const compiledCssPath = result.stats.stylesheetPath
        expect(compiledCssPath).toBeTruthy()
        if (!compiledCssPath) {
            throw new Error('Expected stylesheetPath to be set.')
        }
        const css = await fs.readFile(compiledCssPath, 'utf8')

        expect(css).toContain(`.${expected}`)
        expect(css).toContain('!important')
        expect(css).not.toContain('color\\:red')
    })

    test('classNameStrategy rewrites non-js text files', async () => {
        const root = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-compile-'))
        const srcDir = path.join(root, 'src')
        const sourceFile = path.join(srcDir, 'template.html')
        const stylesheetPath = path.join(root, '.bo$$', 'styles.css')
        const tempOutDir = path.join(root, '.bo$$', 'compiled')

        await fs.mkdir(srcDir, { recursive: true })
        await fs.writeFile(sourceFile, '<div class=\"color:red\"></div>', 'utf8')

        const result = await compileProject({
            prod: false,
            config: {
                content: [path.join(root, 'src/**/*.html')],
                stylesheetPath,
                compile: {
                    tempOutDir,
                    classNameStrategy: 'hash',
                },
                plugins: [
                    tokenServer,
                    atServer,
                    childServer,
                    cssServer,
                    pseudoServer,
                    classnameServer,
                    jsxServer,
                    inlineFirstServer,
                ],
            },
        })

        const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
        const expected = mapper.getOrCreate('color:red')
        const compiledHtmlPath = path.join(tempOutDir, path.relative(process.cwd(), sourceFile))
        const html = await fs.readFile(compiledHtmlPath, 'utf8')
        const compiledStylesheetPath = result.stats.stylesheetPath
        if (!compiledStylesheetPath) {
            throw new Error('Expected stylesheetPath to be set.')
        }
        const css = await fs.readFile(compiledStylesheetPath, 'utf8')

        expect(html).toBe(`<div class=\"${expected}\"></div>`)
        expect(css).toContain(`.${expected}`)
    })

    describe('transform', () => {
        const createApi = async ($: any, config: Record<string, unknown> = {}) => {
            return $.createServerApi({
                plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                ...config,
            })
        }

        const createClassnameFirstApi = async ($: any, config: Record<string, unknown> = {}) => {
            return $.createServerApi({
                plugins: [...$.essentialsServer, $.strategy.classnameFirstServer],
                ...config,
            })
        }

        type PreparedState = {
            preparedGlobal?: Map<string, PreparedDefinition>
            preparedLocal?: Map<string, PreparedDefinition>
            preparedRuntime?: Set<string>
        }

        const runTransform = async (
            $: any,
            source: string,
            compile: Record<string, unknown> = {},
            config: Record<string, unknown> = {},
            prepared: PreparedState = {},
        ) => {
            const api = await createApi($, config)
            return transformSource(source, {
                api,
                compile: { spread: true, ...compile },
                filename: 'demo.tsx',
                preparedGlobal: prepared.preparedGlobal,
                preparedLocal: prepared.preparedLocal,
                preparedRuntime: prepared.preparedRuntime,
            })
        }

        const runClassnameFirstTransform = async (
            $: any,
            source: string,
            compile: Record<string, unknown> = {},
            config: Record<string, unknown> = {},
            prepared: PreparedState = {},
        ) => {
            const api = await createClassnameFirstApi($, config)
            return transformSource(source, {
                api,
                compile: { spread: true, ...compile },
                filename: 'demo.tsx',
                preparedGlobal: prepared.preparedGlobal,
                preparedLocal: prepared.preparedLocal,
                preparedRuntime: prepared.preparedRuntime,
            })
        }

        const prepareClassNameStrategy = async (
            $: any,
            source: string,
            {
                filename = 'demo.tsx',
                strategy = 'hash',
                config = {},
            }: { filename?: string; strategy?: 'hash' | 'shortest' | 'unicode'; config?: Record<string, unknown> } = {},
        ) => {
            const api = await createApi($, config)
            const mapper = createClassNameMapper({ strategy, prefix: api.selectorPrefix ?? '' })
            const baseContextToClassName = api.contextToClassName
            api.contextToClassName = (
                name: string,
                value: unknown,
                contexts: string[],
                escape = true,
                _prefix = '',
            ) => {
                const raw = baseContextToClassName(name, value, contexts, false, '')
                const mapped = mapper.getOrCreate(raw)
                if (!escape) return mapped
                return api.camelCaseToDash(api.escapeClassName(mapped))
            }
            const baseClassTokenToSelector = api.classTokenToSelector
            api.classTokenToSelector = (token: string) => baseClassTokenToSelector(mapper.getOrCreate(token))

            const tokens = collectBossClassTokensInSource(source, { filename, api })
            tokens.forEach(token => mapper.getOrCreate(token))

            return { api, mapper }
        }

        const runTransformWithStrategy = async (
            $: any,
            source: string,
            {
                filename = 'demo.tsx',
                strategy = 'hash',
                config = {},
                compile = {},
            }: {
                filename?: string
                strategy?: 'hash' | 'shortest' | 'unicode'
                config?: Record<string, unknown>
                compile?: Record<string, unknown>
            } = {},
        ) => {
            const { api, mapper } = await prepareClassNameStrategy($, source, { filename, strategy, config })
            const result = await transformSource(source, {
                api,
                compile: { spread: true, ...compile },
                filename,
                preparedGlobal: undefined,
                preparedLocal: undefined,
                preparedRuntime: undefined,
                classNameMapper: mapper,
            })
            return { result, mapper }
        }

        const createPreparedGlobal = (source: string) => {
            const scan = scanPrepared(source, { isTs: true, isJsx: true })
            const preparedGlobal = new Map()
            for (const definition of scan.definitions) {
                if (!definition.inlineable) continue
                preparedGlobal.set(definition.name, definition.definition)
            }
            return preparedGlobal
        }

        test('unwraps $$.$({}) marker into the raw object', async ({ $ }) => {
            const result = await runTransform(
                $,
                `const props = $$.$({ color: 1 }); export const Example = () => <div {...props} />`,
            )

            expect(result.code.trim()).toBe(`const props = {
    color: 1
};
export const Example = ()=><div {...props}/>;`)
        })

        test('rewrites $$.$ string into className string', async ({ $ }) => {
            const result = await runTransform(
                $,
                `const props = $$.$("display:flex"); export const Example = () => <div {...props} />`,
            )

            expect(result.code.trim()).toBe(`const props = "display:flex";
export const Example = ()=><div {...props}/>;`)
        })

        test('rewrites token className strings', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <div className="color:$$.token.color.white" />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="color:white"/>;`)
        })

        test('rewrites token className in grouped selectors', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <div className="hover:{color:$$.token.color.white}" />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="hover:{color:white}"/>;`)
        })

        test('expands grouped className selectors with multiple entries', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <div className="hover:{text-decoration:underline;color:red}" />`,
            )

            expect(result.code.trim()).toBe(
                `export const Example = ()=><div className="hover:color:red hover:text-decoration:underline"/>;`,
            )
        })

        test('rewrites token className in $$.$ call strings', async ({ $ }) => {
            const result = await runTransform(
                $,
                `const props = $$.$("color:$$.token.color.white"); export const Example = () => <div {...props} />`,
            )

            expect(result.code.trim()).toBe(`const props = "color:white";
export const Example = ()=><div {...props}/>;`)
        })

        test('expands grouped className selectors in $$.$ call strings', async ({ $ }) => {
            const result = await runTransform(
                $,
                `const props = $$.$("hover:{text-decoration:underline;color:red}"); export const Example = () => <div {...props} />`,
            )

            expect(result.code.trim()).toBe(`const props = "hover:color:red hover:text-decoration:underline";
export const Example = ()=><div {...props}/>;`)
        })

        test('converts $$ to div with inline CSS props', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ color="red" padding={8} />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        color: "red",
        padding: "8px"
    }}/>;`)
        })

        test('converts $$ member to DOM tag', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$.section />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><section/>;`)
        })

        test('respects static as attribute', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ as="button" />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><button/>;`)
        })

        test('converts dynamic as into an IIFE component', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ as={tag} />`)

            expect(result.code.trim()).toBe(`export const Example = ()=>function() {
        const __BossCmp = tag;
        return <__BossCmp/>;
    }();`)
        })

        test('converts $$ with spread when compile.spread is true', async ({ $ }) => {
            const result = await runTransform(
                $,
                `const props = $$.$({ color: 1 }); export const Example = () => <$$ {...props} />`,
            )

            expect(result.code.trim()).toBe(`const props = {
    color: 1
};
export const Example = ()=><div {...props}/>;`)
        })

        test('preserves non-css attributes on $$ elements', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ href="link" />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><div href="link"/>;`)
        })

        test('compile hooks can rewrite non-css props', async ({ $ }) => {
            const compilePropPlugin = {
                name: 'compile-prop',
                onCompileProp: (_api: unknown, payload: any) => {
                    if (payload.name !== 'tooltip') return
                    payload.output['data-tooltip'] = payload.prop
                },
            }
            const result = await runTransform(
                $,
                `export const Example = () => <$$ tooltip="Hello" />`,
                {},
                {
                    plugins: [...$.essentialsServer, $.strategy.inlineFirstServer, compilePropPlugin],
                },
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div data-tooltip="Hello"/>;`)
        })

        test('keeps $$ with spread when compile.spread is false', async ({ $ }) => {
            const result = await runTransform(
                $,
                `const props = $$.$({ color: 1 }); export const Example = () => <$$ {...props} />`,
                { spread: false },
            )

            expect(result.code.trim()).toBe(`const props = {
    color: 1
};
export const Example = ()=><$$ {...props}/>;`)
        })

        test('merges className and style objects', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ className="card" style={{ display: "block" }} hover={{ color: "red" }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="card hover:color" style={{
        display: "block",
        "--hover-color": "red"
    }}/>;`)
        })

        test('merges class prop for solid', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ class="card" hover={{ color: "red" }} />`,
                {},
                { framework: { name: 'solid' } },
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div class="card hover:color" style={{
        "--hover-color": "red"
    }}/>;`)
        })

        test('keeps root css props inline when deep contexts exist', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ color="blue" hover={{ color: "red" }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="hover:color" style={{
        color: "blue",
        "--hover-color": "red"
    }}/>;`)
        })

        test('merges className expression', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ className={cls} hover={{ color: "red" }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className={cls + " hover:color"} style={{
        "--hover-color": "red"
    }}/>;`)
        })

        test('merges style expression using Object.assign', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ style={styles} hover={{ color: "red" }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="hover:color" style={Object.assign({
        "--hover-color": "red"
    }, styles)}/>;`)
        })

        test('emits pseudo class with CSS variable', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ hover={{ color: "red" }} />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="hover:color" style={{
        "--hover-color": "red"
    }}/>;`)
        })

        test('emits multi pseudo chain', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ hover={{ focus: { color: "red" } }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="hover:focus:color" style={{
        "--hover-focus-color": "red"
    }}/>;`)
        })

        test('emits at media query output', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ at={{ dark: { fontStyle: "italic" } }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="at:dark:font-style" style={{
        "--at-dark-font-style": "italic"
    }}/>;`)
        })

        test('converts static tokens to CSS variables', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ color="white" />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        color: "var(--color-white)"
    }}/>;`)
        })

        test('converts token member expressions', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ color={$$.token.color.white} />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        color: "var(--color-white)"
    }}/>;`)
        })

        test('rewrites token member expressions outside JSX', async ({ $ }) => {
            const result = await runTransform($, `const color = $$.token.color.white`)

            expect(result.code.trim()).toBe(`const color = "var(--color-white)";`)
        })

        test('compiles static tokens prop to CSS variables', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$ tokens={{ color: { primary: "#fff" }, size: { sm: 8 } }} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        "--color-primary": "#fff",
        "--size-sm": "8px"
    }}/>;`)
        })

        test('compiles dynamic tokens prop with helper', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ tokens={theme} />`)

            expect(result.code.trim()).toBe(`import { createBossTokenVars } from "boss-css/compile/runtime";
const __bossTokenVars = createBossTokenVars("px", "");
export const Example = ()=><div style={__bossTokenVars(theme)}/>;`)
        })

        test('adds __bossValue helper using configured unit', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ padding={pad} />`, {}, { unit: 'rem' })

            expect(result.code.trim()).toBe(`import { createBossValue } from "boss-css/compile/runtime";
const __bossValue = createBossValue("rem");
export const Example = ()=><div style={{
        padding: __bossValue(pad)
    }}/>;`)
        })

        test('inlines static array values', async ({ $ }) => {
            const result = await runTransform($, `export const Example = () => <$$ margin={[20, 0, 10, 5]} />`)

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        margin: "20px 0 10px 5px"
    }}/>;`)
        })

        test('compiles prepared components with $$.$ assignment', async ({ $ }) => {
            const result = await runTransform(
                $,
                `$$.PreparedUppercaseA = $$.$({ color: "red", hover: { color: "blue" } }); export const Example = () => <$$.PreparedUppercaseA fontWeight="bold" />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div className="hover:color" style={{
        color: "red",
        "--hover-color": "blue",
        fontWeight: "bold"
    }}/>;`)
        })

        test('compiles prepared components from global registry', async ({ $ }) => {
            const preparedGlobal = createPreparedGlobal(`$$.PreparedGlobal = $$.$({ padding: 8 })`)
            const result = await runTransform(
                $,
                `export const Example = () => <$$.PreparedGlobal />`,
                {},
                {},
                { preparedGlobal },
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        padding: "8px"
    }}/>;`)
        })

        test('keeps unresolved prepared components intact', async ({ $ }) => {
            const result = await runTransform(
                $,
                `export const Example = () => <$$.PreparedMissing color="red" />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><$$.PreparedMissing color="red"/>;`)
        })

        test('keeps prepared assignment when runtime is required', async ({ $ }) => {
            const result = await runTransform(
                $,
                `$$.PreparedKeep = $$.$({ padding: 8 }); export const Example = () => <$$.PreparedKeep />`,
                {},
                {},
                { preparedRuntime: new Set(['PreparedKeep']) },
            )

            expect(result.code.trim()).toBe(`$$.PreparedKeep = $$.$({
    padding: 8
});
export const Example = ()=><div style={{
        padding: "8px"
    }}/>;`)
        })

        test('prunes boss imports when runtime is not needed', async ({ $ }) => {
            const result = await runTransform(
                $,
                `import "boss-css"; export const Example = () => <$$ color="red" />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        color: "red"
    }}/>;`)
        })

        test('prunes boss imports for token member expressions', async ({ $ }) => {
            const result = await runTransform(
                $,
                `import "@/.bo$$/server"; export const Example = () => <$$ color={$$.token.color.white} />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        color: "var(--color-white)"
    }}/>;`)
        })

        test('prunes boss imports for dynamic as', async ({ $ }) => {
            const result = await runTransform($, `import "boss-css"; export const Example = () => <$$ as={tag} />`)

            expect(result.code.trim()).toBe(`export const Example = ()=>function() {
        const __BossCmp = tag;
        return <__BossCmp/>;
    }();`)
        })

        test('prunes boss imports for prepared components', async ({ $ }) => {
            const result = await runTransform(
                $,
                `import "boss-css"; $$.PreparedUppercaseA = $$.$({ color: "red" }); export const Example = () => <$$.PreparedUppercaseA />`,
            )

            expect(result.code.trim()).toBe(`export const Example = ()=><div style={{
        color: "red"
    }}/>;`)
        })

        test('prunes boss imports for $$.$ className calls', async ({ $ }) => {
            const result = await runTransform(
                $,
                `import "boss-css"; const props = $$.$(cls); export const Example = () => <div {...props} />`,
            )

            expect(result.code.trim()).toBe(`const props = cls;
export const Example = ()=><div {...props}/>;`)
        })

        describe('classNameStrategy', () => {
            const staticCases: Array<[string, string]> = [
                ['demo.ts', `export const cls = "color:red";`],
                ['demo.tsx', `export const Example = () => <div className="color:red" />`],
                ['demo.jsx', `export const Example = () => <div className="color:red" />`],
                ['demo.js', `export const cls = "color:red";`],
                ['demo.mjs', `export const cls = "color:red";`],
                ['demo.cjs', `exports.cls = "color:red";`],
            ]

            for (const [filename, source] of staticCases) {
                test(`rewrites static className strings (${filename})`, async ({ $ }) => {
                    const { result, mapper } = await runTransformWithStrategy($, source, {
                        filename,
                        strategy: 'hash',
                    })
                    const mapped = mapper.get('color:red')

                    expect(mapped).toBeTruthy()
                    expect(result.code).toContain(mapped)
                    expect(result.code).not.toContain('color:red')
                })
            }

            test('rewrites ternary string literals', async ({ $ }) => {
                const source = `const className = isFoo ? "display:hidden" : "display:flex";`
                const { result, mapper } = await runTransformWithStrategy($, source, { filename: 'demo.ts' })
                const hidden = mapper.get('display:hidden')
                const flex = mapper.get('display:flex')

                expect(hidden).toBeTruthy()
                expect(flex).toBeTruthy()
                expect(result.code).toContain(hidden)
                expect(result.code).toContain(flex)
            })

            test('leaves single-word tokens untouched', async ({ $ }) => {
                const source = `export const cls = "block";`
                const { result, mapper } = await runTransformWithStrategy($, source, { filename: 'demo.ts' })

                expect(mapper.get('block')).toBeUndefined()
                expect(result.code).toContain('"block"')
            })

            test('expands grouped selectors and rewrites', async ({ $ }) => {
                const source = `export const cls = "hover:{color:red}";`
                const { result, mapper } = await runTransformWithStrategy($, source, { filename: 'demo.ts' })
                const mapped = mapper.get('hover:color:red')

                expect(mapped).toBeTruthy()
                expect(result.code).toContain(mapped)
                expect(result.code).not.toContain('{')
            })

            test('does not rewrite module specifiers', async ({ $ }) => {
                const source = `import styles from "color:red"; export const cls = "color:red";`
                const { result, mapper } = await runTransformWithStrategy($, source, { filename: 'demo.ts' })
                const mapped = mapper.get('color:red')

                expect(mapped).toBeTruthy()
                expect(result.code).toContain(`from "color:red"`)
                expect(result.code).toContain(mapped)
            })

            test('keeps non-boss classes intact', async ({ $ }) => {
                const source = `export const cls = "hover:bg-gray-100 color:red";`
                const { result, mapper } = await runTransformWithStrategy($, source, { filename: 'demo.ts' })
                const mapped = mapper.get('color:red')

                expect(mapped).toBeTruthy()
                expect(result.code).toContain('hover:bg-gray-100')
                expect(result.code).toContain(mapped)
            })

            test('maps $$ prop classNames via strategy', async ({ $ }) => {
                const source = `export const Example = () => <$$ hover={{ color: "red" }} />;`
                const { result, mapper } = await runTransformWithStrategy($, source, { filename: 'demo.tsx' })
                const mapped = mapper.get('hover:color')

                expect(mapped).toBeTruthy()
                expect(result.code).toContain(`className=\"${mapped}\"`)
            })
        })

        describe('classname-first', () => {
            test('emits classNames for static props', async ({ $ }) => {
                const result = await runClassnameFirstTransform(
                    $,
                    `export const Example = () => <$$ color="red" padding={8} />`,
                )

                expect(result.code.trim()).toBe(`export const Example = ()=><div className="color:red padding:8"/>;`)
            })

            test('uses CSS variables for dynamic functions', async ({ $ }) => {
                const result = await runClassnameFirstTransform(
                    $,
                    `export const Example = () => <$$ padding={() => pad} />`,
                )

                expect(result.code.trim()).toBe(`import { createBossValue } from "boss-css/compile/runtime";
const __bossValue = createBossValue("px");
export const Example = ()=><div className="padding" style={{
        "--padding": __bossValue((()=>pad)())
    }}/>;`)
            })

            test('skips dynamic non-function props', async ({ $ }) => {
                const result = await runClassnameFirstTransform(
                    $,
                    `export const Example = () => <$$ padding={pad} />`,
                )

                expect(result.code.trim()).toBe(`export const Example = ()=><div/>;`)
            })

            test('keeps token selector values in className', async ({ $ }) => {
                const result = await runClassnameFirstTransform(
                    $,
                    `export const Example = () => <$$ color="white" />`,
                )

                expect(result.code.trim()).toBe(`export const Example = ()=><div className="color:white"/>;`)
            })
        })
    })
})
