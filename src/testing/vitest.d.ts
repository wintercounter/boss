import 'vitest'

declare module 'vitest' {
    interface TestContext {
        $: any
    }
}

declare global {
    var test: typeof import('vitest').test
}
