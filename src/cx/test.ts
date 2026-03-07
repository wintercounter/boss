import { expect, test } from 'vitest'

import { cv, cx, createBossCx, scv, sv } from '@/cx'

test('cx merges css-variants output with boss conflicts', () => {
    expect(cx('card', { 'color:red': true }, ['color:blue'])).toBe('card color:blue')
    expect(cx('hover:color:red', { 'hover:color:blue': true })).toBe('hover:color:blue')
})

test('cx respects css-variants falsy values', () => {
    expect(cx('card', false && 'color:red', { 'color:blue': false }, ['gap:4'])).toBe('card gap:4')
})

test('cx preserves shorthand and longhand tokens', () => {
    expect(cx('border:1px_solid', 'border-color:rgba(255,255,255,0.08)')).toBe(
        'border:1px_solid border-color:rgba(255,255,255,0.08)',
    )
})

test('cx can customize merge behavior', () => {
    const custom = createBossCx({ sortContexts: false })
    expect(custom('hover:focus:color:red', 'focus:hover:color:blue')).toBe(
        'hover:focus:color:red focus:hover:color:blue',
    )
})

test('cv applies boss merge to variant output', () => {
    const button = cv({
        base: 'color:red',
        variants: {
            tone: {
                cool: 'color:blue',
            },
        },
        defaultVariants: {
            tone: 'cool',
        },
    })

    expect(button()).toBe('color:blue')
})

test('cv preserves shorthand and longhand tokens in base output', () => {
    const button = cv({
        base: 'border:1px_solid border-color:rgba(255,255,255,0.08)',
    })

    expect(button()).toBe('border:1px_solid border-color:rgba(255,255,255,0.08)')
})

test('scv applies boss merge to slot output', () => {
    const card = scv({
        slots: ['root'],
        base: {
            root: 'color:red',
        },
        variants: {
            tone: {
                cool: {
                    root: 'color:blue',
                },
            },
        },
        defaultVariants: {
            tone: 'cool',
        },
    })

    expect(card().root).toBe('color:blue')
})

test('scv preserves shorthand and longhand tokens per slot', () => {
    const card = scv({
        slots: ['root'],
        base: {
            root: 'border:1px_solid border-color:rgba(255,255,255,0.08)',
        },
    })

    expect(card().root).toBe('border:1px_solid border-color:rgba(255,255,255,0.08)')
})

test('sv deep merges style objects', () => {
    const box = sv({
        base: { nested: { a: 1 } } as any,
        variants: {
            tone: {
                cool: { nested: { b: 2 } } as any,
            },
        },
        defaultVariants: {
            tone: 'cool',
        },
    })

    expect(box()).toEqual({ nested: { a: 1, b: 2 } })
})
