// file: ./vitest.config.ts
import { defineConfig } from 'vitest/config'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
    plugins: [tsconfigPaths()],
    test: {
        alias: {
            '@/': new URL('./src/', import.meta.url).pathname,
        },
        include: ['src/**/{test,*.test}.{js,mjs,cjs,ts,jsx,tsx}', 'src/**/test/*.{js,mjs,cjs,ts,jsx,tsx}'],
        watchExclude: ['**/node_modules/**', '**/dist/**'],
        setupFiles: ['./src/test-setup.ts'],
        reporters: [
            'default',
            {
                async onWatcherRerun() {},
            },
        ],
    },
})
