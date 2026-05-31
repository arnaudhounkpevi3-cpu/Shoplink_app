const express = require('express')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const { repo } = require('../data/repository')
const { sanitizeUser } = require('../utils/sanitizeUser')
const { uniqueSlug } = require('../utils/slug')
const { sendPasswordResetEmail } = require('../services/emailService')

const router = express.Router()

function createToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      email: user.email,
    },
    process.env.JWT_SECRET || 'change-me',
    {
      expiresIn: '7d',
    },
  )
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
    activityType: String(payload.activityType || 'Boutique').trim() || 'Boutique',
    primaryColor: payload.primaryColor || '#1a6b4a',
    secondaryColor: payload.secondaryColor || '#f59c1a',
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
    description,
    address,
    secondaryPhone,
    logo,
    primaryColor,
    secondaryColor,
  } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'name, email et password sont obligatoires',
    })
  }

  const existingUser = await repo().findUserByEmail(email)

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'Cet email existe deja',
    })
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await repo().createUser({
    name,
    email: String(email).toLowerCase(),
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

  return res.status(201).json({
    success: true,
    message: 'Compte cree avec succes',
    token: createToken(user),
    user: sanitizeUser(user),
    site,
    pricing,
  })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'email et password sont obligatoires',
    })
  }

  const user = await repo().findUserByEmail(email)

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
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'supportshoplink@gmail.com').toLowerCase();
  if (user.role === 'admin' && user.email !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({
      success: false,
      message: 'Accès admin refusé',
    })
  }

  return res.json({
    success: true,
    message: 'Connexion reussie',
    token: createToken(user),
    user: sanitizeUser(user),
  })
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
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'change-me')
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

// Store reset tokens in memory (for development)
const resetTokens = new Map()

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

  // Generate a unique token
  const token = require('crypto').randomBytes(32).toString('hex')
  resetTokens.set(token, { email, expiresAt: Date.now() + 60 * 60 * 1000 }) // 1 hour

  const resetLink = `${getFrontendBaseUrl(req)}/reset-password.html?token=${token}`
  const emailResult = await sendPasswordResetEmail(user.email, resetLink)

  if (!emailResult.success) {
    resetTokens.delete(token)

    if (
      emailResult.provider === 'resend' &&
      emailResult.statusCode === 403 &&
      String(emailResult.error || '').includes('verify a domain')
    ) {
      return res.status(403).json({
        success: false,
        message:
          'Resend est en mode test : vous pouvez seulement envoyer vers l’email propriétaire du compte Resend. Pour envoyer à tous les utilisateurs, vérifiez un domaine sur resend.com/domains puis utilisez une adresse RESEND_FROM de ce domaine.',
      })
    }

    return res.status(500).json({
      success: false,
      message:
        emailResult.error ||
        'Impossible d’envoyer l’email de réinitialisation. Vérifiez la configuration email du serveur.',
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

  const resetData = resetTokens.get(token)

  if (!resetData) {
    return res.status(400).json({
      success: false,
      message: 'Token invalide ou expiré',
    })
  }

  if (resetData.expiresAt < Date.now()) {
    resetTokens.delete(token)
    return res.status(400).json({
      success: false,
      message: 'Token expiré',
    })
  }

  const user = await repo().findUserByEmail(resetData.email)

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Utilisateur introuvable',
    })
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await repo().updateUser(user.id, { passwordHash })

  resetTokens.delete(token)

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
    return res.redirect(`${frontendBase}/reset-password.html?${params.toString()}`)
  }

  if (!token || !newPassword) {
    return redirectWithError('Token et nouveau mot de passe requis')
  }

  if (String(newPassword).length < 6) {
    return redirectWithError('Le mot de passe doit contenir au moins 6 caractères')
  }

  const resetData = resetTokens.get(token)

  if (!resetData) {
    return redirectWithError('Token invalide ou expiré')
  }

  if (resetData.expiresAt < Date.now()) {
    resetTokens.delete(token)
    return redirectWithError('Token expiré')
  }

  const user = await repo().findUserByEmail(resetData.email)

  if (!user) {
    return redirectWithError('Utilisateur introuvable')
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  await repo().updateUser(user.id, { passwordHash })
  resetTokens.delete(token)

  return res.redirect(`${frontendBase}/login.html?passwordReset=success`)
})

module.exports = router
