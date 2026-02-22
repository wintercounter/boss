import { runPostcss, type BossPostcssOptions } from '@/tasks/postcss'

export type { BossPostcssOptions } from '@/tasks/postcss'

function postcssPlugin(options: BossPostcssOptions = {}) {
    return {
        postcssPlugin: 'boss-postcss-plugin',
        plugins: [
            // @ts-ignore
            async (root, result) => {
                await runPostcss(root, result, options)
            },
        ],
    }
}

postcssPlugin.postcss = true

export default postcssPlugin
