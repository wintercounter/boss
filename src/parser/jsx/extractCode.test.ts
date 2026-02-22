import { expect, test } from 'vitest'
import { extractCode } from './extractCode'

test('extractCode - single block', () => {
    expect(extractCode(`<div><$$ width={x < 1} child={{'& .child': [foo]}} /></div>`)).toStrictEqual([
        "<$$ width={x < 1} child={{'& .child': [foo]}} />",
    ])
})

test('extractCode - multiple blocks', () => {
    expect(
        extractCode(`<div><$$ width={100} child={{'& .child': [foo]}} /></div><div><$$ foo="bar" /></div>`),
    ).toStrictEqual(["<$$ width={100} child={{'& .child': [foo]}} />", '<$$ foo="bar" />'])
})

test('extractCode - handles unexpected closing tag: >', () => {
    expect(extractCode(`<$$ width={x > 1} />`)).toStrictEqual(['<$$ width={x > 1} />'])
})

test('extractCode - handles nested braces in jsx expressions', () => {
    expect(extractCode(`<$$ width={{ value: 'x' }} />`)).toStrictEqual([`<$$ width={{ value: 'x' }} />`])
})

test('extractCode - handles unexpected closing tag: "', () => {
    expect(extractCode(`<$$ width={"my \\" text"} />`)).toStrictEqual([`<$$ width={"my \\" text"} />`])
})

test('extractCode - handles multiple blocks with unexpected closing tag: "', () => {
    expect(extractCode(`<$$ width={"my \\" text"} /><$$ width={"my \\" text"} />`)).toStrictEqual([
        `<$$ width={"my \\" text"} />`,
        `<$$ width={"my \\" text"} />`,
    ])
})

test('extractCode - prepared assignment', () => {
    expect(extractCode(`$$.Foo = $$.$({ color: 'white' })`)).toStrictEqual(["$$.Foo = $$.$({ color: 'white' })"])
})

test('extractCode - prepared assignment - nested stuff', () => {
    expect(
        extractCode(`$$.Foo = $$.$({ mobile: {
        color: 'white',
        margin: [1,2,3,4]
    } })`),
    ).toStrictEqual([
        `$$.Foo = $$.$({ mobile: {
        color: 'white',
        margin: [1,2,3,4]
    } })`,
    ])
})

test('extractCode - prepared assignment - function call', () => {
    expect(extractCode(`$$.Foo = $$.$({ color: 'white' })`)).toStrictEqual(["$$.Foo = $$.$({ color: 'white' })"])
})

test('extractCode - function call', () => {
    expect(extractCode(`$$.$({ color: 'white' })`)).toStrictEqual(["$$.$({ color: 'white' })"])
})

test('extractCode - keeps className value when it contains -> inside single quotes', () => {
    const input = `<$$
  as="a"
  className="before:content:'' hover:before:content:'->' background-color:red"
  hover={{ color: 'green' }}
>`
    const expected = `<$$
  as="a"
  className="before:content:'' hover:before:content:'->' background-color:red"
  hover={{ color: 'green' }}
>`

    expect(extractCode(input)).toStrictEqual([expected])
})

test('extractCode - keeps parsing later blocks after a className token with ->', () => {
    const first = `<$$ className="hover:before:content:'->'" hover={{ color: 'green' }} />`
    const second = `<$$ hover={{ padding: [20, 0] }} />`

    expect(extractCode(`${first}${second}`)).toStrictEqual([first, second])
})

test('extractCode - keeps className value with > when className is wrapped in JSX expression', () => {
    const input = `<$$ className={'before:content:\\">\\\" hover:before:content:\\">\\\"'} hover={{ color: 'green' }} />`

    expect(extractCode(input)).toStrictEqual([input])
})
