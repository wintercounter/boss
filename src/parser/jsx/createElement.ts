import { JSDOM } from 'jsdom'

export default function createElement(tag: string) {
    return new JSDOM().window.document.createElement(tag)
}
