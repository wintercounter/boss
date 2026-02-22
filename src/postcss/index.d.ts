export type BossPostcssOptions = {
    /**
     * Emit dir-dependency messages for file watchers.
     * Defaults to true unless a Turbopack env flag is set (TURBOPACK or __NEXT_TURBOPACK).
     */
    dirDependencies?: boolean
    /**
     * Base directory for locating the boss config.
     */
    baseDir?: string
}

export default function postcssPlugin(options?: BossPostcssOptions): {
    postcssPlugin: string
    plugins: Array<(root: unknown, result: { opts?: Record<string, unknown>; messages?: unknown[] }) => Promise<void>>
}
