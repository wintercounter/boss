import { DEVTOOLS_ATTR } from './constants'
import { mountDevtoolsApp } from './index'

const container = document.createElement('div')
container.setAttribute(DEVTOOLS_ATTR, 'true')
document.body.appendChild(container)

const portParam = new URLSearchParams(window.location.search).get('port')
const port = portParam ? Number(portParam) : 0

mountDevtoolsApp(container, Number.isFinite(port) ? port : 0)
