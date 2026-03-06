export const getSourceCode = context => {
    if (typeof context?.getSourceCode === 'function') {
        return context.getSourceCode()
    }

    return context?.sourceCode ?? null
}
