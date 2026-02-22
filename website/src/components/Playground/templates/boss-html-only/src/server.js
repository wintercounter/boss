import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 5173)

app.use(express.static(__dirname))

app.listen(port, host, () => {
  console.log('Boss HTML-only server listening on http://' + host + ':' + port)
})
