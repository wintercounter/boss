import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

const ROOT = process.cwd()
const POLL_INTERVAL_MS = 1000
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', '.bo$$'])

const shouldIgnore = entry => {
  if (!entry) return true
  if (IGNORE_DIRS.has(entry)) return true
  return entry.startsWith('.bo')
}

const readTree = async dir => {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => [])
  const results = new Map()

  for (const entry of entries) {
    if (shouldIgnore(entry.name)) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = await readTree(fullPath)
      for (const [key, value] of nested) {
        results.set(key, value)
      }
      continue
    }
    if (!entry.isFile()) continue
    const stat = await fs.stat(fullPath).catch(() => null)
    if (!stat) continue
    results.set(fullPath, stat.mtimeMs)
  }
  return results
}

const snapshot = async () => readTree(path.join(ROOT, 'src'))

const hasChanges = (prev, next) => {
  if (prev.size !== next.size) return true
  for (const [file, mtime] of next) {
    if (!prev.has(file) || prev.get(file) !== mtime) return true
  }
  return false
}

const runBuild = () =>
  new Promise(resolve => {
    const child = spawn('pnpm', ['exec', 'boss-css', 'build'], { stdio: 'inherit' })
    child.on('exit', () => resolve())
  })

let running = false
let queued = false

const triggerBuild = async () => {
  if (running) {
    queued = true
    return
  }
  running = true
  await runBuild()
  running = false
  if (queued) {
    queued = false
    triggerBuild()
  }
}

const start = async () => {
  await triggerBuild()
  let last = await snapshot()
  setInterval(async () => {
    const next = await snapshot()
    if (hasChanges(last, next)) {
      last = next
      await triggerBuild()
    }
  }, POLL_INTERVAL_MS)
}

start()
