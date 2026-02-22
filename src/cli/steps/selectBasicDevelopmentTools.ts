import { multiselect } from '@clack/prompts'
import { StepFn } from '@/cli/types'

const selectBasicDevelopmentTools: StepFn = async () => {
    return await multiselect({
        message: 'Select basic development tools.',
        options: [
            {
                value: 'eslint',
                label: 'ESLint',
                hint: 'Recommended! ESLint is a tool for identifying and reporting on patterns found in ECMAScript/JavaScript code, with the goal of making code more consistent and avoiding bugs.'
            },
            { value: 'prettier', label: 'Prettier', hint: 'Recommended! Prettier is an opinionated code formatter.' },
            { value: 'husky', label: 'Husky' },
            { value: 'lint-staged', label: 'Lint-staged' }
        ],
        initialValues: ['eslint', 'prettier']
    })
}

export default selectBasicDevelopmentTools
