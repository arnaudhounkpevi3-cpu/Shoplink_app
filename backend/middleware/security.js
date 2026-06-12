/**
 * Middleware de sécurité supplémentaire pour la période de crise
 * - Détection d'IP suspectes
 * - Blocage des user-agents de bots
 * - Limitation des tentatives par IP
 */

const suspiciousIPs = new Set()
const failedAttempts = new Map()

function getClientIp(req) {
  return String(req.headers['x-forwarded-for'] || req.ip || '')
    .split(',')[0]
    .trim()
}

function isSuspiciousUserAgent(req) {
  const ua = String(req.headers['user-agent'] || '').toLowerCase()
  const botPatterns = [
    /curl/i,
    /wget/i,
    /python/i,
    /scrapy/i,
    /phantomjs/i,
    /puppeteer/i,
    /playwright/i,
    /selenium/i,
    /headless/i,
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
  ]
  return botPatterns.some((p) => p.test(ua))
}

function recordFailedAttempt(ip) {
  const now = Date.now()
  const attempts = failedAttempts.get(ip) || []
  attempts.push(now)
  failedAttempts.set(ip, attempts.filter((t) => now - t < 15 * 60 * 1000))
}

function hasTooManyFailures(ip) {
  const attempts = failedAttempts.get(ip) || []
  return attempts.length >= 5
}

function securityMiddleware(req, res, next) {
  const ip = getClientIp(req)

  // Bloquer les IP suspectes
  if (suspiciousIPs.has(ip)) {
    return res.status(403).json({
      success: false,
      message: 'Accès temporairement bloqué',
    })
  }

  // Bloquer les bots
  if (isSuspiciousUserAgent(req)) {
    console.warn(`🚨 Bot détecté: ${ip} - ${req.headers['user-agent']}`)
    return res.status(403).json({
      success: false,
      message: 'Accès refusé',
    })
  }

  // Vérifier les tentatives échouées
  if (hasTooManyFailures(ip)) {
    console.warn(`🚨 Trop de tentatives échouées: ${ip}`)
    suspiciousIPs.add(ip)
    return res.status(403).json({
      success: false,
      message: 'Accès temporairement bloqué suite à des tentatives échouées',
    })
  }

  next()
}

function recordFailure(ip) {
  recordFailedAttempt(ip)
}

module.exports = {
  securityMiddleware,
  recordFailure,
  suspiciousIPs,
}
