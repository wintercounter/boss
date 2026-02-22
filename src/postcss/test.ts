import path from 'node:path'
import fs from 'node:fs/promises'
import os from 'node:os'

import { describe, expect, it } from 'vitest'
import postcss from 'postcss'

import bossPostcss from '@/postcss'

const createTempDir = async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'boss-postcss-'))
    return dir
}

describe('postcss', () => {
    it('keeps onBoot css across runs', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'boot-css',
    onBoot(api) {
      api.css.addImport('https://example.com/reset.css')
      api.css.addRule('body { margin: 0 }')
    }
  }, {
    name: 'classname-only',
    onBoot(api) {
      api.strategy = 'classname-only'
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const processor = postcss([bossPostcss({ baseDir: root })])

        let first
        let second
        first = await processor.process('', { from: stylesheetPath })
        second = await processor.process('', { from: stylesheetPath })

        expect(first.css).toContain('@import url(\"https://example.com/reset.css\");')
        expect(first.css).toContain('body { margin: 0 }')
        expect(second.css).toContain('@import url(\"https://example.com/reset.css\");')
        expect(second.css).toContain('body { margin: 0 }')
    })

    it('preserves onBoot css while updating file-specific rules', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'boot-css',
    onBoot(api) {
      api.css.addImport('https://example.com/fonts.css')
      api.css.addRule('body { margin: 0 }')
    }
  }, {
    name: 'content-css',
    onParse(api, input) {
      const content = input?.content || ''
      if (content.includes('red')) {
        api.css.addRule('.red { color: red }')
      }
      if (content.includes('blue')) {
        api.css.addRule('.blue { color: blue }')
      }
    }
  }, {
    name: 'classname-only',
    onBoot(api) {
      api.strategy = 'classname-only'
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const sourceFile = path.join(root, 'src', 'app.tsx')
        await fs.writeFile(sourceFile, 'red', 'utf8')

        const processor = postcss([bossPostcss({ baseDir: root })])

        const first = await processor.process('', { from: stylesheetPath })
        expect(first.css).toContain('@import url(\"https://example.com/fonts.css\");')
        expect(first.css).toContain('body { margin: 0 }')
        expect(first.css).toContain('.red { color: red }')

        await fs.writeFile(sourceFile, 'blue', 'utf8')
        const second = await processor.process('', { from: stylesheetPath })
        expect(second.css).toContain('@import url(\"https://example.com/fonts.css\");')
        expect(second.css).toContain('body { margin: 0 }')
        expect(second.css).toContain('.blue { color: blue }')
        expect(second.css).not.toContain('.red { color: red }')

        await fs.unlink(sourceFile)
        const third = await processor.process('', { from: stylesheetPath })
        expect(third.css).toContain('@import url(\"https://example.com/fonts.css\");')
        expect(third.css).toContain('body { margin: 0 }')
        expect(third.css).not.toContain('.blue { color: blue }')
    })

    it('updates custom css blocks across changes and removals', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'custom-css',
    onParse(api, input) {
      const content = input?.content || ''
      const marker = '$$.css\`'
      const start = content.indexOf(marker)
      if (start === -1) {
        api.css.syncCustomBlocks(input.path, [])
        return
      }
      const end = content.indexOf('\`', start + marker.length)
      const cssText = end === -1 ? '' : content.slice(start + marker.length, end)
      api.css.syncCustomBlocks(input.path, [{ start, end: end === -1 ? start : end + 1, cssText }])
    }
  }, {
    name: 'classname-only',
    onBoot(api) {
      api.strategy = 'classname-only'
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const sourceFile = path.join(root, 'src', 'app.tsx')
        await fs.writeFile(sourceFile, '$$.css`body { background: red }`', 'utf8')

        const processor = postcss([bossPostcss({ baseDir: root })])

        const first = await processor.process('', { from: stylesheetPath })
        expect(first.css).toContain('body { background: red }')

        await fs.writeFile(sourceFile, '$$.css`body { background: blue }`', 'utf8')
        const second = await processor.process('', { from: stylesheetPath })
        expect(second.css).toContain('body { background: blue }')
        expect(second.css).not.toContain('body { background: red }')

        await fs.writeFile(sourceFile, 'export const App = () => null', 'utf8')
        const third = await processor.process('', { from: stylesheetPath })
        expect(third.css).not.toContain('body { background: blue }')
    })

    it('reflects boundary file additions and removals between runs', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src', 'area'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'content-css',
    onParse(api, input) {
      const content = input?.content || ''
      if (content.includes('area-rule')) {
        api.css.addRule('.area { color: red }')
      }
    }
  }, {
    name: 'classname-only',
    onBoot(api) {
      api.strategy = 'classname-only'
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const sourceFile = path.join(root, 'src', 'area', 'page.tsx')
        await fs.writeFile(sourceFile, 'area-rule', 'utf8')

        const processor = postcss([bossPostcss({ baseDir: root })])

        const baseline = await processor.process('', { from: stylesheetPath })
        expect(baseline.css).toContain('.area { color: red }')

        const boundaryPath = path.join(root, 'src', 'area', 'area.boss.css')
        await fs.writeFile(boundaryPath, '', 'utf8')

        const withBoundaryGlobal = await processor.process('', { from: stylesheetPath })
        expect(withBoundaryGlobal.css).not.toContain('.area { color: red }')

        const withBoundaryLocal = await processor.process('', { from: boundaryPath })
        expect(withBoundaryLocal.css).toContain('.area { color: red }')

        await fs.unlink(boundaryPath)

        const afterRemoval = await processor.process('', { from: stylesheetPath })
        expect(afterRemoval.css).toContain('.area { color: red }')
    })

    it('warns when onParse throws for a changed file', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'throws-on-parse',
    onParse() {
      throw new Error('bad parse from test')
    }
  }, {
    name: 'classname-only',
    onBoot(api) {
      api.strategy = 'classname-only'
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const sourceFile = path.join(root, 'src', 'app.tsx')
        await fs.writeFile(sourceFile, 'export const App = () => null', 'utf8')

        const processor = postcss([bossPostcss({ baseDir: root })])
        const processed = await processor.process('', { from: stylesheetPath })
        const warnings = processed.warnings().map(warning => warning.text)

        expect(warnings.some(warning => warning.includes('[boss-css] Failed parsing'))).toBe(true)
        expect(warnings.some(warning => warning.includes('bad parse from test'))).toBe(true)
        expect(warnings.some(warning => warning.includes('src/app.tsx'))).toBe(true)
    })

    it('waits for runtime writes before resolving postcss', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')
        const indexPath = path.join(configDir, 'index.js')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'runtime-output',
    onBoot(api) {
      api.file.js.set('body', 'runtime-ready', 'export const runtimeReady = true')
    },
    onReady(api) {
      const originalWrite = api.file.js.write.bind(api.file.js)
      api.file.js.write = async () => {
        await new Promise(resolve => setTimeout(resolve, 120))
        await originalWrite()
      }
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const sourceFile = path.join(root, 'src', 'app.tsx')
        await fs.writeFile(sourceFile, 'export const App = () => null', 'utf8')

        const processor = postcss([bossPostcss({ baseDir: root })])
        const start = Date.now()
        await processor.process('', { from: stylesheetPath })
        const durationMs = Date.now() - start
        const runtime = await fs.readFile(indexPath, 'utf8')

        expect(durationMs).toBeGreaterThanOrEqual(100)
        expect(runtime).toContain('runtimeReady = true')
    })

    it('emits onSession for postcss runs', async () => {
        const root = await createTempDir()
        const configDir = path.join(root, '.bo$$')
        const stylesheetPath = path.join(configDir, 'styles.css')

        await fs.mkdir(configDir, { recursive: true })
        await fs.mkdir(path.join(root, 'src'), { recursive: true })
        await fs.writeFile(stylesheetPath, '', 'utf8')

        ;(globalThis as any).__bossSessions = []

        const configPath = path.join(configDir, 'config.js')
        const contentPattern = JSON.stringify([path.join(root, 'src/**/*.{ts,tsx}')])
        await fs.writeFile(
            configPath,
            `
module.exports = {
  folder: '.bo$$',
  configDir: '.bo$$',
  plugins: [{
    name: 'session-spy',
    onSession(_api, session) {
      globalThis.__bossSessions = globalThis.__bossSessions || []
      globalThis.__bossSessions.push(session)
    }
  }, {
    name: 'classname-only',
    onBoot(api) {
      api.strategy = 'classname-only'
    }
  }],
  content: ${contentPattern},
}
`,
            'utf8',
        )

        const sourceFile = path.join(root, 'src', 'app.tsx')
        await fs.writeFile(sourceFile, 'export const App = () => null', 'utf8')

        const processor = postcss([bossPostcss({ baseDir: root })])
        await processor.process('', { from: stylesheetPath })

        const sessions = (globalThis as any).__bossSessions as Array<{ kind: string; phase: string }>
        const postcssPhases = sessions
            .filter(entry => entry.kind === 'postcss')
            .map(entry => entry.phase)

        expect(postcssPhases).toContain('start')
        expect(postcssPhases).toContain('run')
    })
})
