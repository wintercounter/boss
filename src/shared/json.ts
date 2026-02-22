const stripTrailingCommas = (input: string) => {
    let output = ''
    let inString = false
    let stringChar = ''
    let escaped = false

    for (let index = 0; index < input.length; index += 1) {
        const char = input[index]

        if (inString) {
            output += char
            if (escaped) {
                escaped = false
                continue
            }
            if (char === '\\') {
                escaped = true
                continue
            }
            if (char === stringChar) {
                inString = false
                stringChar = ''
            }
            continue
        }

        if (char === '"' || char === "'") {
            inString = true
            stringChar = char
            output += char
            continue
        }

        if (char === ',') {
            let lookahead = index + 1
            while (lookahead < input.length && /\s/.test(input[lookahead])) {
                lookahead += 1
            }
            const nextChar = input[lookahead]
            if (nextChar === '}' || nextChar === ']') {
                continue
            }
        }

        output += char
    }

    return output
}

export const parseJson = <T = unknown>(
    input: string,
    options?: {
        filePath?: string
        allowTrailingCommas?: boolean
    },
): T => {
    try {
        return JSON.parse(input) as T
    } catch (error) {
        if (!options?.allowTrailingCommas) {
            throw error
        }
        const stripped = stripTrailingCommas(input)
        if (stripped !== input) {
            try {
                return JSON.parse(stripped) as T
            } catch {}
        }
        const message = error instanceof Error ? error.message : String(error)
        const fileHint = options?.filePath ? ` in ${options.filePath}` : ''
        throw new Error(`Failed to parse JSON${fileHint}: ${message}`)
    }
}
