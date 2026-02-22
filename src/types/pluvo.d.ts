declare module 'pluvo' {
    export type CommentStyle = { value: string } | { start: string; end: string }
    export type CommentStyles = { line: CommentStyle[]; block: CommentStyle[] }

    const pluvo: (
        template: string,
        data?: Record<string, unknown>,
        options?: { commentStyles?: CommentStyles },
    ) => string

    export const DEFAULT_COMMENT_STYLES: CommentStyles

    export default pluvo
}
