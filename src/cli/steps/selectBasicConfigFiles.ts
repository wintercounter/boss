import { multiselect } from '@clack/prompts'
import { RuntimeType, StepFn } from '@/cli/types'

const selectBasicConfigFiles: StepFn = async config => {
    const { runtimeType } = config
    const initialValues =
        runtimeType === RuntimeType.NODE
            ? ['.gitignore', '.editorconfig', '.npmrc', '.nvmrc']
            : ['.gitignore', '.editorconfig']

    return await multiselect({
        message: 'Select basic configuration files.',
        options: [
            {
                value: '.gitignore',
                label: '.gitignore',
                hint: 'Specifies paths to be ignored by Git. Useful to ignore files from your commits.'
            },
            {
                value: '.editorconfig',
                label: '.editorconfig',
                hint: 'EditorConfig helps maintain consistent coding styles for multiple developers working on the same project across various editors and IDEs.'
            },
            {
                value: '.npmrc',
                label: '.npmrc',
                hint: 'Allows your to configure the behavior of npm for your project.'
            },
            {
                value: '.nvmrc',
                label: '.nvmrc',
                hint: 'nvm is a tool that allows you to easily install, update, and switch between versions of Node.js. Using this file, you can specify the version of Node.js that your project requires.'
            }
        ],
        initialValues
    })
}

export default selectBasicConfigFiles
