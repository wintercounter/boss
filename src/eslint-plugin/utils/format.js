const escapeString = (value, quote) => {
    let escaped = value.replace(/\\/g, '\\\\')

    if (quote === "'") {
        escaped = escaped.replace(/'/g, "\\'")
    } else {
        escaped = escaped.replace(/"/g, '\\"')
    }

    return escaped.replace(/\r/g, '\\r').replace(/\n/g, '\\n')
}

const escapeTemplate = value => {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/`/g, '\\`')
        .replace(/\$\{/g, '\\${')
}

const buildLiteralReplacement = (node, sourceCode, value) => {
    if (node.type === 'TemplateLiteral') {
        return `\`${escapeTemplate(value)}\``
    }

    const raw = sourceCode.getText(node)
    const quote = raw && (raw[0] === '"' || raw[0] === "'") ? raw[0] : '"'

    return `${quote}${escapeString(value, quote)}${quote}`
}

export { buildLiteralReplacement }
