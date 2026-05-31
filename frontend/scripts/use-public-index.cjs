const fs = require('fs')
const path = require('path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'public', 'index.html')
const target = path.join(root, 'dist', 'index.html')

fs.copyFileSync(source, target)
console.log('Copied public/index.html to dist/index.html')
