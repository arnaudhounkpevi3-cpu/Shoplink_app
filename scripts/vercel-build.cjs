const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'frontend', 'public')
const target = path.join(root, 'frontend', 'dist')

if (!fs.existsSync(source)) {
  throw new Error(`Frontend public directory not found: ${source}`)
}

fs.rmSync(target, { recursive: true, force: true })
fs.mkdirSync(target, { recursive: true })
fs.cpSync(source, target, { recursive: true })

console.log('Copied frontend/public to frontend/dist for Vercel static deployment')
