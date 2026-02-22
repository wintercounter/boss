import { describe, expect, test } from 'vitest'
import { createClassNameMapper, type ClassNameMapper } from '@/compile/classname-strategy'
import { rewriteClassNameTokensInText } from '@/compile/classname'

const rewriteText = (input: string, mapper: ClassNameMapper) => rewriteClassNameTokensInText(input, {
    mapToken: token => mapper.get(token)
})

describe('classNameStrategy language snippets', () => {
    describe('HTML', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "<div class=\"color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "<div class=\"color:red padding:8\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0} ${token_1}"></div>`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "<div class=\"display:flex!\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "<div class=\"hover:{text-decoration:underline;color:red}\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0} ${token_1}"></div>`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "<div class=\"hover:{color:red}\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "<div class=\"color:$$.token.color.white\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "<div class=\"[&>span]:color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "<div class=\"hover:focus:color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "<div class=\"hover:bg-gray-100 color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="hover:bg-gray-100 ${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "<div class=\"block\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `<div class="block"></div>`
            expect(output).toBe(expected)
        })

    })

    describe('CSS', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = ".card::before{content:\"color:red\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0}";}`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = ".card::before{content:\"color:red padding:8\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0} ${token_1}";}`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = ".card::before{content:\"display:flex!\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0}";}`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = ".card::before{content:\"hover:{text-decoration:underline;color:red}\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0} ${token_1}";}`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = ".card::before{content:\"hover:{color:red}\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0}";}`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = ".card::before{content:\"color:$$.token.color.white\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0}";}`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = ".card::before{content:\"[&>span]:color:red\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0}";}`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = ".card::before{content:\"hover:focus:color:red\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"${token_0}";}`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = ".card::before{content:\"hover:bg-gray-100 color:red\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"hover:bg-gray-100 ${token_0}";}`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = ".card::before{content:\"block\";}"
            const output = rewriteText(input, mapper)
            const expected = `.card::before{content:"block";}`
            expect(output).toBe(expected)
        })

    })

    describe('JavaScript', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const className = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "const className = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "const className = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "const className = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "const className = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "const className = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "const className = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "const className = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const className = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "const className = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `const className = "block";`
            expect(output).toBe(expected)
        })

    })

    describe('TypeScript', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const className: string = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "const className: string = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "const className: string = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "const className: string = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "const className: string = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "const className: string = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "const className: string = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "const className: string = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const className: string = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "const className: string = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `const className: string = "block";`
            expect(output).toBe(expected)
        })

    })

    describe('JSX', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const node = <div className=\"color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "const node = <div className=\"color:red padding:8\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0} ${token_1}" />;`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "const node = <div className=\"display:flex!\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "const node = <div className=\"hover:{text-decoration:underline;color:red}\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0} ${token_1}" />;`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "const node = <div className=\"hover:{color:red}\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "const node = <div className=\"color:$$.token.color.white\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "const node = <div className=\"[&>span]:color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "const node = <div className=\"hover:focus:color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const node = <div className=\"hover:bg-gray-100 color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="hover:bg-gray-100 ${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "const node = <div className=\"block\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node = <div className="block" />;`
            expect(output).toBe(expected)
        })

    })

    describe('TSX', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const node: JSX.Element = <div className=\"color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "const node: JSX.Element = <div className=\"color:red padding:8\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0} ${token_1}" />;`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "const node: JSX.Element = <div className=\"display:flex!\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "const node: JSX.Element = <div className=\"hover:{text-decoration:underline;color:red}\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0} ${token_1}" />;`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "const node: JSX.Element = <div className=\"hover:{color:red}\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "const node: JSX.Element = <div className=\"color:$$.token.color.white\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "const node: JSX.Element = <div className=\"[&>span]:color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "const node: JSX.Element = <div className=\"hover:focus:color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "const node: JSX.Element = <div className=\"hover:bg-gray-100 color:red\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="hover:bg-gray-100 ${token_0}" />;`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "const node: JSX.Element = <div className=\"block\" />;"
            const output = rewriteText(input, mapper)
            const expected = `const node: JSX.Element = <div className="block" />;`
            expect(output).toBe(expected)
        })

    })

    describe('JSON', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "{\"className\":\"color:red\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0}"}`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "{\"className\":\"color:red padding:8\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0} ${token_1}"}`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "{\"className\":\"display:flex!\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0}"}`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "{\"className\":\"hover:{text-decoration:underline;color:red}\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0} ${token_1}"}`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "{\"className\":\"hover:{color:red}\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0}"}`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "{\"className\":\"color:$$.token.color.white\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0}"}`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "{\"className\":\"[&>span]:color:red\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0}"}`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "{\"className\":\"hover:focus:color:red\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"${token_0}"}`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "{\"className\":\"hover:bg-gray-100 color:red\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"hover:bg-gray-100 ${token_0}"}`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "{\"className\":\"block\"}"
            const output = rewriteText(input, mapper)
            const expected = `{"className":"block"}`
            expect(output).toBe(expected)
        })

    })

    describe('YAML', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "className: \"color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0}"`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "className: \"color:red padding:8\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "className: \"display:flex!\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0}"`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "className: \"hover:{text-decoration:underline;color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "className: \"hover:{color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0}"`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "className: \"color:$$.token.color.white\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0}"`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "className: \"[&>span]:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0}"`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "className: \"hover:focus:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className: "${token_0}"`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "className: \"hover:bg-gray-100 color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className: "hover:bg-gray-100 ${token_0}"`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "className: \"block\""
            const output = rewriteText(input, mapper)
            const expected = `className: "block"`
            expect(output).toBe(expected)
        })

    })

    describe('Markdown', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "- <div class=\"color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "- <div class=\"color:red padding:8\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0} ${token_1}"></div>`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "- <div class=\"display:flex!\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "- <div class=\"hover:{text-decoration:underline;color:red}\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0} ${token_1}"></div>`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "- <div class=\"hover:{color:red}\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "- <div class=\"color:$$.token.color.white\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "- <div class=\"[&>span]:color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "- <div class=\"hover:focus:color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "- <div class=\"hover:bg-gray-100 color:red\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="hover:bg-gray-100 ${token_0}"></div>`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "- <div class=\"block\"></div>"
            const output = rewriteText(input, mapper)
            const expected = `- <div class="block"></div>`
            expect(output).toBe(expected)
        })

    })

    describe('MDX', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "<div className=\"color:red\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0}" />`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "<div className=\"color:red padding:8\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0} ${token_1}" />`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "<div className=\"display:flex!\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0}" />`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "<div className=\"hover:{text-decoration:underline;color:red}\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0} ${token_1}" />`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "<div className=\"hover:{color:red}\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0}" />`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "<div className=\"color:$$.token.color.white\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0}" />`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "<div className=\"[&>span]:color:red\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0}" />`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "<div className=\"hover:focus:color:red\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="${token_0}" />`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "<div className=\"hover:bg-gray-100 color:red\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="hover:bg-gray-100 ${token_0}" />`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "<div className=\"block\" />"
            const output = rewriteText(input, mapper)
            const expected = `<div className="block" />`
            expect(output).toBe(expected)
        })

    })

    describe('SQL', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "SELECT 'color:red' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "SELECT 'color:red padding:8' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0} ${token_1}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "SELECT 'display:flex!' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "SELECT 'hover:{text-decoration:underline;color:red}' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0} ${token_1}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "SELECT 'hover:{color:red}' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "SELECT 'color:$$.token.color.white' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "SELECT '[&>span]:color:red' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "SELECT 'hover:focus:color:red' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT '${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "SELECT 'hover:bg-gray-100 color:red' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT 'hover:bg-gray-100 ${token_0}' AS class_name;`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "SELECT 'block' AS class_name;"
            const output = rewriteText(input, mapper)
            const expected = `SELECT 'block' AS class_name;`
            expect(output).toBe(expected)
        })

    })

    describe('PHP', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "$className = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "$className = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "$className = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "$className = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "$className = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "$className = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "$className = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "$className = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "$className = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "$className = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `$className = "block";`
            expect(output).toBe(expected)
        })

    })

    describe('Python', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "class_name = \"color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "class_name = \"color:red padding:8\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "class_name = \"display:flex!\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "class_name = \"hover:{text-decoration:underline;color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "class_name = \"hover:{color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "class_name = \"color:$$.token.color.white\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "class_name = \"[&>span]:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "class_name = \"hover:focus:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "class_name = \"hover:bg-gray-100 color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "hover:bg-gray-100 ${token_0}"`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "class_name = \"block\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "block"`
            expect(output).toBe(expected)
        })

    })

    describe('Ruby', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "class_name = \"color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "class_name = \"color:red padding:8\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "class_name = \"display:flex!\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "class_name = \"hover:{text-decoration:underline;color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "class_name = \"hover:{color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "class_name = \"color:$$.token.color.white\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "class_name = \"[&>span]:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "class_name = \"hover:focus:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "class_name = \"hover:bg-gray-100 color:red\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "hover:bg-gray-100 ${token_0}"`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "class_name = \"block\""
            const output = rewriteText(input, mapper)
            const expected = `class_name = "block"`
            expect(output).toBe(expected)
        })

    })

    describe('Go', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "className := \"color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0}"`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "className := \"color:red padding:8\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "className := \"display:flex!\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0}"`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "className := \"hover:{text-decoration:underline;color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "className := \"hover:{color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0}"`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "className := \"color:$$.token.color.white\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0}"`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "className := \"[&>span]:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0}"`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "className := \"hover:focus:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className := "${token_0}"`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "className := \"hover:bg-gray-100 color:red\""
            const output = rewriteText(input, mapper)
            const expected = `className := "hover:bg-gray-100 ${token_0}"`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "className := \"block\""
            const output = rewriteText(input, mapper)
            const expected = `className := "block"`
            expect(output).toBe(expected)
        })

    })

    describe('Java', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "String className = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "String className = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "String className = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "String className = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "String className = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "String className = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "String className = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "String className = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "String className = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "String className = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `String className = "block";`
            expect(output).toBe(expected)
        })

    })

    describe('C#', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "var className = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "var className = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "var className = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "var className = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "var className = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "var className = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "var className = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "var className = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "var className = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "var className = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `var className = "block";`
            expect(output).toBe(expected)
        })

    })

    describe('Kotlin', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "val className = \"color:red\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "val className = \"color:red padding:8\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "val className = \"display:flex!\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "val className = \"hover:{text-decoration:underline;color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0} ${token_1}"`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "val className = \"hover:{color:red}\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "val className = \"color:$$.token.color.white\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "val className = \"[&>span]:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "val className = \"hover:focus:color:red\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "${token_0}"`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "val className = \"hover:bg-gray-100 color:red\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "hover:bg-gray-100 ${token_0}"`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "val className = \"block\""
            const output = rewriteText(input, mapper)
            const expected = `val className = "block"`
            expect(output).toBe(expected)
        })

    })

    describe('Rust', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "let class_name = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "let class_name = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "let class_name = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "let class_name = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "let class_name = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "let class_name = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "let class_name = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "let class_name = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "let class_name = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "let class_name = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `let class_name = "block";`
            expect(output).toBe(expected)
        })

    })

    describe('Dart', () => {
        test('simple', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "final className = \"color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const token_1 = mapper.getOrCreate('padding:8')
            const input = "final className = \"color:red padding:8\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('important', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('display:flex!')
            const input = "final className = \"display:flex!\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('grouped-multi', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const token_1 = mapper.getOrCreate('hover:text-decoration:underline')
            const input = "final className = \"hover:{text-decoration:underline;color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0} ${token_1}";`
            expect(output).toBe(expected)
        })

        test('grouped-single', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:color:red')
            const input = "final className = \"hover:{color:red}\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('token-value', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:white')
            const input = "final className = \"color:$$.token.color.white\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('child-selector', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('[&>span]:color:red')
            const input = "final className = \"[&>span]:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('pseudo-chain', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('hover:focus:color:red')
            const input = "final className = \"hover:focus:color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "${token_0}";`
            expect(output).toBe(expected)
        })

        test('mixed-non-boss', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const token_0 = mapper.getOrCreate('color:red')
            const input = "final className = \"hover:bg-gray-100 color:red\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "hover:bg-gray-100 ${token_0}";`
            expect(output).toBe(expected)
        })

        test('single-word', () => {
            const mapper = createClassNameMapper({ strategy: 'hash', prefix: '' })
            const input = "final className = \"block\";"
            const output = rewriteText(input, mapper)
            const expected = `final className = "block";`
            expect(output).toBe(expected)
        })

    })

})
