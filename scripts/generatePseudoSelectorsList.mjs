import selectors from '@webref/css/selectors.json' assert { type: 'json' }

const fn = []
const normal = []

for (const [k, { name }] of Object.entries(selectors.selectors)) {
    if (name.includes('()')) fn.push(name.replace(':', '').replace('()', ''))
    else normal.push(name.replace(':', ''))
}

console.log(normal, fn)
