import { templates } from './templates'

const DEFAULT_TEMPLATE_ID = 'boss-basic'

const baseProject = {
    template: 'node',
    settings: {
        compile: {
            trigger: 'auto',
        },
    },
}

const getTemplate = templateId =>
    templates.find(template => template.id === templateId) || templates[0] || null

export function createBossProject({ templateId = DEFAULT_TEMPLATE_ID, files, appCode } = {}) {
    const template = getTemplate(templateId)
    const templateFiles = template?.files || {}
    const mergedFiles = { ...templateFiles, ...(files || {}) }

    if (appCode) {
        mergedFiles['src/App.tsx'] = appCode
    }

    return {
        ...baseProject,
        files: mergedFiles,
    }
}

export const defaultBossAppCode =
    getTemplate(DEFAULT_TEMPLATE_ID)?.files?.['src/App.tsx'] || ''

export { templates }
