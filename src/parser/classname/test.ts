import { describe, expect, vi } from 'vitest'
import hash from '@emotion/hash'

describe('classname', () => {
    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('simple class', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `some random code () "display:block"`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.display\\:block { display: block }`)
                })

                test('border class expands unitless numeric value', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="border:1_solid">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.border\\:1_solid { border: 1px solid }`)
                })

                test('important suffix emits !important', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="color:red!">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.color\\:red\\! { color: red !important }`)
                })

                test('important suffix works with pseudos', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="hover:color:red!">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.hover\\:color\\:red\\!:hover { color: red !important }`,
                    )
                })

                test('important suffix works with at shorthands', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:mobile+:display:block!">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) { .at\\:mobile\\+\\:display\\:block\\! { display: block !important } }`,
                    )
                })

                test('important suffix works with child selectors', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="[&>div]:color:red!">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.\\[\\&\\>div\\]\\:color\\:red\\!>div { color: red !important }`,
                    )
                })

                test('important suffix works with grouped selectors', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:{color:red!;text-decoration:underline!}">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `[class~="hover:{color:red!;text-decoration:underline!}"]:hover { color: red !important }
[class~="hover:{color:red!;text-decoration:underline!}"]:hover { text-decoration: underline !important }`,
                    )
                })

                test('important suffix works with token values', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                primary: '#ed4b9b',
                            },
                        },
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="color:primary!">`,
                    })

                    expect(api.css.text).toContain('--color-primary')
                    expect(api.css.text).toContain('.color\\:primary\\! { color: var(--color-primary) !important }')
                })

                test('at:mobile+:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:mobile+:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) { .at\\:mobile\\+\\:display\\:block { display: block } }`,
                    )
                })

                test('container:mobile:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="container:mobile:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container (min-width: 376px) and (max-width: 639px) { .container\\:mobile\\:display\\:block { display: block } }`,
                    )
                })

                test('container:mobile:{width:100;color:red}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="container:mobile:{width:100;color:red}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container (min-width: 376px) and (max-width: 639px) { [class~="container:mobile:{width:100;color:red}"] { width: 100px } }
@container (min-width: 376px) and (max-width: 639px) { [class~="container:mobile:{width:100;color:red}"] { color: red } }`,
                    )
                })

                test('keyframes:from/to', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="keyframes:from:opacity:0 keyframes:to:opacity:1" />`,
                    })

                    const signature = `${api.selectorPrefix ?? ''}|keyframes`
                    const keyframesName = `kf-${hash(signature)}`

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes ${keyframesName} { 0% { opacity: 0 } 100% { opacity: 1 } }
.keyframes\\:from\\:opacity\\:0 { animation-name: ${keyframesName} }
.keyframes\\:to\\:opacity\\:1 { animation-name: ${keyframesName} }`,
                    )
                })

                test('keyframes_fade:from/to', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="keyframes_fade:from:opacity:0 keyframes_fade:to:opacity:1" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes fade { 0% { opacity: 0 } 100% { opacity: 1 } }
.keyframes_fade\\:from\\:opacity\\:0 { animation-name: fade }
.keyframes_fade\\:to\\:opacity\\:1 { animation-name: fade }`,
                    )
                })

                test('hover:keyframes:from/to', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:keyframes:from:opacity:0 hover:keyframes:to:opacity:1" />`,
                    })

                    const signature = `${api.selectorPrefix ?? ''}|hover|keyframes`
                    const keyframesName = `kf-${hash(signature)}`
                    const fromContexts = ['hover', 'keyframes', 'from']
                    const toContexts = ['hover', 'keyframes', 'to']
                    const fromClassName = api.contextToClassName('opacity', '0', fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('opacity', '1', toContexts, true, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes ${keyframesName} { 0% { opacity: 0 } 100% { opacity: 1 } }
.${fromClassName}:hover { animation-name: ${keyframesName} }
.${toClassName}:hover { animation-name: ${keyframesName} }`,
                    )
                })

                test('[&>div]:keyframes:from/to', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="[&>div]:keyframes:from:opacity:0 [&>div]:keyframes:to:opacity:1" />`,
                    })

                    const signature = `${api.selectorPrefix ?? ''}|[&>div]|keyframes`
                    const keyframesName = `kf-${hash(signature)}`
                    const fromContexts = ['[&>div]', 'keyframes', 'from']
                    const toContexts = ['[&>div]', 'keyframes', 'to']
                    const fromClassName = api.contextToClassName('opacity', '0', fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('opacity', '1', toContexts, true, api.selectorPrefix)
                    const fromSelector = api.applyChildSelectors(`.${fromClassName}`, fromContexts)
                    const toSelector = api.applyChildSelectors(`.${toClassName}`, toContexts)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes ${keyframesName} { 0% { opacity: 0 } 100% { opacity: 1 } }
${fromSelector} { animation-name: ${keyframesName} }
${toSelector} { animation-name: ${keyframesName} }`,
                    )
                })

                test('hover:keyframes grouped selectors', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:keyframes:from:{opacity:0;text-decoration:underline} hover:keyframes:to:{opacity:1;text-decoration:none}" />`,
                    })

                    const signature = `${api.selectorPrefix ?? ''}|hover|keyframes`
                    const keyframesName = `kf-${hash(signature)}`
                    const fromToken = 'hover:keyframes:from:{opacity:0;text-decoration:underline}'
                    const toToken = 'hover:keyframes:to:{opacity:1;text-decoration:none}'
                    const fromSelector = `[class~="${fromToken}"]:hover`
                    const toSelector = `[class~="${toToken}"]:hover`

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes ${keyframesName} { 0% { opacity: 0; text-decoration: underline } 100% { opacity: 1; text-decoration: none } }
${fromSelector} { animation-name: ${keyframesName} }
${toSelector} { animation-name: ${keyframesName} }`,
                    )
                })

                test('keyframes under container query', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="container:200-400:keyframes:from:opacity:0 container:200-400:keyframes:to:opacity:1" />`,
                    })

                    const signature = `${api.selectorPrefix ?? ''}|container|200-400|keyframes`
                    const keyframesName = `kf-${hash(signature)}`
                    const query = '@container (min-width: 200px) and (max-width: 400px)'
                    const fromContexts = ['container', '200-400', 'keyframes', 'from']
                    const toContexts = ['container', '200-400', 'keyframes', 'to']
                    const fromClassName = api.contextToClassName('opacity', '0', fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('opacity', '1', toContexts, true, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `${query} { @keyframes ${keyframesName} { 0% { opacity: 0 } 100% { opacity: 1 } } }
${query} { .${fromClassName} { animation-name: ${keyframesName} } }
${query} { .${toClassName} { animation-name: ${keyframesName} } }`,
                    )
                })

                test('keyframes_spin_fast:from/to', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="keyframes_spin_fast:from:opacity:0 keyframes_spin_fast:to:opacity:1" />`,
                    })

                    const fromContexts = ['keyframes spin_fast', 'from']
                    const toContexts = ['keyframes spin_fast', 'to']
                    const fromClassName = api.contextToClassName('opacity', '0', fromContexts, true, api.selectorPrefix)
                    const toClassName = api.contextToClassName('opacity', '1', toContexts, true, api.selectorPrefix)

                    expect(api.css.text.trim()).toStrictEqual(
                        `@keyframes spin_fast { 0% { opacity: 0 } 100% { opacity: 1 } }
.${fromClassName} { animation-name: spin_fast }
.${toClassName} { animation-name: spin_fast }`,
                    )
                })

                test('container_card_large:200-400:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="container_card_large:200-400:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card_large (min-width: 200px) and (max-width: 400px) { .container_card_large\\:200-400\\:display\\:block { display: block } }`,
                    )
                })

                test('container_card:mobile:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="container_card:mobile:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { .container_card\\:mobile\\:display\\:block { display: block } }`,
                    )
                })

                test('at:container card:mobile:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:container_card:mobile:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { .at\\:container_card\\:mobile\\:display\\:block { display: block } }`,
                    )
                })

                test('at:container card:mobile:[&>div]:color:red', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:container_card:mobile:[&>div]:color:red" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { .at\\:container_card\\:mobile\\:\\[\\&\\>div\\]\\:color\\:red>div { color: red } }`,
                    )
                })

                test('at:container card:mobile:hover:{color:red;text-decoration:underline}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:container_card:mobile:hover:{color:red;text-decoration:underline}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container card (min-width: 376px) and (max-width: 639px) { [class~="at:container_card:mobile:hover:{color:red;text-decoration:underline}"]:hover { color: red } }
@container card (min-width: 376px) and (max-width: 639px) { [class~="at:container_card:mobile:hover:{color:red;text-decoration:underline}"]:hover { text-decoration: underline } }`,
                    )
                })

                test('container:200-400:before:content:\'\'', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="container:200-400:before:content:''" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@container (min-width: 200px) and (max-width: 400px) { .container\\:200-400\\:before\\:content\\:\\'\\':before { content: '' } }`,
                    )
                })

                test('hover:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.hover\\:display\\:block:hover { display: block }`)
                })

                test('hover:{color:red;text-decoration:underline}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:{color:red;text-decoration:underline}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `[class~="hover:{color:red;text-decoration:underline}"]:hover { color: red }
[class~="hover:{color:red;text-decoration:underline}"]:hover { text-decoration: underline }`,
                    )
                })

                test('hover:focus:{color:red;text-decoration:underline}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:focus:{color:red;text-decoration:underline}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `[class~="hover:focus:{color:red;text-decoration:underline}"]:hover:focus { color: red }
[class~="hover:focus:{color:red;text-decoration:underline}"]:hover:focus { text-decoration: underline }`,
                    )
                })

                test('[&>div]:color:red', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="[&>div]:color:red" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.\\[\\&\\>div\\]\\:color\\:red>div { color: red }`)
                })

                test('[&_.child]:color:red', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="[&_.child]:color:red" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.\\[\\&_\\.child\\]\\:color\\:red .child { color: red }`)
                })

                test('focus:hover:{color:red}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="focus:hover:{color:red}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `[class~="focus:hover:{color:red}"]:focus:hover { color: red }`,
                    )
                })

                test('mobile:hover:{display:block}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="mobile:hover:{display:block}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { [class~="mobile:hover:{display:block}"]:hover { display: block } }`,
                    )
                })

                test('at:mobile:hover:focus:{display:block;color:red}', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:mobile:hover:focus:{display:block;color:red}" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { [class~="at:mobile:hover:focus:{display:block;color:red}"]:hover:focus { display: block } }
@media screen and (min-width: 376px) and (max-width: 639px) { [class~="at:mobile:hover:focus:{display:block;color:red}"]:hover:focus { color: red } }`,
                    )
                })

                test('hover:mobile:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="hover:mobile:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { .hover\\:mobile\\:display\\:block:hover { display: block } }`,
                    )
                })

                test('mobile:hover:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="mobile:hover:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { .mobile\\:hover\\:display\\:block:hover { display: block } }`,
                    )
                })

                test('mobile:hover:focus:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="mobile:hover:focus:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { .mobile\\:hover\\:focus\\:display\\:block:hover:focus { display: block } }`,
                    )
                })

                test('at:mobile:hover:focus:display:block', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<$$ className="at:mobile:hover:focus:display:block" />`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `@media screen and (min-width: 376px) and (max-width: 639px) { .at\\:mobile\\:hover\\:focus\\:display\\:block:hover:focus { display: block } }`,
                    )
                })

                test('normal div', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="display:inline color:red font-size:32">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(
                        `.display\\:inline { display: inline }
.color\\:red { color: red }
.font-size\\:32 { font-size: 32px }`,
                    )
                })

                describe.each([
                    {
                        content: `"display:block"`,
                    },
                    {
                        content: `'display:block'`,
                    },
                    {
                        content: '`display:block`',
                    },
                    {
                        content: '`<div class="display:block">`',
                    },
                ])('any string', ({ content, output = `.display\\:block { display: block }` }: { content: string; output?: string }) => {
                    test(`${content} => ${output}`, async ({ $ }) => {
                        const api = await $.createServerApi({
                            plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        })
                        await api.trigger('onParse', { content })

                        expect(api.css.text.trim()).toStrictEqual(output)
                    })
                })

                test('ignore template literals with expressions', async ({ $ }) => {
                    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    try {
                        await api.trigger('onParse', {
                            content: `<div className={\`min-height:\${size === 'sm' ? '26px' : '32px'}\`} />`,
                        })

                        expect(api.css.text.trim()).toStrictEqual(``)
                        expect(warnSpy).toHaveBeenCalledTimes(2)
                    } finally {
                        warnSpy.mockRestore()
                    }
                })

                test('do not conflict with tailwind classes', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="relative flex place-items-center before:absolute before:h-[300px] before:w-[480px] before:-translate-x-1/2 before:rounded-full before:bg-gradient-radial before:from-white before:to-transparent before:blur-2xl before:content-[''] after:absolute after:-z-20 after:h-[180px] after:w-[240px] after:translate-x-1/3 after:bg-gradient-conic after:from-sky-200 after:via-blue-200 after:blur-2xl after:content-[''] before:dark:bg-gradient-to-br before:dark:from-transparent before:dark:to-blue-700 before:dark:opacity-10 after:dark:from-sky-900 after:dark:via-[#0141ff] after:dark:opacity-40 before:lg:h-[360px] z-[-1]">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(``)
                })

                test('skip non-css prop tails (dark:from-inherit)', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="dark:from-inherit">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(``)
                })

                test('skip grouped entries without css props', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="hover:{not-a-prop:bar}">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(``)
                })

                test('before:content with apostrophe', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="before:content:''">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.before\\:content\\:\\'\\':before { content: '' }`)
                })

                test('margin:20_0', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    await api.trigger('onParse', {
                        content: `<div className="margin:20_0">`,
                    })

                    expect(api.css.text.trim()).toStrictEqual(`.margin\\:20_0 { margin: 20px 0 }`)
                })
            })
        })

        describe('browser', () => {
            describe('essentials', () => {
                test('at:dark', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            at: {
                                dark: {
                                    fontStyle: 'italic',
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'at:dark:font-style',
                        style: {
                            '--at-dark-font-style': 'italic',
                        },
                    })
                })

                test('do not conflict with tailwind classes', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })
                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            className: 'hover:bg-gray-100',
                        },
                    })

                    expect(props).toStrictEqual({
                        className: 'hover:bg-gray-100',
                        style: {},
                    })
                })
            })
        })
    })
})
