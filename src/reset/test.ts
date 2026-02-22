import { describe, expect } from 'vitest'
import * as resetServer from '@/reset/server'

describe('reset', () => {
    test('injects reset css when enabled', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [resetServer],
        })

        expect(api.css.text).toContain('@layer reset')
        expect(api.css.text).toContain('Modern CSS Reset')
    })

    test('does not inject reset css by default in tests', async ({ $ }) => {
        const api = await $.createServerApi({
            plugins: [...$.essentialsServer],
        })

        expect(api.css.text).not.toContain('@layer reset')
    })
})
