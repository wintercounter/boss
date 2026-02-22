import File from '@/api/file/file'

export default class TextFile extends File {
    get headers(): Array<[string, { content: string }]> {
        return []
    }
}
