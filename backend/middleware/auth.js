const jwt = require('jsonwebtoken')

const { repo } = require('../data/repository')
const { sanitizeUser } = require('../utils/sanitizeUser')
const { has: isBlacklisted } = require('../data/tokenBlacklist')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET est requis dans les variables d\'environnement')
}

function getBearerToken(req) {
  // Priorité au cookie HttpOnly (sécurisé contre XSS)
  const cookieToken = req.cookies?.shoplink_token
  if (cookieToken) return cookieToken

  // Fallback vers le header Authorization pour compatibilité
  const authHeader = req.headers.authorization || ''
  return authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
}

async function attachUser(req, _res, next) {
  const token = getBearerToken(req)

  if (!token) {
    req.user = null
    return next()
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    // Vérifier si le token est blacklisté (déconnexion, compromission)
    if (isBlacklisted(token)) {
      req.user = null
      return next()
    }

    const user = await repo().findUserById(payload.sub)
    req.user = user ? sanitizeUser(user) : null
    return next()
  } catch (_error) {
    req.user = null
    return next()
  }
}

async function requireAuth(req, res, next) {
  const token = getBearerToken(req)

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Authentification requise',
    })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    // Vérifier si le token est blacklisté
    if (isBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token révoqué. Veuillez vous reconnecter.',
      })
    }

    const user = await repo().findUserById(payload.sub)

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Utilisateur introuvable',
      })
    }

    req.user = sanitizeUser(user)
    return next()
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expire',
    })
  }
}

function requireAdmin(req, res, next) {
  const adminEmail = (process.env.ADMIN_EMAIL || 'supportshoplink@gmail.com').toLowerCase()

  if (!req.user || req.user.role !== 'admin' || req.user.email !== adminEmail) {
    return res.status(403).json({
      success: false,
      message: 'Acces administrateur requis',
    })
  }

  return next()
}

module.exports = {
  attachUser,
  requireAuth,
  requireAdmin,
}
