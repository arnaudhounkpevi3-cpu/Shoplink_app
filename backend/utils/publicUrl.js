function getAppUrl(req) {
  const configured = process.env.APP_URL || process.env.FRONTEND_URL
  if (configured) {
    return String(configured).replace(/\/$/, '')
  }

  if (req) {
    const host = req.get ? req.get('host') : req.headers && req.headers.host
    const protocol = req.protocol || (req.headers && req.headers['x-forwarded-proto']) || 'http'
    if (host) {
      return `${protocol}://${host}`.replace(/\/$/, '')
    }
  }

  return 'http://localhost:5173'
}

function buildBoutiqueUrl(slug, req) {
  return `${getAppUrl(req)}/boutique/${slug}`
}

module.exports = {
  getAppUrl,
  buildBoutiqueUrl,
}
