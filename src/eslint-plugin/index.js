import formatClassnames from '@/eslint-plugin/rules/format-classnames.js'
import noUnknownClasses from '@/eslint-plugin/rules/no-unknown-classes.js'
import propsOnly from '@/eslint-plugin/rules/props-only.js'
import classnamesOnly from '@/eslint-plugin/rules/classnames-only.js'
import preferClassnames from '@/eslint-plugin/rules/prefer-classnames.js'
import requirePropFunctions from '@/eslint-plugin/rules/require-prop-functions.js'
import redundantCx from '@/eslint-plugin/rules/redundant-cx.js'
import preferTokenValues from '@/eslint-plugin/rules/prefer-token-values.js'
import preferUnitlessValues from '@/eslint-plugin/rules/prefer-unitless-values.js'

const plugin = {
    meta: {
        name: 'boss-css',
    },
    rules: {
        [formatClassnames.name]: formatClassnames,
        [noUnknownClasses.name]: noUnknownClasses,
        [propsOnly.name]: propsOnly,
        [classnamesOnly.name]: classnamesOnly,
        [preferClassnames.name]: preferClassnames,
        [requirePropFunctions.name]: requirePropFunctions,
        [redundantCx.name]: redundantCx,
        [preferTokenValues.name]: preferTokenValues,
        [preferUnitlessValues.name]: preferUnitlessValues,
    },
}

const plugins = [plugin.meta.name]

const globalOptions = {
    languageOptions: {
        globals: {
            $$: 'readonly',
        },
    },
}

const createConfig = (name, getRules) => ({
    [`${name}-error`]: {
        plugins,
        rules: getRules('error'),
        ...globalOptions,
    },
    [`${name}-warn`]: {
        plugins,
        rules: getRules('warn'),
        ...globalOptions,
    },
    [name]: {
        plugins,
        rules: getRules(),
        ...globalOptions,
    },
})

const getStylisticRules = (severity = 'warn') => ({
    [`${plugin.meta.name}/${formatClassnames.name}`]: severity,
    [`${plugin.meta.name}/${redundantCx.name}`]: severity,
    [`${plugin.meta.name}/${preferTokenValues.name}`]: severity,
    [`${plugin.meta.name}/${preferUnitlessValues.name}`]: severity,
})

const getCorrectnessRules = (severity = 'error') => ({
    [`${plugin.meta.name}/${noUnknownClasses.name}`]: severity,
    [`${plugin.meta.name}/${requirePropFunctions.name}`]: severity,
})

const config = {
    ...plugin,
    configs: {
        ...createConfig('stylistic', getStylisticRules),
        ...createConfig('correctness', getCorrectnessRules),
        ...createConfig('recommended', severity => ({
            ...getStylisticRules(severity),
            ...getCorrectnessRules(severity),
        })),
    },
}

export default config
