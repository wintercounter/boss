import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(__dirname, '..')
const templatesDir = path.join(rootDir, 'website/src/components/Playground/templates')
const registryPath = path.join(templatesDir, 'index.js')
const rootPackagePath = path.join(rootDir, 'package.json')

const run = (command, args, options) =>
    new Promise((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit', ...options })
        child.on('error', reject)
        child.on('exit', code => {
            if (code === 0) resolve()
            else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
        })
    })

const getBossVersion = async () => {
    const raw = await fs.readFile(rootPackagePath, 'utf8')
    const pkg = JSON.parse(raw)
    return pkg?.version || '0.0.0'
}

const listTemplateDirs = async () => {
    const entries = await fs.readdir(templatesDir, { withFileTypes: true })
    return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => name !== '.DS_Store')
}

const readJsonSafe = async filePath => {
    try {
        const raw = await fs.readFile(filePath, 'utf8')
        return JSON.parse(raw)
    } catch (error) {
        return {}
    }
}

const collectFiles = async (dir, base = '') => {
    const entries = await fs.readdir(dir, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
        if (entry.name === '.DS_Store') continue
        if (entry.name === 'meta.json') continue
        const rel = base ? `${base}/${entry.name}` : entry.name
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            const nested = await collectFiles(full, rel)
            files.push(...nested)
        } else {
            const content = await fs.readFile(full, 'utf8')
            files.push({ path: rel, content })
        }
    }
    return files
}

const escapeTemplate = value =>
    value.replace(/`/g, '\\`').replace(/\\\$\{/g, '\\\${').replace(/\$\{/g, '\\${')

const generateRegistry = async () => {
    const templateNames = await listTemplateDirs()
    const templates = []

    for (const name of templateNames) {
        const templatePath = path.join(templatesDir, name)
        const meta = await readJsonSafe(path.join(templatePath, 'meta.json'))
        const files = await collectFiles(templatePath)
        templates.push({
            id: name,
            label: meta.label || name,
            description: meta.description || '',
            openFile: meta.openFile || '',
            init: meta.init || null,
            dev: meta.dev || null,
            install: meta.install || null,
            files,
        })
    }

    const lines = []
    lines.push("import bossPackage from '../../../../../package.json'\n")
    lines.push('const BOSS_VERSION = bossPackage?.version || \'0.0.0\'\n')
    lines.push('const withBossVersion = value =>')
    lines.push("    typeof value === 'string' ? value.replaceAll('__BOSS_VERSION__', BOSS_VERSION) : ''\n")
    lines.push('const templates = [')

    templates.forEach((template, index) => {
        lines.push('    {')
        lines.push(`        id: '${template.id}',`)
        lines.push(`        label: '${template.label.replace(/'/g, "\\'")}',`)
        lines.push(`        description: '${template.description.replace(/'/g, "\\'")}',`)
        if (template.openFile) {
            lines.push(`        openFile: '${template.openFile.replace(/'/g, "\\'")}',`)
        }
        if (template.init) {
            lines.push(`        init: ${JSON.stringify(template.init)},`)
        }
        if (template.dev) {
            lines.push(`        dev: ${JSON.stringify(template.dev)},`)
        }
        if (template.install) {
            lines.push(`        install: ${JSON.stringify(template.install)},`)
        }
        lines.push('        files: {')

        const sorted = [...template.files].sort((a, b) => a.path.localeCompare(b.path))
        sorted.forEach(file => {
            const content = escapeTemplate(file.content)
            const needsVersion = file.path === 'package.json'
            const value = needsVersion ? `withBossVersion(\`${content}\`)` : `\`${content}\``
            lines.push(`            '${file.path}': ${value},`)
        })

        lines.push('        },')
        lines.push('    }' + (index === templates.length - 1 ? '' : ','))
    })

    lines.push(']')
    lines.push('\nexport { templates, BOSS_VERSION }\n')

    await fs.writeFile(registryPath, lines.join('\n'))
}

const getPnpmCommand = () => {
    const version = process.env.PNPM_VERSION || '8.15.6'
    if (!version) {
        return { command: 'pnpm', args: [] }
    }
    return { command: 'npx', args: [`pnpm@${version}`] }
}

const updateTemplateLock = async (templateName, bossVersion) => {
    const templatePath = path.join(templatesDir, templateName)
    const packagePath = path.join(templatePath, 'package.json')
    const lockPath = path.join(templatePath, 'pnpm-lock.yaml')

    let packageJson = await fs.readFile(packagePath, 'utf8')
    packageJson = packageJson.replaceAll('__BOSS_VERSION__', bossVersion)

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), `boss-template-${templateName}-`))
    try {
        await fs.writeFile(path.join(tempDir, 'package.json'), packageJson)
        const pnpm = getPnpmCommand()
        await run(pnpm.command, [...pnpm.args, 'install'], { cwd: tempDir })
        const lockText = await fs.readFile(path.join(tempDir, 'pnpm-lock.yaml'), 'utf8')
        await fs.writeFile(lockPath, lockText)
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true })
    }
}

const main = async () => {
    const bossVersion = await getBossVersion()
    const templates = await listTemplateDirs()
    const shouldSkipLocks = process.argv.includes('--skip-locks')

    if (!templates.length) {
        throw new Error('No playground templates found.')
    }

    if (!shouldSkipLocks) {
        for (const template of templates) {
            await updateTemplateLock(template, bossVersion)
        }
    }

    await generateRegistry()
}

main().catch(error => {
    console.error(error)
    process.exit(1)
})
