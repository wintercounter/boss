import type { BossApiBase } from '@/types'

export class NoopCSS {
    api: BossApiBase
    imports = new Set<string>()
    root = new Set<string>()
    rootSources = new Map()
    customBlocks = new Map()
    customByFile = new Map()
    ruleMeta = new Map()
    ruleSources = new Map()
    source = null

    constructor(api: BossApiBase) {
        this.api = api
    }

    get text() {
        return ''
    }

    selector() {}

    rule() {}

    addRoot() {}

    removeSource() {}

    addImport() {}

    addRule() {}

    compareAtRuleOrder() {
        return 0
    }

    write() {}

    reset() {}

    syncCustomBlocks() {}

    getCustomText() {
        return ''
    }
}
