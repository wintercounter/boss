const map: { [key: string]: string } = {
    '<': '>',
    '{': '}',
    '[': ']',
    '(': ')',
    '"': '"',
    '`': '`',
    "'": "'",
}

const openingRegexp = new RegExp(
    `[${Object.keys(map)
        .map(k => `\\${k}`)
        .join('')}]`,
)

const ignoredContexts: { [key: string]: boolean } = {
    '{': true,
    '"': true,
    "'": true,
    '`': true,
}

const assignmentRegexp = /^\$\$\.[A-Z]\w*\s*=\s*\$\$\.\$\s*\(/

const isAssignment = (code: string, i: number) => {
    // We only check the next 120 characters, should be enough
    return assignmentRegexp.test(code.substring(i, i + 120))
}

export function extractCode(code: string) {
    const results: string[] = []
    const stack: string[] = []
    let isInside = false
    let blockStart = -1
    let currentOpener: string = ''
    let isIgnored = false
    let type: 'jsx' | 'assignment' | 'function' | null = null
    let assignmentStarted = false

    for (let i = 0; i < code.length; i++) {
        const current = code[i]

        if (!isInside) {
            // JSX component
            if (current === '<' && code[i + 1] === '$' && code[i + 2] === '$') {
                isInside = true
                type = 'jsx'
                blockStart = i
            }
            // Prepared component assignment
            else if (current === '$' && code[i + 1] === '$' && code[i + 2] === '.' && isAssignment(code, i)) {
                isInside = true
                type = 'assignment'
                blockStart = i
            }
            // Function call
            else if (
                current === '$' &&
                code[i + 1] === '$' &&
                code[i + 2] === '.' &&
                code[i + 3] === '$' &&
                code[i + 4] === '('
            ) {
                isInside = true
                type = 'function'
                blockStart = i
            }
        }

        if (!isInside) continue

        if (type === 'jsx') {
            const openedCurrentContext = !isIgnored && openingRegexp.test(current)
            if (openedCurrentContext) {
                stack.push(current)
                currentOpener = current
                isIgnored = Boolean(ignoredContexts[current])
            }

            if (!openedCurrentContext && current === map[currentOpener]) {
                stack.pop()
                currentOpener = stack.at(-1) || ''
                isIgnored = false
            }

            if (stack.length === 0) {
                isInside = false
                results.push(code.slice(blockStart, i + 1))
                blockStart = -1
                type = null
            }
        } else if (type === 'assignment') {
            if (current === '{' || current === '(') {
                stack.push(current)
                assignmentStarted = true
            }

            if (current === '}' || current === ')') {
                stack.pop()
            }

            if (stack.length === 0 && assignmentStarted) {
                isInside = false
                results.push(code.slice(blockStart, i + 1))
                blockStart = -1
                type = null
                assignmentStarted = false
            }
        } else if (type === 'function') {
            if (current === '(') {
                stack.push(current)
                assignmentStarted = true
            }

            if (current === ')') {
                stack.pop()
            }

            if (stack.length === 0 && assignmentStarted) {
                isInside = false
                results.push(code.slice(blockStart, i + 1))
                blockStart = -1
                type = null
                assignmentStarted = false
            }
        }
    }

    return results
}
