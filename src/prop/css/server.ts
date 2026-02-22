// @ts-ignore
import { listAll } from '@webref/css'
import { DictionaryItem } from '@/shared/types'
import getDtsTemplate from '@/prop/css/getDtsTemplate.js'
import type { Plugin } from '@/types'

export const name = 'css'

export const dependencies = new Set(['css'])

export const onBoot: Plugin<'onBoot'> = async api => {
    const [typeObject, typeTemplate] = (await getDtsTemplate()) as [
        Record<string, { description?: string; types?: string[]; iface?: string }>,
        Array<[string | null, string]>,
    ]

    // Add the props to $$FinalProps
    api.file.js.dts.replace('body', `$$:FinalProps`, v => `${v} & StandardProperties`)

    // Generate initial d.ts file
    typeTemplate.forEach(entry => {
        api.file.js.dts.set('body', ...entry)
    })

    // Generate dictionary using csstype
    for (const [name, descriptor] of Object.entries(typeObject)) {
        const item: DictionaryItem = {
            property: api.camelCaseToDash(name),
            description: descriptor.description ?? '',
            values: descriptor.types ?? [],
            initial: '',
            csstype: descriptor,
            isCSSProp: true,
            aliases: [name],
            single: false,
            descriptor,
        }
        if (descriptor.iface?.endsWith('Hyphen')) {
            item.property = name
        }
        api.dictionary.set(name, item)
        dependencies.add(name)
    }

    // Generate dictionary using webref
    const parsedFiles = (await listAll()) as Record<string, any> | null
    const propertyList = Array.isArray(parsedFiles?.properties)
        ? parsedFiles.properties
        : Object.values(parsedFiles ?? {}).flatMap(entry => entry?.properties ?? [])

    for (const property of propertyList) {
        if (!property?.styleDeclaration) continue
        const { styleDeclaration } = property

        const existing = api.dictionary.get(styleDeclaration[0])
        const existingAliases = existing?.aliases ?? []
        const existingDescription = existing?.description ?? ''
        const existingUsage = existing?.usage

        const rawValues = Array.isArray(property.value) ? property.value : property.value ? [property.value] : []
        const item: DictionaryItem = {
            description: `${existingDescription ? `${existingDescription}\n` : ''}\n\n**Webref definition**\n\n\`\`\`json\n${JSON.stringify(property, null, 2).replace(/\*\//g, '\\*\\/')}\n\`\`\``,
            usage: existingUsage || (property.value as string | undefined),
            descriptor: property,
            property: styleDeclaration[0],
            aliases: [...new Set([...styleDeclaration, ...existingAliases])],
            values: rawValues as string[],
            initial: existing?.initial ?? '',
            isCSSProp: true,
            single: false,
        }

        api.dictionary.set(item.property, item)

        item.aliases.forEach(prop => dependencies.add(prop))
    }

    // Set initial description
    const missingProps: Array<[string, DictionaryItem]> = []
    for (const key of dependencies) {
        const prop = api.dictionary.get(key)
        if (!prop) continue

        const templateKey = `css:${key}:description`

        if (api.file.js.dts.get('body').has(templateKey)) {
            api.file.js.dts.set('body', templateKey, prop.description)
        } else {
            missingProps.push([key, prop])
        }
    }

    api.file.js.dts.set('body', `css:MissingPropsInterfaceStart`, `export interface $$CSSMissingProps {`)

    for (const [key, prop] of missingProps) {
        api.file.js.dts
            .set('body', `css:${key}:description`, prop.description)
            .set('body', `css:${key}:declaration`, `  "${key}"?: $$PropValues | undefined\n`)
    }

    api.file.js.dts.set('body', `css:MissingPropsInterfaceEnd`, `}`)
}

export const onProp: Plugin<'onProp'> = async (api, { name, prop, contexts, preferVariables }) => {
    const { value, selectorValue = value, classToken, important } = prop
    const descriptor = api.dictionary.get(name)
    const propertyName = descriptor?.property ?? api.camelCaseToDash(name)
    const selectorName = prop.selectorName ?? name

    if (name === 'container' && value && typeof value === 'object' && !Array.isArray(value)) {
        return
    }

    if (!contexts.length) {
        const selector = classToken ? api.classTokenToSelector(classToken) : null
        api.css.selector({
            className: selector
                ? null
                : api.contextToClassName(selectorName, selectorValue, contexts, true, api.selectorPrefix),
            selector,
        })
    }

    const needsImportant = api.strategy === 'inline-first' && preferVariables === true && contexts.length > 0
    const isImportant = Boolean(important || needsImportant)
    api.css.rule(
        propertyName,
        value === null ? `var(${api.contextToCSSVariable(name, value, contexts, api.selectorPrefix)})` : value,
        isImportant ? { important: true } : undefined,
    )

    if (!contexts.length) {
        api.css.write()
    }
}
