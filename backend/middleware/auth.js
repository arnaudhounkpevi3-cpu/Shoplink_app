const jwt = require('jsonwebtoken')

const { repo } = require('../data/repository')
const { sanitizeUser } = require('../utils/sanitizeUser')

const JWT_SECRET = process.env.JWT_SECRET || 'change-me'

function getBearerToken(req) {
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
  if (!req.user || req.user.role !== 'admin') {
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
