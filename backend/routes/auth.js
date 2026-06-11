const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { repo } = require('../data/repository')
const { sanitizeUser } = require('../utils/sanitizeUser')
const { uniqueSlug } = require('../utils/slug')
const { getActivityTheme } = require('../utils/activityTheme')
const { sendPasswordResetEmail } = require('../services/emailService')
const { sendAdminPushNotification } = require('../services/pushNotifications')
const { add: blacklistToken } = require('../data/tokenBlacklist')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET est requis dans les variables d\'environnement')
}

const router = express.Router()
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'supportshoplink@gmail.com').toLowerCase()

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    JWT_SECRET,
    {
      expiresIn: '7d',
    },
  )
}

// Configuration des cookies de sécurité
function getAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production'
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  }
}

function setAuthCookie(res, token) {
  res.cookie('shoplink_token', token, getAuthCookieOptions())
}

function clearAuthCookie(res) {
  res.clearCookie('shoplink_token', { path: '/' })
}

function createPasswordResetToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      purpose: 'password-reset',
    },
    JWT_SECRET,
    {
      expiresIn: '1h',
    },
  )
}

async function findUserFromPasswordResetToken(token) {
  let payload

  try {
    payload = jwt.verify(token, JWT_SECRET)
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { error: 'Token expiré' }
    }
    return { error: 'Token invalide ou expiré' }
  }

  if (!payload || payload.purpose !== 'password-reset' || !payload.sub || !payload.email) {
    return { error: 'Token invalide ou expiré' }
  }

  const user = await repo().findUserById(payload.sub)

  if (!user || String(user.email).toLowerCase() !== String(payload.email).toLowerCase()) {
    return { error: 'Utilisateur introuvable' }
  }

  return { user }
}

function getFrontendBaseUrl(req) {
  return (
    process.env.FRONTEND_URL ||
    req.headers.origin ||
    `${req.protocol}://${req.hostname}:5173`
  ).replace(/\/$/, '')
}

async function getAutonomousPricing() {
  const paidCount = await repo().countAutonomePaid()
  const launchOffer = paidCount < 10

  return {
    autonomousAmount: launchOffer ? 4000 : 5000,
    launchOffer,
    placesRemaining: Math.max(0, 10 - paidCount),
    paidCount,
  }
}

async function createDraftSiteForUser(userId, payload) {
  const shopName = String(payload.shopName || payload.siteName || '').trim()
  const theme = getActivityTheme(payload.activityType || 'Boutique')
  const activityLabel = theme.activityType === 'autre'
    ? String(payload.activityLabel || '').trim()
    : ''

  if (!shopName) {
    return null
  }

  const slug = await uniqueSlug(
    payload.slug || shopName,
    async (candidate) => repo().slugTaken(candidate),
    { fallback: 'boutique' },
  )

  return repo().createSite({
    userId,
    name: shopName,
    slug,
    slogan: String(payload.slogan || '').trim(),
    logo: payload.logo || '',
    description: String(payload.description || '').trim(),
    whatsapp: String(payload.whatsapp || payload.phone || '').trim(),
    secondaryPhone: String(payload.secondaryPhone || '').trim(),
    address: String(payload.address || payload.city || '').trim(),
    activityType: theme.activityType,
    activityLabel,
    primaryColor: payload.primaryColor || theme.primaryColor,
    secondaryColor: payload.secondaryColor || theme.secondaryColor,
    status: 'draft',
    createdAt: new Date().toISOString(),
  })
}

router.post('/register', async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    shopName,
    slogan,
    city,
    activityType,
    activityLabel,
    description,
    address,
    secondaryPhone,
    logo,
    primaryColor,
    secondaryColor,
  } = req.body

  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!name || !normalizedEmail || !password) {
    return res.status(400).json({
      success: false,
      message: 'name, email et password sont obligatoires',
    })
  }

  if (normalizedEmail === ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: 'Cet email est réservé au compte administrateur',
    })
  }

  if (String(activityType || '').toLowerCase() === 'autre' && !String(activityLabel || '').trim()) {
    return res.status(400).json({
      success: false,
      message: 'Veuillez préciser votre activité',
    })
  }

  const existingUser = await repo().findUserByEmail(normalizedEmail)

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Cet email existe deja',
    })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await repo().createUser({
    name,
    email: normalizedEmail,
    phone: phone || '',
    role: 'user',
    passwordHash,
    createdAt: new Date().toISOString(),
  })

  if (!user) {
    return res.status(500).json({
      success: false,
      message: 'Erreur lors de la création de l\'utilisateur dans la base de données',
    })
  }

  const site = await createDraftSiteForUser(user.id, {
    shopName,
    slogan,
    city,
    activityType,
    activityLabel,
    description,
    address,
    secondaryPhone,
    phone,
    logo,
    primaryColor,
    secondaryColor,
  })

  // TEST MODE - Auto-publish site without payment
  if (site) {
    await repo().updateSite(site.id, {
      status: 'published',
      publishedAt: new Date().toISOString(),
    })
    site.status = 'published';
    site.publishedAt = new Date().toISOString();
  }

  const pricing = await getAutonomousPricing()

  sendAdminPushNotification({
    title: 'Nouvel utilisateur',
    body: `${user.name || user.email} vient de créer un compte ShopLink.`,
    tag: 'shoplink-admin-user',
  }).catch((error) => console.warn('Push admin inscription non envoyé:', error.message))

  const token = createToken(user)
  setAuthCookie(res, token)

  return res.status(201).json({
    success: true,
    message: 'Compte cree avec succes',
    user: sanitizeUser(user),
    site,
    pricing,
  })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const normalizedEmail = String(email || '').trim().toLowerCase()

  if (!normalizedEmail || !password) {
    return res.status(400).json({
      success: false,
      message: 'email et password sont obligatoires',
    })
  }

  const user = await repo().findUserByEmail(normalizedEmail)

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Identifiants invalides',
    })
  }

  const isValid = await bcrypt.compare(password, user.passwordHash)

  if (!isValid) {
    return res.status(401).json({
      success: false,
      message: 'Identifiants invalides',
    })
  }

  // Admin access is intentionally separated from the public client login.
  if (user.role === 'admin' && user.email !== ADMIN_EMAIL) {
    return res.status(403).json({
      success: false,
      message: 'Accès admin refusé',
    })
  }

  if (normalizedEmail === ADMIN_EMAIL && user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Cet email est réservé au compte administrateur',
    })
  }

  const token = createToken(user)
  setAuthCookie(res, token)

  return res.json({
    success: true,
    message: 'Connexion reussie',
    user: sanitizeUser(user),
  })
})

// Logout — blacklist le token et supprime le cookie
router.post('/logout', (req, res) => {
  const token = (req.body && req.body.token) || req.cookies?.shoplink_token

  if (token) {
    try {
      // Blacklist pour la durée restante du token
      const payload = jwt.decode(token)
      if (payload && payload.exp) {
        const ttl = (payload.exp * 1000) - Date.now()
        blacklistToken(token, Math.max(ttl, 0))
      } else {
        blacklistToken(token)
      }
    } catch (_error) {
      // Token invalide, rien à blacklister
    }
  }

  clearAuthCookie(res)

  return res.json({
    success: true,
    message: 'Déconnexion réussie',
  })
})

// Vérifier si l'utilisateur est connecté (via cookie)
router.get('/check', (req, res) => {
  const token = req.cookies?.shoplink_token

  if (!token) {
    return res.json({ success: true, authenticated: false })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)

    if (isBlacklisted(token)) {
      clearAuthCookie(res)
      return res.json({ success: true, authenticated: false })
    }

    return res.json({
      success: true,
      authenticated: true,
      userId: payload.sub,
      role: payload.role,
      email: payload.email,
    })
  } catch (_error) {
    clearAuthCookie(res)
    return res.json({ success: true, authenticated: false })
  }
})

router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Token manquant',
    })
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const user = await repo().findUserById(payload.sub)

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Utilisateur introuvable',
      })
    }

    return res.json({
      success: true,
      user: sanitizeUser(user),
    })
  } catch (_error) {
    return res.status(401).json({
      success: false,
      message: 'Token invalide ou expire',
    })
  }
})

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({
      success: false,
      message: 'Email requis',
    })
  }

  const user = await repo().findUserByEmail(email)

  if (!user) {
    // Don't reveal if email exists
    return res.json({
      success: true,
      message: 'Si cet email existe, vous recevrez un lien de réinitialisation',
    })
  }

  const token = createPasswordResetToken(user)
  const resetLink = `${getFrontendBaseUrl(req)}/reset-password.html?token=${token}`
  const emailResult = await sendPasswordResetEmail(user.email, resetLink)

  if (!emailResult.success) {
    return res.status(500).json({
      success: false,
      message:
        emailResult.error ||
        'Impossible d’envoyer l’email de réinitialisation. Vérifiez la configuration SMTP du serveur.',
    })
  }
  
  return res.json({
    success: true,
    message: 'Email de réinitialisation envoyé',
  })
})

router.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({
      success: false,
      message: 'Token et nouveau mot de passe requis',
    })
  }

  const { user, error } = await findUserFromPasswordResetToken(token)

  if (error) {
    return res.status(400).json({
      success: false,
      message: error,
    })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await repo().updateUser(user.id, { passwordHash })

  // Return user data for auto-login
  return res.json({
    success: true,
    message: 'Mot de passe réinitialisé avec succès',
    token: createToken(user),
    user: sanitizeUser(user),
  })
})

router.post('/reset-password-form', async (req, res) => {
  const { token, newPassword } = req.body
  const frontendBase = getFrontendBaseUrl(req)

  function redirectWithError(message) {
    const params = new URLSearchParams({
      token: token || '',
      error: message,
    })
    return res.redirect(303, `${frontendBase}/reset-password.html?${params.toString()}`)
  }

  if (!token || !newPassword) {
    return redirectWithError('Token et nouveau mot de passe requis')
  }

  if (String(newPassword).length < 6) {
    return redirectWithError('Le mot de passe doit contenir au moins 6 caractères')
  }

  const { user, error } = await findUserFromPasswordResetToken(token)

  if (error) {
    return redirectWithError(error)
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await repo().updateUser(user.id, { passwordHash })

  return res.redirect(303, `${frontendBase}/login.html?passwordReset=success`)
})

module.exports = router
