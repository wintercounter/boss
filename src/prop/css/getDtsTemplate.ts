import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

// Order MUST BE the same as in the source file
const baseInterfaces = [
    'StandardLonghandProperties',
    'StandardShorthandProperties',
    'VendorLonghandProperties',
    'VendorShorthandProperties',
    'ObsoleteProperties',
    'SvgProperties',
    'StandardLonghandPropertiesHyphen',
    'StandardShorthandPropertiesHyphen',
    'VendorLonghandPropertiesHyphen',
    'VendorShorthandPropertiesHyphen',
    'ObsoletePropertiesHyphen',
    'SvgPropertiesHyphen',
]

const lcfirst = (str: string) => str.charAt(0).toLowerCase() + str.slice(1)

let cachedTemplate:
    | Promise<[Record<string, { description?: string; types?: string[]; iface?: string | null }>, Array<[string | null, string]>]>
    | null = null

export default async function getDtsTemplate() {
    if (cachedTemplate) return cachedTemplate
    const interfaces = [...baseInterfaces]
    cachedTemplate = (async () => {
        const r = createRequire(process.cwd() + '/package.json')
        const cssTypeFilePath = r.resolve('csstype/index.d.ts')
        const csstype = await fs.readFile(cssTypeFilePath, 'utf-8')
        const csstypeArray = csstype.split('\n')
        const csstypeObject: Record<string, { description?: string; types?: string[]; iface?: string | null }> = {}
        const csstypeTemplate: Array<[string | null, string]> = []

    let iface: string | null = null
    let comment: string[] = []
    const propRegexp = /^ {2}["']?(.+?)["']?\?: ([a-zA-Z. |<>]+);?/

        for (const line of csstypeArray) {
            if (line.includes(`export interface ${interfaces[0]}<`)) {
                iface = interfaces[0]
            csstypeTemplate.push([`css:interface:${iface}:start`, line])
            } else if (iface && line === '}') {
                csstypeTemplate.push([`css:interface:${iface}:end`, line])
                iface = null
                interfaces.shift()
            } else if (iface && (line === '   */' || line.startsWith('   * @see'))) {
                // do nothing
            } else if (iface && (line === '  /**' || line.startsWith('   *'))) {
                comment.push(line.replace(/^   ?\/?\*?\*/g, ''))
            } else if (iface && propRegexp.test(line)) {
                const match = line.match(propRegexp)
                if (!match) continue
                const [, _name, values] = match
                const name = lcfirst(_name)
                csstypeObject[name] = {
                    description: csstypeObject[name]?.description || comment.join('\n'),
                    types:
                        csstypeObject[name]?.types ||
                        values
                            .trim()
                            .split('|')
                            .map(a => a.trim())
                            .filter(a => a),
                    iface,
                }
                csstypeTemplate.push([`css:${name}:description`, ''])
                csstypeTemplate.push([
                    `css:${name}:declaration`,
                    line.replace(/;$/, '').replace(`?: `, () => '?: $$PropValues | '),
                ])
                comment = []
            } else if (csstypeTemplate.at(-1)?.[0] === null) {
                const last = csstypeTemplate.at(-1)
                if (last) last[1] += `\n${line}`
            } else {
                csstypeTemplate.push([null, line])
            }
        }
        return [csstypeObject, csstypeTemplate]
    })()
    return cachedTemplate
}
