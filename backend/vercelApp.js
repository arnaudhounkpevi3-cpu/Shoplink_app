require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')

const { initRepository, repo, isMongo, isSupabase } = require('./data/repository')
const authRoutes = require('./routes/auth')
const siteRoutes = require('./routes/sites')
const productRoutes = require('./routes/products')
const paymentRoutes = require('./routes/payments')
const adminRoutes = require('./routes/admin')
const publicRoutes = require('./routes/public')
const ticketsRoutes = require('./routes/tickets')
const usersRoutes = require('./routes/users')
const trackingRoutes = require('./routes/tracking')
const { requireAuth, requireAdmin } = require('./middleware/auth')

let appPromise = null

async function ensureAdminUser() {
  const bcrypt = require('bcryptjs')
  const adminEmail = (process.env.ADMIN_EMAIL || 'supportshoplink@gmail.com').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD || '/Shoplink@2007'
  const existingAdmin = await repo().findUserByEmail(adminEmail)
  const legacyAdminEmail = 'arnaudhounkpevi3@gmail.com'

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    await repo().createUser({
      id: `admin-${Date.now()}`,
      name: process.env.ADMIN_NAME || 'Administrateur ShopLink',
      email: adminEmail,
      phone: process.env.ADMIN_PHONE || '0167163481',
      role: 'admin',
      passwordHash,
      createdAt: new Date().toISOString(),
    })
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    await repo().updateUser(existingAdmin.id, {
      role: 'admin',
      passwordHash,
    })
  }

  if (legacyAdminEmail !== adminEmail) {
    const legacyAdmin = await repo().findUserByEmail(legacyAdminEmail)
    if (legacyAdmin && legacyAdmin.role === 'admin') {
      await repo().updateUser(legacyAdmin.id, { role: 'user' })
    }
  }
}

async function createApp() {
  await initRepository()
  await ensureAdminUser()

  const app = express()
  app.set('trust proxy', true)

  app.use(cors({ origin: true }))
  app.use(express.json({ limit: '25mb' }))
  app.use(express.urlencoded({ extended: false, limit: '25mb' }))

  app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
      return res.status(400).json({
        success: false,
        message: 'Requête JSON invalide',
      })
    }

    return next(error)
  })

  const publicPath = path.join(__dirname, '../frontend/public')
  app.use(express.static(publicPath))

  app.get('/api', (_req, res) => {
    res.json({
      success: true,
      message: 'API ShopLink opérationnelle',
      time: new Date().toISOString(),
    })
  })

  app.get('/api/health', (_req, res) => {
    res.json({
      success: true,
      message: 'API en ligne',
      time: new Date().toISOString(),
    })
  })

  app.get('/api/health/db', async (_req, res) => {
    try {
      const users = await repo().listUsers()
      res.json({
        success: true,
        message: 'Base de données accessible',
        database: isSupabase() ? 'supabase' : isMongo() ? 'mongodb' : 'json',
        usersCount: users.length,
        time: new Date().toISOString(),
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Base de données inaccessible',
        error: error.message,
        time: new Date().toISOString(),
      })
    }
  })

  app.use('/api/auth', authRoutes)
  app.use('/api/sites', siteRoutes)
  app.use('/api/products', productRoutes)
  app.use('/api/payment', paymentRoutes)
  app.use('/api/payments', paymentRoutes)
  app.use('/api/admin', requireAuth, requireAdmin, adminRoutes)
  app.use('/api/public', publicRoutes)
  app.use('/api/tickets', ticketsRoutes)
  app.use('/api/users', usersRoutes)
  app.use('/api/tracking', trackingRoutes)

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route introuvable: ${req.method} ${req.originalUrl}`,
    })
  })

  return app
}

async function getApp() {
  if (!appPromise) {
    appPromise = createApp()
  }

  return appPromise
}

module.exports = async function handler(req, res) {
  const app = await getApp()
  return app(req, res)
}
