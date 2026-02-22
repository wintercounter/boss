import { listAll } from '@webref/css'
import fs from 'node:fs/promises'
import { createRequire } from 'node:module'

const now = performance.now()

// Order MUST BE the same as in the source file
const interfaces = [
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

for (const [, data] of Object.entries(parsedFiles)) {
    for (const property of data.properties) {
        const name = property.styleDeclaration?.[0]

        if (name) {
            const cssType = csstypeObject[name]
            //console.log(name, cssType)
            const descriptor = {
                description: cssType?.description || '',
                types: cssType?.types || [],
            }

            Object.assign(props, {
                [property.styleDeclaration[0]]: descriptor,
            })
        }
    }
}

console.log('Done in', (performance.now() - now) / 1000, 's')

await fs.writeFile(
    new URL('../src/prop/css/csstype.json', import.meta.url),
    JSON.stringify({ props, template: csstypeTemplate.join('\n') }, null, 2),
)
