import { expect, test } from 'vitest'

import { createBossMerge, join, merge } from '@/merge'

// join tests adapted from the tailwind-merge class-merging fixture patterns.
test('join strings', () => {
    expect(join('')).toBe('')
    expect(join('foo')).toBe('foo')
    expect(join(true && 'foo')).toBe('foo')
    expect(join(false && 'foo')).toBe('')
})

test('join strings (variadic)', () => {
    expect(join('')).toBe('')
    expect(join('foo', 'bar')).toBe('foo bar')
    expect(join(true && 'foo', false && 'bar', 'baz')).toBe('foo baz')
    expect(join(false && 'foo', 'bar', 'baz', '')).toBe('bar baz')
})

test('join arrays', () => {
    expect(join([])).toBe('')
    expect(join(['foo'])).toBe('foo')
    expect(join(['foo', 'bar'])).toBe('foo bar')
    expect(join(['foo', 0 && 'bar', 1 && 'baz'])).toBe('foo baz')
})

test('join arrays (nested)', () => {
    expect(join([[[]]])).toBe('')
    expect(join([[['foo']]])).toBe('foo')
    expect(join([false, [['foo']]])).toBe('foo')
    expect(join(['foo', ['bar', ['', [['baz']]]]])).toBe('foo bar baz')
})

test('join arrays (variadic)', () => {
    expect(join([], [])).toBe('')
    expect(join(['foo'], ['bar'])).toBe('foo bar')
    expect(join(['foo'], null, ['baz', ''], false, '', [])).toBe('foo baz')
})

test('merge resolves conflicts by property + context', () => {
    expect(merge('display:flex display:grid')).toBe('display:grid')
    expect(merge('color:red color:blue')).toBe('color:blue')
    expect(merge('hover:color:red hover:color:blue')).toBe('hover:color:blue')
    expect(merge('color:red hover:color:blue')).toBe('color:red hover:color:blue')
    expect(merge('hover:focus:color:red focus:hover:color:blue')).toBe('focus:hover:color:blue')
})

test('merge keeps non-conflicting props', () => {
    expect(merge('border-top-width:1 border-color:white')).toBe('border-top-width:1 border-color:white')
})

test('merge handles shorthand conflicts', () => {
    expect(merge('margin:1 margin-top:2')).toBe('margin-top:2')
    expect(merge('margin-top:2 margin:1')).toBe('margin:1')
    expect(merge('padding-inline:1 padding-inline-start:2')).toBe('padding-inline-start:2')
    expect(merge('inset:0 top:4')).toBe('top:4')
    expect(merge('border-width:1 border-top-width:2')).toBe('border-top-width:2')
    expect(merge('border-top-width:2 border-right-width:3')).toBe('border-top-width:2 border-right-width:3')
    expect(merge('border-radius:4 border-top-left-radius:2')).toBe('border-top-left-radius:2')
    expect(merge('place-items:center align-items:start')).toBe('align-items:start')
})

test('merge keeps non-boss classes intact', () => {
    expect(merge('card color:red card--large')).toBe('card color:red card--large')
})

test('merge handles at contexts', () => {
    expect(merge('at:dark:color:red at:dark:color:blue at:light:color:red')).toBe(
        'at:dark:color:blue at:light:color:red',
    )
})

test('merge handles grouped selectors', () => {
    expect(merge('hover:{color:red;text-decoration:underline} hover:color:blue')).toBe(
        'hover:text-decoration:underline hover:color:blue',
    )
    expect(merge('hover:{color:red} hover:{color:blue}')).toBe('hover:{color:blue}')
    expect(merge('hover:{color:red} hover:color:blue')).toBe('hover:color:blue')
})

test('merge keeps order-sensitive contexts distinct', () => {
    const mergeSensitive = createBossMerge({ orderSensitiveContexts: ['before'] })
    expect(mergeSensitive('before:hover:color:red hover:before:color:blue')).toBe(
        'before:hover:color:red hover:before:color:blue',
    )
})

test('merge can disable context sorting', () => {
    const mergeNoSort = createBossMerge({ sortContexts: false })
    expect(mergeNoSort('hover:focus:color:red focus:hover:color:blue')).toBe(
        'hover:focus:color:red focus:hover:color:blue',
    )
})

test('merge keeps compound contexts together', () => {
    expect(merge('hover:at:dark:color:red at:dark:hover:color:blue')).toBe('at:dark:hover:color:blue')
})

test('merge handles wonky inputs', () => {
    expect(merge(' color:red')).toBe('color:red')
    expect(merge('color:red ')).toBe('color:red')
    expect(merge(' color:red ')).toBe('color:red')
    expect(merge('  color:red  display:flex     gap:4  ')).toBe('color:red display:flex gap:4')
    expect(merge('color:red\ndisplay:flex')).toBe('color:red display:flex')
    expect(merge('\ncolor:red\ndisplay:flex\n')).toBe('color:red display:flex')
    expect(merge('  color:red\n        \n        display:flex   \n          gap:4  ')).toBe(
        'color:red display:flex gap:4',
    )
    expect(merge('\r  color:red\n\r        \n        display:flex   \n          gap:4  ')).toBe(
        'color:red display:flex gap:4',
    )
})

test('merge accepts array inputs', () => {
    expect(merge('color:red', [null, false, [['color:blue']]])).toBe('color:blue')
})

test('merge deep merges object inputs', () => {
    expect(merge({ color: 'red' }, { color: 'blue' })).toStrictEqual({ color: 'blue' })
    expect(merge({ hover: { color: 'red' } }, { hover: { fontWeight: 'bold' } })).toStrictEqual({
        hover: { color: 'red', fontWeight: 'bold' },
    })
})

test('merge rejects mixed object and className inputs', () => {
    expect(() => merge({ color: 'red' }, 'color:blue')).toThrow(/cannot mix object inputs/i)
})
