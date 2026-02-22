import path from 'node:path'
import fs from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { UserConfig } from '@/shared/types'
import { parseJson } from '@/shared/json'

const defaultConfig = {
    configDir: '.bo$$',
    unit: 'px',
}

export async function loadConfig(baseDir: string = process.cwd()): Promise<UserConfig> {
    const packageJSONPath = path.join(baseDir, 'package.json')
    let packageJSON: Record<string, unknown> = {}
    try {
        packageJSON = parseJson(await fs.readFile(packageJSONPath, 'utf8'), {
            filePath: packageJSONPath,
            allowTrailingCommas: true,
        })
    } catch {
        packageJSON = {}
    }

    const rawPackageConfig = packageJSON['bo$$']
    const packageConfig =
        rawPackageConfig && typeof rawPackageConfig === 'object' ? (rawPackageConfig as Partial<UserConfig>) : {}
    const config = { ...defaultConfig, ...packageConfig }
    const resolvedConfig = await resolveConfigPath(baseDir, config.configDir)

    const userConfig = await loadUserConfig(resolvedConfig.userConfigPath)

    const defaultCompile = { tempOutDir: path.join(resolvedConfig.configDir, 'compiled') }
    const compile = { ...defaultCompile, ...(config.compile ?? {}), ...(userConfig.compile ?? {}) }
    const css = { ...(config.css ?? {}), ...(userConfig.css ?? {}) }
    const runtime = { ...(config.runtime ?? {}), ...(userConfig.runtime ?? {}) }
    const plugins = Array.isArray(userConfig.plugins) ? userConfig.plugins : config.plugins ?? []

    return {
        ...config,
        ...userConfig,
        css,
        compile,
        plugins,
        runtime,
        configDir: resolvedConfig.configDir,
        stylesheetPath: path.join(baseDir, resolvedConfig.configDir, 'styles.css'),
    }
}

async function loadUserConfig(userConfigPath: string) {
    try {
        await fs.access(userConfigPath)
    } catch {
        return {}
    }

    const fileUrl = pathToFileURL(userConfigPath).href
    const module = await import(fileUrl)
    return module.default ?? {}
}

async function resolveConfigPath(baseDir: string, configDir: string) {
    const primary = path.join(baseDir, configDir, 'config.js')
    if (await hasFile(primary)) {
        return { configDir, userConfigPath: primary }
    }

    if (configDir === '.bo$$') {
        const fallback = path.join(baseDir, 'src', '.bo$$', 'config.js')
        if (await hasFile(fallback)) {
            return { configDir: path.join('src', '.bo$$'), userConfigPath: fallback }
        }
    }

    return { configDir, userConfigPath: primary }
}

async function hasFile(filePath: string) {
    try {
        await fs.access(filePath)
        return true
    } catch {
        return false
    }
}

export type { UserConfig } from '@/shared/types'
