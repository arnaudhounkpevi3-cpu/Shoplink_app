function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
}

async function uniqueSlug(baseValue, isTaken, options = {}) {
  const base = slugify(baseValue) || options.fallback || 'boutique'
  let attempt = base
  let index = 2

  while (await isTaken(attempt)) {
    attempt = `${base}-${index}`
    index += 1
  }

  return attempt
}

module.exports = {
  slugify,
  uniqueSlug,
}
