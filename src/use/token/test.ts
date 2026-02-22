import { describe, expect } from 'vitest'

import { create } from './browser'
import { normalizeTokens } from './normalize'
import { getTokenPropGroups, setTokenPropGroups } from './server'

const p = create()
const snapshotPropGroups = () => structuredClone(getTokenPropGroups())
const restorePropGroups = (snapshot: Record<string, string[]>) => {
    setTokenPropGroups(snapshot)
}

describe('token', () => {
    describe('dtcg normalization', () => {
        test('normalizes primitive DTCG values and strips metadata', () => {
            const normalized = normalizeTokens({
                $root: { note: 'remove me' },
                color: {
                    $type: 'color',
                    brand: { $value: { hex: '#ff00ff' }, $extensions: { source: 'test' } },
                },
                size: {
                    $type: 'dimension',
                    sm: { $value: { value: 8, unit: 'px' } },
                },
                duration: {
                    $type: 'duration',
                    short: { $value: { value: 150, unit: 'ms' } },
                },
                easing: {
                    $type: 'cubicBezier',
                    accelerate: { $value: [0.5, 0, 1, 1] },
                },
                text: {
                    fonts: {
                        $type: 'fontFamily',
                        sans: { $value: ['Open Sans', 'system-ui'] },
                    },
                    weights: {
                        $type: 'fontWeight',
                        bold: { $value: 'extra-bold' },
                    },
                },
                stroke: {
                    $type: 'strokeStyle',
                    dashed: { $value: { dashArray: ['0.5rem', '0.25rem'] } },
                },
            })

            expect(normalized).toStrictEqual({
                color: { brand: '#ff00ff' },
                size: { sm: '8px' },
                duration: { short: '150ms' },
                easing: { accelerate: 'cubic-bezier(0.5, 0, 1, 1)' },
                text: {
                    fonts: { sans: '\"Open Sans\", system-ui' },
                    weights: { bold: 800 },
                },
                stroke: { dashed: 'dashed' },
            })
        })

        test('normalizes color components to CSS color() or rgb()', () => {
            const normalized = normalizeTokens({
                color: {
                    $type: 'color',
                    srgb: {
                        $value: {
                            colorSpace: 'srgb',
                            components: [0.5, 0.4, 0.3],
                            alpha: 0.5,
                        },
                    },
                    p3: {
                        $value: {
                            colorSpace: 'display-p3',
                            components: [0.1, 0.2, 0.3],
                        },
                    },
                },
            })

            expect(normalized.color).toStrictEqual({
                srgb: 'rgb(128 102 77 / 0.5)',
                p3: 'color(display-p3 0.1 0.2 0.3)',
            })
        })

        test('resolves $ref and $extends arrays during normalization', () => {
            const normalized = normalizeTokens({
                base: {
                    $type: 'color',
                    primary: { $value: '#111111' },
                },
                extra: {
                    $type: 'color',
                    secondary: { $value: '#222222' },
                },
                color: {
                    $extends: ['{base}', '{extra}'],
                    accent: { $value: '#333333' },
                    link: { $value: { $ref: '#/base/primary/$value' } },
                },
            })

            expect(normalized.color).toStrictEqual({
                primary: '#111111',
                secondary: '#222222',
                accent: '#333333',
                link: '#111111',
            })
        })

        test('normalizes shadow arrays into comma-separated values', () => {
            const normalized = normalizeTokens({
                shadow: {
                    $type: 'shadow',
                    stack: {
                        $value: [
                            {
                                color: '#000000',
                                offsetX: { value: 0, unit: 'px' },
                                offsetY: { value: 2, unit: 'px' },
                                blur: { value: 4, unit: 'px' },
                            },
                            {
                                color: '#000000',
                                offsetX: { value: 0, unit: 'px' },
                                offsetY: { value: 6, unit: 'px' },
                                blur: { value: 8, unit: 'px' },
                            },
                        ],
                    },
                },
            })

            expect(normalized.shadow).toStrictEqual({
                stack: '0px 2px 4px #000000, 0px 6px 8px #000000',
            })
        })

        test('normalizes typography into font shorthand', () => {
            const normalized = normalizeTokens({
                typography: {
                    $type: 'typography',
                    heading: {
                        $value: {
                            fontFamily: ['Open Sans', 'sans-serif'],
                            fontWeight: 'bold',
                            fontSize: { value: 20, unit: 'px' },
                            lineHeight: 1.4,
                            letterSpacing: { value: 1, unit: 'px' },
                        },
                    },
                },
            })

            expect(normalized.typography).toStrictEqual({
                heading: '700 20px/1.4 \"Open Sans\", sans-serif',
            })
        })
    })

    describe('e2e', () => {
        describe('server', () => {
            describe('essentials', () => {
                test('tokens from config are applied on boot', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                primary: '#ed4b9b',
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<div className="background-color:primary">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-primary: #ed4b9b;
}
.background-color\\:primary { background-color: var(--color-primary) }`)
                })

                test('selectorPrefix and selectorScope scope token root and selectors', async ({ $ }) => {
                    const api = await $.createServerApi({
                        selectorPrefix: 'boss-',
                        selectorScope: '.scope ',
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                primary: '#ed4b9b',
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<div className="color:primary">' })

                    expect(api.css.text.trim()).toStrictEqual(`.scope  {
  --boss-color-primary: #ed4b9b;
}
.scope .boss-color\\:primary { color: var(--boss-color-primary) }`)
                })

                test('token proxy as prop', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: 'white',
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ display={$$.token.color.foo}>' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: white;
}`)
                })

                test('token proxy emitted for non-prop usage', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })

                    await api.trigger('onParse', { content: 'console.log($$.token.color.foo)' })

                    expect(api.file.js.text).toContain('$$.token =')
                })

                test('token shorthand resolves', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: 'white',
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color="foo">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: white;
}`)
                })

                test('token shorthand resolves for backgroundColor in JSX', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                primary: '#ed4b9b',
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ backgroundColor="primary">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-primary: #ed4b9b;
}`)
                })

                test('token shorthand resolves for borderRadius in JSX', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            borderRadius: {
                                xl: 24,
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ borderRadius="xl">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --borderRadius-xl: 24px;
}`)
                })

                test('token alpha resolves to color-mix', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            gray: {
                                '600': '#1f2937',
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<div className="color:gray.600/60">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-gray-600: #1f2937;
}
.color\\:gray\\.600\\/60 { color: color-mix(in oklab, var(--color-gray-600) 60%, transparent) }`)
                })

                test('token as string', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: 'white',
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color="$$.token.color.foo">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: white;
}`)
                })

                test('token with value entry', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: { value: 'white' },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color={$$.token.color.foo}>' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: white;
}`)
                })

                test('DTCG $value tokens resolve', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                brand: { $value: '#123456' },
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color=\"brand\">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-brand: #123456;
}`)
                })

                test('DTCG references resolve', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                black: { $value: '#000000' },
                                link: { $value: '{color.black}' },
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color=\"link\">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-link: #000000;
}`)
                })

                test('DTCG $ref resolves JSON pointers', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                black: { $value: '#000000' },
                                link: { $value: { $ref: '#/color/black/$value' } },
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color=\"link\">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-link: #000000;
}`)
                })

                test('DTCG $extends merges groups', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            base: {
                                $type: 'color',
                                primary: { $value: '#0ea5e9' },
                            },
                            color: {
                                $extends: '{base}',
                                accent: { $value: '#f97316' },
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color=\"primary\">' })
                    await api.trigger('onParse', { content: '<$$ color=\"accent\">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-primary: #0ea5e9;
  --color-accent: #f97316;
}`)
                })

                test('DTCG composite tokens normalize to CSS-ready strings', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                black: { $value: '#000000' },
                            },
                            border: {
                                $type: 'border',
                                heavy: {
                                    $value: {
                                        color: '{color.black}',
                                        width: { value: 2, unit: 'px' },
                                        style: { dashArray: ['0.5rem', '0.25rem'] },
                                    },
                                },
                            },
                            transition: {
                                $type: 'transition',
                                emphasis: {
                                    $value: {
                                        duration: { value: 300, unit: 'ms' },
                                        delay: { value: 0, unit: 'ms' },
                                        timingFunction: [0.5, 0, 1, 1],
                                    },
                                },
                            },
                            shadow: {
                                $type: 'shadow',
                                lg: {
                                    $value: {
                                        color: '{color.black}',
                                        offsetX: { value: 0, unit: 'px' },
                                        offsetY: { value: 4, unit: 'px' },
                                        blur: { value: 12, unit: 'px' },
                                    },
                                },
                            },
                            typography: {
                                $type: 'typography',
                                heading: {
                                    $value: {
                                        fontFamily: 'Open Sans, sans-serif',
                                        fontWeight: 'extra-bold',
                                        fontSize: { value: 32, unit: 'px' },
                                        lineHeight: 1.2,
                                    },
                                },
                            },
                            gradient: {
                                $type: 'gradient',
                                sunset: {
                                    $value: [
                                        { color: '#f97316', position: 0 },
                                        { color: '#0ea5e9', position: 1 },
                                    ],
                                },
                            },
                        },
                    })

                    await api.trigger('onParse', {
                        content: `
<$$
  border={$$.token.border.heavy}
  transition={$$.token.transition.emphasis}
  boxShadow={$$.token.shadow.lg}
  font={$$.token.typography.heading}
  backgroundImage={$$.token.gradient.sunset}
/>
`,
                    })

                    const cssText = api.css.text.trim()

                    expect(cssText).toContain('--border-heavy: 2px dashed #000000;')
                    expect(cssText).toContain('--transition-emphasis: 300ms cubic-bezier(0.5, 0, 1, 1) 0ms;')
                    expect(cssText).toContain('--shadow-lg: 0px 4px 12px #000000;')
                    expect(cssText).toContain('--typography-heading: 800 32px/1.2 \"Open Sans\", sans-serif;')
                    expect(cssText).toContain('--gradient-sunset: linear-gradient(#f97316 0%, #0ea5e9 100%);')
                })

                test('DTCG shorthand tokens resolve through prop map', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                sunrise: { $value: '#ffffff' },
                                black: { $value: '#000000' },
                            },
                            shadow: {
                                $type: 'shadow',
                                soft: {
                                    $value: {
                                        color: '#000000',
                                        offsetX: { value: 0, unit: 'px' },
                                        offsetY: { value: 2, unit: 'px' },
                                        blur: { value: 6, unit: 'px' },
                                    },
                                },
                            },
                            gradient: {
                                $type: 'gradient',
                                sunrise: {
                                    $value: [
                                        { color: '#f97316', position: 0 },
                                        { color: '#0ea5e9', position: 1 },
                                    ],
                                },
                            },
                            transition: {
                                $type: 'transition',
                                quick: {
                                    $value: {
                                        duration: { value: 150, unit: 'ms' },
                                        timingFunction: [0.2, 0, 0, 1],
                                        delay: { value: 0, unit: 'ms' },
                                    },
                                },
                            },
                            typography: {
                                $type: 'typography',
                                caption: {
                                    $value: {
                                        fontFamily: 'Open Sans, sans-serif',
                                        fontWeight: 'bold',
                                        fontSize: { value: 12, unit: 'px' },
                                        lineHeight: 1.2,
                                    },
                                },
                            },
                        },
                    })

                    await api.trigger('onParse', {
                        content: '<$$ boxShadow=\"soft\" backgroundImage=\"sunrise\" transition=\"quick\" font=\"caption\" />',
                    })

                    const cssText = api.css.text.trim()

                    expect(cssText).toContain('--shadow-soft: 0px 2px 6px #000000;')
                    expect(cssText).toContain('--gradient-sunrise: linear-gradient(#f97316 0%, #0ea5e9 100%);')
                    expect(cssText).toContain('--transition-quick: 150ms cubic-bezier(0.2, 0, 0, 1) 0ms;')
                    expect(cssText).toContain('--typography-caption: 700 12px/1.2 \"Open Sans\", sans-serif;')
                })

                test('shorthand tokens fall back to the first matching group', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                black: { $value: '#000000' },
                            },
                            shadow: {
                                $type: 'shadow',
                                black: {
                                    $value: {
                                        color: '#000000',
                                        offsetX: { value: 0, unit: 'px' },
                                        offsetY: { value: 1, unit: 'px' },
                                        blur: { value: 2, unit: 'px' },
                                    },
                                },
                                soft: {
                                    $value: {
                                        color: '#000000',
                                        offsetX: { value: 0, unit: 'px' },
                                        offsetY: { value: 2, unit: 'px' },
                                        blur: { value: 4, unit: 'px' },
                                    },
                                },
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ textShadow=\"soft\" />' })
                    await api.trigger('onParse', { content: '<$$ textShadow=\"black\" />' })

                    const cssText = api.css.text.trim()

                    expect(cssText).toContain('--shadow-soft: 0px 2px 4px #000000;')
                    expect(cssText).toContain('--shadow-black: 0px 1px 2px #000000;')
                    expect(cssText).not.toContain('--color-black: #000000;')
                })

                test('shorthand tokens fall back to color when shadow is missing', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                        tokens: {
                            color: {
                                $type: 'color',
                                black: { $value: '#000000' },
                            },
                            shadow: {
                                $type: 'shadow',
                                soft: {
                                    $value: {
                                        color: '#000000',
                                        offsetX: { value: 0, unit: 'px' },
                                        offsetY: { value: 2, unit: 'px' },
                                        blur: { value: 4, unit: 'px' },
                                    },
                                },
                            },
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ textShadow=\"black\" />' })

                    const cssText = api.css.text.trim()

                    expect(cssText).toContain('--color-black: #000000;')
                    expect(cssText).not.toContain('--shadow-black')
                })

                test('runtime token prop groups are filtered to used tokens', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })

                    await api.trigger('onParse', { content: '<$$ color="white">' })

                    const configs = (api.file.js as any)._configs as Map<string, { config: Record<string, unknown> }>
                    const tokenConfig = configs.get('boss-css/use/token/browser')
                    const tokenPropGroups = tokenConfig?.config?.tokenPropGroups as Record<string, string[]> | undefined

                    expect(tokenPropGroups?.color).toBeDefined()
                    expect(tokenPropGroups?.size).toBeUndefined()
                })

                test('custom prop map uses custom token group', async ({ $ }) => {
                    const snapshot = snapshotPropGroups()
                    const colorGroup = snapshot.color?.filter(entry => entry !== 'background-color') ?? []
                    const customGroups = { brand: ['backgroundColor'], ...snapshot, color: colorGroup }

                    try {
                        setTokenPropGroups(customGroups)
                        const api = await $.createServerApi({
                            plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                            tokens: {
                                brand: {
                                    primary: '#0ea5e9',
                                },
                            },
                        })

                        await api.trigger('onParse', { content: '<$$ backgroundColor="primary">' })

                        expect(api.css.text.trim()).toContain('--brand-primary: #0ea5e9;')
                    } finally {
                        restorePropGroups(snapshot)
                    }
                })

                test('token shorthand inside classname', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: '#fff',
                        },
                    })

                    await api.trigger('onParse', { content: '<div className="color:foo">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: #fff;
}
.color\\:foo { color: var(--color-foo) }`)
                })

                test('token shorthand for background-color inside classname', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            primary: '#ed4b9b',
                        },
                    })

                    await api.trigger('onParse', { content: '<div className="background-color:primary">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-primary: #ed4b9b;
}
.background-color\\:primary { background-color: var(--color-primary) }`)
                })

                test('token string inside classname', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: '#fff',
                        },
                    })

                    await api.trigger('onParse', { content: '<div className="color:$$.token.color.foo">' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: #fff;
}
.color\\:\\$\\$\\.token\\.color\\.foo { color: var(--color-foo) }`)
                })

                test('token proxy inside pseudo', async ({ $ }) => {
                    const api = await $.createServerApi({
                        plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                    })
                    $.use.tokenServer.set({
                        color: {
                            foo: 'white',
                        },
                    })

                    await api.trigger('onParse', { content: '<$$ color="blue" hover={{ color: $$.token.color.foo }}>' })

                    expect(api.css.text.trim()).toStrictEqual(`:root {
  --color-foo: white;
}
.hover\\:color:hover { color: var(--hover-color) !important }`)
                })
            })
        })

        describe('browser', () => {
            describe('essentials', () => {
                test('token proxy as prop', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: p.color.white,
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            color: 'var(--color-white)',
                        },
                    })
                })

                test('token proxy as prop respects selectorPrefix', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        selectorPrefix: 'boss-',
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: p.color.white,
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            color: 'var(--boss-color-white)',
                        },
                    })
                })

                test('token proxy toString returns CSS variable', async ({ $ }) => {
                    await $.createBrowserApi({
                        selectorPrefix: 'boss-',
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    expect(String(p.color.white)).toBe('var(--boss-color-white)')
                })

                test('token as full string', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: '$$.token.color.foo',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            color: 'var(--color-foo)',
                        },
                    })
                })

                test('token as shorthand string', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    $.use.tokenBrowser.tokenPaths.add('color.foo')

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: 'foo',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            color: 'var(--color-foo)',
                        },
                    })
                })

                test('token shorthand respects selectorPrefix', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        selectorPrefix: 'boss-',
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    $.use.tokenBrowser.tokenPaths.add('color.foo')

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            color: 'foo',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            color: 'var(--boss-color-foo)',
                        },
                    })
                })

                test('token shorthand prefers the first matching group in browser', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    $.use.tokenBrowser.tokenPaths.add('color.black')
                    $.use.tokenBrowser.tokenPaths.add('shadow.black')

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            textShadow: 'black',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            textShadow: 'var(--shadow-black)',
                        },
                    })
                })

                test('token shorthand falls back when the first group is missing', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    $.use.tokenBrowser.tokenPaths.clear()
                    $.use.tokenBrowser.tokenPaths.add('color.black')

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            textShadow: 'black',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            textShadow: 'var(--color-black)',
                        },
                    })
                })

                test('token shorthand resolves for borderRadius in browser', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    $.use.tokenBrowser.tokenPaths.add('borderRadius.xl')

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            borderRadius: 'xl',
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            borderRadius: 'var(--borderRadius-xl)',
                        },
                    })
                })

                test('custom prop map resolves tokens in browser', async ({ $ }) => {
                    const snapshot = snapshotPropGroups()
                    const colorGroup = snapshot.color?.filter(entry => entry !== 'background-color') ?? []
                    const customGroups = { brand: ['backgroundColor'], ...snapshot, color: colorGroup }

                    try {
                        const api = await $.createBrowserApi({
                            tokenPropGroups: customGroups,
                            plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                        })

                        $.use.tokenBrowser.tokenPaths.add('brand.primary')

                        const props = {}
                        api.trigger('onBrowserObjectStart', {
                            output: props,
                            input: {
                                backgroundColor: 'primary',
                            },
                        })

                        expect(props).toStrictEqual({
                            style: {
                                backgroundColor: 'var(--brand-primary)',
                            },
                        })
                    } finally {
                        restorePropGroups(snapshot)
                        $.use.tokenBrowser.tokenPaths.clear()
                    }
                })

                test('tokenVars builds CSS variables with units', async ({ $ }) => {
                    await $.createBrowserApi({
                        selectorPrefix: 'boss-',
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const vars = $.use.tokenBrowser.tokenVars({
                        color: {
                            primary: '#fff',
                        },
                        size: {
                            sm: 8,
                        },
                    })

                    expect(vars).toStrictEqual({
                        '--boss-color-primary': '#fff',
                        '--boss-size-sm': '8px',
                    })
                })

                test('tokens prop merges into style with overrides', async ({ $ }) => {
                    const api = await $.createBrowserApi({
                        plugins: [...$.essentialsBrowser, $.strategy.inlineFirstBrowser],
                    })

                    const props = {}
                    api.trigger('onBrowserObjectStart', {
                        output: props,
                        input: {
                            style: {
                                '--color-primary': '#000',
                            },
                            tokens: {
                                color: {
                                    primary: '#fff',
                                },
                            },
                        },
                    })

                    expect(props).toStrictEqual({
                        style: {
                            '--color-primary': '#fff',
                        },
                    })
                })
            })
        })
    })

    describe('types', () => {
        test('DTCG tokens are available on the $$ token proxy', async ({ $ }) => {
            const api = await $.createServerApi({
                plugins: [...$.essentialsServer, $.strategy.inlineFirstServer],
                tokens: {
                    shadow: {
                        $type: 'shadow',
                        lg: { $value: { color: '#000000', offsetX: 0, offsetY: 4, blur: 12 } },
                    },
                    gradient: {
                        $type: 'gradient',
                        sunset: {
                            $value: [
                                { color: '#f97316', position: 0 },
                                { color: '#0ea5e9', position: 1 },
                            ],
                        },
                    },
                    typography: {
                        $type: 'typography',
                        heading: {
                            $value: {
                                fontFamily: 'Open Sans, sans-serif',
                                fontWeight: 'bold',
                                fontSize: 16,
                                lineHeight: 1.4,
                            },
                        },
                    },
                },
            })

            const source = `import './bo$$'\n\n$$.token.shadow.lg\n$$.token.gradient.sunset\n$$.token.typography.heading\n\n// @ts-expect-error missing token should fail\n$$.token.shadow.missing\n`

            const { diagnostics, formattedDiagnostics } = await $.typeTest({
                files: { 'case.ts': source },
                dts: api.file.js.dts.text,
            })

            expect(diagnostics, formattedDiagnostics).toStrictEqual([])
        })
    })
})
