import { describe, expect } from 'vitest'

import { bosswindProps } from './shared'

const createServerApi = async ($: any) =>
    $.createServerApi({
        plugins: [
            $.prop.bosswindServer,
            $.use.tokenServer,
            $.prop.atServer,
            $.prop.childServer,
            $.prop.cssServer,
            $.prop.pseudoServer,
            $.parser.classNameServer,
            $.strategy.inlineFirstServer,
        ],
    })

const getClassName = (api: any, name: string, value: unknown, contexts: string[] = []) => {
    return api.contextToClassName(name, value, contexts, true, api.selectorPrefix)
}

describe('bosswind', () => {
    describe('server', () => {
        test('display and position keywords map to CSS props', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="block">`,
            })
            await api.trigger('onParse', {
                content: `<div className="inlineFlex">`,
            })
            await api.trigger('onParse', {
                content: `<div className="inline-flex">`,
            })
            await api.trigger('onParse', {
                content: `<div className="absolute">`,
            })
            await api.trigger('onParse', {
                content: `<div className="flow-root">`,
            })
            await api.trigger('onParse', {
                content: `<div className="flex-row">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.block { display: block }')
            expect(css).toContain('.inline-flex { display: inline-flex }')
            expect(css).toContain('.absolute { position: absolute }')
            expect(css).toContain('.flow-root { display: flow-root }')
            expect(css).toContain('.flex-row { flex-direction: row }')
        })

        test('single keyword supports important suffix', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="block!">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain(`.block\\! { display: block !important }`)
        })

        test('flex/grid keyword vs value', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="flex">`,
            })
            await api.trigger('onParse', {
                content: `<div className="grid">`,
            })
            await api.trigger('onParse', {
                content: `<div className="flex:1 grid:1fr">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.flex { display: flex }')
            expect(css).toContain('.grid { display: grid }')
            expect(css).toContain('.flex\\:1 { flex: 1 }')
            expect(css).toContain('.grid\\:1fr { grid: 1fr }')
        })

        test('spacing alias uses tokens', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="p:4">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.p\\:4 { padding: var(--size-4) }')
            expect(css).toContain('--size-4: 12px;')
        })

        test('spacing aliases expand to multiple props', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="px:4 py:2 insetX:3 insetY:1 gap-x:4">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.px\\:4 { padding-left: var(--size-4) }')
            expect(css).toContain('.px\\:4 { padding-right: var(--size-4) }')
            expect(css).toContain('.py\\:2 { padding-top: var(--size-2) }')
            expect(css).toContain('.py\\:2 { padding-bottom: var(--size-2) }')
            expect(css).toContain('.inset-x\\:3 { left: var(--size-3) }')
            expect(css).toContain('.inset-x\\:3 { right: var(--size-3) }')
            expect(css).toContain('.inset-y\\:1 { top: var(--size-1) }')
            expect(css).toContain('.inset-y\\:1 { bottom: var(--size-1) }')
            expect(css).toContain('.gap-x\\:4 { column-gap: var(--size-4) }')
        })

        test('text alias resolves font size and color tokens', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="text:sm">`,
            })
            await api.trigger('onParse', {
                content: `<div className="text:gray-500">`,
            })
            await api.trigger('onParse', {
                content: `<div className="text:14">`,
            })
            await api.trigger('onParse', {
                content: `<div className="text:var(--accent)">`,
            })

            const css = api.css.text.trim()
            const varTextClass = getClassName(api, 'text', 'var(--accent)')
            expect(css).toContain('.text\\:sm { font-size: var(--fontSize-sm) }')
            expect(css).toContain('--fontSize-sm: 10.5px;')
            expect(css).toContain('.text\\:gray-500 { color: var(--color-gray-500) }')
            expect(css).toContain('--color-gray-500:')
            expect(css).toContain('.text\\:14 { font-size: 14px }')
            expect(css).toContain(`.${varTextClass} { color: var(--accent) }`)
        })

        test('bg alias uses color tokens', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="bg:gray-500">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.bg\\:gray-500 { background-color: var(--color-gray-500) }')
            expect(css).toContain('--color-gray-500:')
        })

        test('color token alpha uses color-mix', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="text:gray.600/60 bg:gray.600/60 border:gray.600/60">`,
            })

            const css = api.css.text.trim()
            const textClass = getClassName(api, 'text', 'gray.600/60')
            const bgClass = getClassName(api, 'bg', 'gray.600/60')
            const borderClass = getClassName(api, 'border', 'gray.600/60')

            expect(css).toContain(
                `.${textClass} { color: color-mix(in oklab, var(--color-gray-600) 60%, transparent) }`,
            )
            expect(css).toContain(
                `.${bgClass} { background-color: color-mix(in oklab, var(--color-gray-600) 60%, transparent) }`,
            )
            expect(css).toContain(
                `.${borderClass} { border-color: color-mix(in oklab, var(--color-gray-600) 60%, transparent) }`,
            )
        })

        test('border alias resolves width, color, and full values', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="border">`,
            })
            await api.trigger('onParse', {
                content: `<div className="border:2">`,
            })
            await api.trigger('onParse', {
                content: `<div className="border:red-500">`,
            })
            await api.trigger('onParse', {
                content: `<div className="border:1px_solid_red">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.border { border-width: 1px }')
            expect(css).toContain('.border\\:2 { border-width: 2px }')
            expect(css).toContain('.border\\:red-500 { border-color: var(--color-red-500) }')
            expect(css).toContain('.border\\:1px_solid_red { border: 1px solid red }')
        })

        test('grow and shrink defaults apply', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="grow shrink:0">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.grow { flex-grow: 1 }')
            expect(css).toContain('.shrink\\:0 { flex-shrink: 0 }')
        })

        test('rounded and shadow defaults apply', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="rounded shadow">`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('border-radius: 3px')
            expect(css).toContain('box-shadow: 0 1px 3px 0')
        })

        test('translate/scale/skew axis aliases combine', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="translateX:4 translateY:6 scaleX:2 skewX:12deg skewY:6deg">`,
            })

            const css = api.css.text.trim()
            const transformClass = getClassName(api, 'skewX', '12deg')
            expect(css).toContain('.translate-x\\:4 { translate: 4px 6px }')
            expect(css).toContain('.scale-x\\:2 { scale: 2 1 }')
            expect(css).toContain(`.${transformClass} { transform: skewX(12deg) skewY(6deg) }`)
        })

        test('bosswind props map to CSS props (exhaustive)', async ({ $ }) => {
            const api = await createServerApi($)

            const cases = [
                { name: 'p', input: 'p:4', outputs: [{ prop: 'padding', value: '4' }] },
                {
                    name: 'px',
                    input: 'px:4',
                    outputs: [
                        { prop: 'paddingLeft', value: '4' },
                        { prop: 'paddingRight', value: '4' },
                    ],
                },
                {
                    name: 'py',
                    input: 'py:4',
                    outputs: [
                        { prop: 'paddingTop', value: '4' },
                        { prop: 'paddingBottom', value: '4' },
                    ],
                },
                { name: 'pt', input: 'pt:4', outputs: [{ prop: 'paddingTop', value: '4' }] },
                { name: 'pr', input: 'pr:4', outputs: [{ prop: 'paddingRight', value: '4' }] },
                { name: 'pb', input: 'pb:4', outputs: [{ prop: 'paddingBottom', value: '4' }] },
                { name: 'pl', input: 'pl:4', outputs: [{ prop: 'paddingLeft', value: '4' }] },
                { name: 'm', input: 'm:4', outputs: [{ prop: 'margin', value: '4' }] },
                {
                    name: 'mx',
                    input: 'mx:4',
                    outputs: [
                        { prop: 'marginLeft', value: '4' },
                        { prop: 'marginRight', value: '4' },
                    ],
                },
                {
                    name: 'my',
                    input: 'my:4',
                    outputs: [
                        { prop: 'marginTop', value: '4' },
                        { prop: 'marginBottom', value: '4' },
                    ],
                },
                { name: 'mt', input: 'mt:4', outputs: [{ prop: 'marginTop', value: '4' }] },
                { name: 'mr', input: 'mr:4', outputs: [{ prop: 'marginRight', value: '4' }] },
                { name: 'mb', input: 'mb:4', outputs: [{ prop: 'marginBottom', value: '4' }] },
                { name: 'ml', input: 'ml:4', outputs: [{ prop: 'marginLeft', value: '4' }] },
                { name: 'gapX', input: 'gapX:4', outputs: [{ prop: 'columnGap', value: '4' }] },
                { name: 'gapY', input: 'gapY:4', outputs: [{ prop: 'rowGap', value: '4' }] },
                { name: 'w', input: 'w:4', outputs: [{ prop: 'width', value: '4' }] },
                { name: 'h', input: 'h:4', outputs: [{ prop: 'height', value: '4' }] },
                { name: 'minW', input: 'minW:10px', outputs: [{ prop: 'minWidth', value: '10px' }] },
                { name: 'minH', input: 'minH:10px', outputs: [{ prop: 'minHeight', value: '10px' }] },
                { name: 'maxW', input: 'maxW:10px', outputs: [{ prop: 'maxWidth', value: '10px' }] },
                { name: 'maxH', input: 'maxH:10px', outputs: [{ prop: 'maxHeight', value: '10px' }] },
                {
                    name: 'inset',
                    input: 'inset:4',
                    outputs: [
                        { prop: 'top', value: '4' },
                        { prop: 'right', value: '4' },
                        { prop: 'bottom', value: '4' },
                        { prop: 'left', value: '4' },
                    ],
                },
                {
                    name: 'insetX',
                    input: 'insetX:4',
                    outputs: [
                        { prop: 'left', value: '4' },
                        { prop: 'right', value: '4' },
                    ],
                },
                {
                    name: 'insetY',
                    input: 'insetY:4',
                    outputs: [
                        { prop: 'top', value: '4' },
                        { prop: 'bottom', value: '4' },
                    ],
                },
                { name: 'grow', input: 'grow', outputs: [{ prop: 'flexGrow', value: 1 }] },
                { name: 'shrink', input: 'shrink', outputs: [{ prop: 'flexShrink', value: 1 }] },
                { name: 'basis', input: 'basis:10px', outputs: [{ prop: 'flexBasis', value: '10px' }] },
                { name: 'items', input: 'items:center', outputs: [{ prop: 'alignItems', value: 'center' }] },
                { name: 'justify', input: 'justify:center', outputs: [{ prop: 'justifyContent', value: 'center' }] },
                { name: 'self', input: 'self:center', outputs: [{ prop: 'alignSelf', value: 'center' }] },
                { name: 'leading', input: 'leading:1.5', outputs: [{ prop: 'lineHeight', value: '1.5' }] },
                { name: 'tracking', input: 'tracking:0.1em', outputs: [{ prop: 'letterSpacing', value: '0.1em' }] },
                { name: 'rounded', input: 'rounded:lg', outputs: [{ prop: 'borderRadius', value: 'lg' }] },
                { name: 'shadow', input: 'shadow:sm', outputs: [{ prop: 'boxShadow', value: 'sm' }] },
                { name: 'z', input: 'z:10', outputs: [{ prop: 'zIndex', value: '10' }] },
                { name: 'aspect', input: 'aspect:1', outputs: [{ prop: 'aspectRatio', value: '1' }] },
                { name: 'text', input: 'text:sm', outputs: [{ prop: 'fontSize', value: 'sm' }] },
                { name: 'bg', input: 'bg:transparent', outputs: [{ prop: 'backgroundColor', value: 'transparent' }] },
                { name: 'border', input: 'border:2', outputs: [{ prop: 'borderWidth', value: '2' }] },
                { name: 'block', input: 'block', outputs: [{ prop: 'display', value: 'block' }] },
                { name: 'inline', input: 'inline', outputs: [{ prop: 'display', value: 'inline' }] },
                { name: 'inlineBlock', input: 'inlineBlock', outputs: [{ prop: 'display', value: 'inline-block' }] },
                { name: 'inlineFlex', input: 'inlineFlex', outputs: [{ prop: 'display', value: 'inline-flex' }] },
                { name: 'inlineGrid', input: 'inlineGrid', outputs: [{ prop: 'display', value: 'inline-grid' }] },
                { name: 'contents', input: 'contents', outputs: [{ prop: 'display', value: 'contents' }] },
                { name: 'flowRoot', input: 'flowRoot', outputs: [{ prop: 'display', value: 'flow-root' }] },
                { name: 'table', input: 'table', outputs: [{ prop: 'display', value: 'table' }] },
                { name: 'inlineTable', input: 'inlineTable', outputs: [{ prop: 'display', value: 'inline-table' }] },
                { name: 'tableRow', input: 'tableRow', outputs: [{ prop: 'display', value: 'table-row' }] },
                { name: 'tableCell', input: 'tableCell', outputs: [{ prop: 'display', value: 'table-cell' }] },
                { name: 'static', input: 'static', outputs: [{ prop: 'position', value: 'static' }] },
                { name: 'relative', input: 'relative', outputs: [{ prop: 'position', value: 'relative' }] },
                { name: 'absolute', input: 'absolute', outputs: [{ prop: 'position', value: 'absolute' }] },
                { name: 'fixed', input: 'fixed', outputs: [{ prop: 'position', value: 'fixed' }] },
                { name: 'sticky', input: 'sticky', outputs: [{ prop: 'position', value: 'sticky' }] },
                { name: 'flexRow', input: 'flexRow', outputs: [{ prop: 'flexDirection', value: 'row' }] },
                { name: 'flexCol', input: 'flexCol', outputs: [{ prop: 'flexDirection', value: 'column' }] },
                { name: 'flexWrap', input: 'flexWrap', outputs: [{ prop: 'flexWrap', value: 'wrap' }] },
                { name: 'flexNoWrap', input: 'flexNoWrap', outputs: [{ prop: 'flexWrap', value: 'nowrap' }] },
                { name: 'translateX', input: 'translateX:4', outputs: [{ prop: 'translate', value: ['4', 0] }] },
                { name: 'translateY', input: 'translateY:4', outputs: [{ prop: 'translate', value: [0, '4'] }] },
                { name: 'scaleX', input: 'scaleX:2', outputs: [{ prop: 'scale', value: ['2', 1] }] },
                { name: 'scaleY', input: 'scaleY:2', outputs: [{ prop: 'scale', value: [1, '2'] }] },
                { name: 'skewX', input: 'skewX:12deg', outputs: [{ prop: 'transform', value: 'skewX(12deg)' }] },
                { name: 'skewY', input: 'skewY:12deg', outputs: [{ prop: 'transform', value: 'skewY(12deg)' }] },
            ]

            for (const entry of cases) {
                await api.trigger('onParse', {
                    content: `<div className="${entry.input}">`,
                })
            }

            const css = api.css.text.trim()
            const covered = new Set(cases.map(entry => entry.name))

            for (const entry of cases) {
                for (const output of entry.outputs) {
                    const descriptor = api.dictionary.get(output.prop)
                    const [rawName, rawValue] = entry.input.split(':')
                    const selectorValue = rawValue === undefined ? null : rawValue
                    const className = api.contextToClassName(rawName, selectorValue, [], true, api.selectorPrefix)
                    expect(descriptor?.property).toBeTruthy()
                    expect(css).toContain(`.${className} { ${descriptor.property}:`)
                }
            }

            const missing = bosswindProps.filter(entry => !covered.has(entry.name))
            expect(missing).toStrictEqual([])
        })

        test('bosswind supports composed selectors in className', async ({ $ }) => {
            const api = await createServerApi($)

            await api.trigger('onParse', {
                content: `<div className="hover:text:sm tablet:bg:gray-500 light:text:gray-500 [&_.icon]:p:2 hover:translateX:4 hover:translateY:6 hover:scaleX:2 hover:scaleY:3 hover:skewX:12deg hover:skewY:6deg hover:{bg:transparent;p:2} tablet:hover:text:sm">`,
            })

            const css = api.css.text.trim()
            const hoverFontSize = getClassName(api, 'text', 'sm', ['hover'])
            const hoverTranslate = getClassName(api, 'translateX', '4', ['hover'])
            const hoverScale = getClassName(api, 'scaleX', '2', ['hover'])
            const hoverTransform = getClassName(api, 'skewX', '12deg', ['hover'])
            const tabletBg = getClassName(api, 'bg', 'gray-500', ['tablet'])
            const lightText = getClassName(api, 'text', 'gray-500', ['light'])
            const tabletHoverText = getClassName(api, 'text', 'sm', ['tablet', 'hover'])
            const childPadding = getClassName(api, 'p', '2', ['[&_.icon]'])

            expect(css).toContain(`.${hoverFontSize}:hover { font-size: var(--fontSize-sm) }`)
            expect(css).toContain(`.${hoverTranslate}:hover { translate: 4px 6px }`)
            expect(css).toContain(`.${hoverScale}:hover { scale: 2 3 }`)
            expect(css).toContain(`.${hoverTransform}:hover { transform: skewX(12deg) skewY(6deg) }`)
            expect(css).toContain(`@media screen and (min-width: 640px)`)
            expect(css).toContain(`.${tabletBg} { background-color: var(--color-gray-500) }`)
            expect(css).toContain(`@media screen and (prefers-color-scheme: light)`)
            expect(css).toContain(`.${lightText} { color: var(--color-gray-500) }`)
            expect(css).toContain(`.${tabletHoverText}:hover { font-size: var(--fontSize-sm) }`)
            expect(css).toContain(`.${childPadding}`)
            expect(css).toContain('.icon')
        })

        test('bosswind rewrites nested objects in pseudo/at/child contexts', async ({ $ }) => {
            const api = await createServerApi($)

            const tree = api.objectToPropTree({
                hover: { flex: true, text: 'sm', translateX: 4, translateY: 6 },
                at: { tablet: { bg: 'transparent', grow: true } },
                child: { '.icon': { p: 2, block: true } },
            })

            await api.trigger('onPropTree', {
                input: api.propTreeToObject(tree),
                tree,
                preferVariables: false,
                parser: 'classname',
            })

            const css = api.css.text.trim()
            const hoverDisplay = getClassName(api, 'flex', null, ['hover'])
            const hoverText = getClassName(api, 'text', 'sm', ['hover'])
            const hoverTranslate = getClassName(api, 'translateX', '4', ['hover'])
            const atBg = getClassName(api, 'bg', 'transparent', ['at', 'tablet'])
            const atGrow = getClassName(api, 'grow', null, ['at', 'tablet'])
            const childBlock = getClassName(api, 'block', null, ['[.icon]'])
            const childPadding = getClassName(api, 'p', 2, ['[.icon]'])

            expect(css).toContain(`.${hoverDisplay}:hover { display: flex }`)
            expect(css).toContain(`.${hoverText}:hover { font-size: var(--fontSize-sm) }`)
            expect(css).toContain(`.${hoverTranslate}:hover { translate: 4px 6px }`)
            expect(css).toContain(`@media screen and (min-width: 640px)`)
            expect(css).toContain(`.${atBg} { background-color: transparent }`)
            expect(css).toContain(`.${atGrow} { flex-grow: 1 }`)
            expect(css).toContain(`.${childBlock}`)
            expect(css).toContain(`.${childPadding}`)
            expect(css).toContain('.icon')
        })

        test('jsx aliases keep shorthand classnames in classname-first', async ({ $ }) => {
            const api = await $.createServerApi({
                plugins: [$.prop.bosswindServer, ...$.essentialsServer, $.strategy.classnameFirstServer],
            })

            await api.trigger('onParse', {
                content: `<$$ p={6} flex grow />`,
            })

            const css = api.css.text.trim()
            expect(css).toContain('.p\\:6 { padding: 6px }')
            expect(css).toContain('.flex { display: flex }')
            expect(css).toContain('.grow { flex-grow: 1 }')
        })
    })

    describe('browser', () => {
        test('alias props rewrite before inline-first', async ({ $ }) => {
            const api = await $.createBrowserApi({
                plugins: [$.prop.bosswindBrowser, $.strategy.inlineFirstBrowser],
                bosswind: { fontSizeKeys: ['sm'] },
            })

            const output = {}
            api.trigger('onBrowserObjectStart', {
                input: { p: 2, text: 'sm' },
                output,
                tag: 'div',
            })

            expect(output).toStrictEqual({
                style: { padding: '2px', fontSize: 'sm' },
            })
        })

        test('text inference and invalid display values', async ({ $ }) => {
            const api = await $.createBrowserApi({
                plugins: [$.prop.bosswindBrowser, $.strategy.inlineFirstBrowser],
                bosswind: { fontSizeKeys: ['sm'] },
            })

            const output = {}
            api.trigger('onBrowserObjectStart', {
                input: { text: 'sm', block: 'inline' },
                output,
                tag: 'div',
            })

            expect(output).toStrictEqual({
                style: { fontSize: 'sm' },
            })
        })

        test('text inference treats CSS variables as color', async ({ $ }) => {
            const api = await $.createBrowserApi({
                plugins: [$.prop.bosswindBrowser, $.strategy.inlineFirstBrowser],
                bosswind: { fontSizeKeys: ['sm'] },
            })

            const output = {}
            api.trigger('onBrowserObjectStart', {
                input: { text: 'var(--accent)' },
                output,
                tag: 'div',
            })

            expect(output).toStrictEqual({
                style: { color: 'var(--accent)' },
            })
        })

        test('text numbers resolve to font size', async ({ $ }) => {
            const api = await $.createBrowserApi({
                plugins: [$.prop.bosswindBrowser, $.strategy.inlineFirstBrowser],
                bosswind: { fontSizeKeys: ['sm'] },
            })

            const output = {}
            api.trigger('onBrowserObjectStart', {
                input: { text: 12 },
                output,
                tag: 'div',
            })

            expect(output).toStrictEqual({
                style: { fontSize: '12px' },
            })
        })

        test('axis aliases combine in runtime input', async ({ $ }) => {
            const api = await $.createBrowserApi({
                plugins: [$.prop.bosswindBrowser, $.strategy.inlineFirstBrowser],
            })

            const output = {}
            api.trigger('onBrowserObjectStart', {
                input: { translateX: 4, translateY: 6 },
                output,
                tag: 'div',
            })

            expect(output).toStrictEqual({
                style: { translate: '4px 6px' },
            })
        })

    })

    describe('types', () => {
        test('bosswind props are available in $$FinalProps', async ({ $ }) => {
            const source = `import '@/prop/bosswind/bo$$'

$$.$({
    p: 2,
    text: 'sm',
    bg: 'gray-500',
})

// @ts-expect-error bosswind props should not accept object values
$$.$({ p: {} })
`

            const { diagnostics, formattedDiagnostics } = await $.typeTest({
                plugins: [$.prop.bosswindServer, ...$.essentialsServer],
                files: {
                    'case.ts': source,
                },
            })

            expect(diagnostics, formattedDiagnostics).toStrictEqual([])
        })
    })
})
