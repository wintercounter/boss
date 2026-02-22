import { listAll } from '@webref/elements'

const all = await listAll()
const elements = []

for (const [,data] of Object.entries(all)) {
    for (const el of data.elements) {
        if (el.interface) {
            elements.push(el.name)
        }
    }
}

console.log(elements)
