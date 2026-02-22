import { JSDOM } from 'jsdom'

const document = new JSDOM().window.document

export default function createElement(tag) {
    return document.createElement(tag)
}
