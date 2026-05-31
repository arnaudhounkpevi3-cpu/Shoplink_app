require('dotenv').config()

const os = require('os')

const { initRepository, repo, isMongo, isSupabase } = require('./data/repository')

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
    console.log(`✅ Compte admin créé: ${adminEmail}`)
  } else {
    const passwordHash = await bcrypt.hash(adminPassword, 10)
    await repo().updateUser(existingAdmin.id, {
      role: 'admin',
      passwordHash,
    })
    console.log(`✅ Compte admin synchronisé: ${adminEmail}`)
  }

  if (legacyAdminEmail !== adminEmail) {
    const legacyAdmin = await repo().findUserByEmail(legacyAdminEmail)
    if (legacyAdmin && legacyAdmin.role === 'admin') {
      await repo().updateUser(legacyAdmin.id, { role: 'user' })
      console.log(`✅ Ancien compte admin rétrogradé en utilisateur: ${legacyAdminEmail}`)
    }
  }
}

async function main() {
  await initRepository()
  await ensureAdminUser()

  const express = require('express')
  const cors = require('cors')
  const path = require('path')
  const http = require('http')
  const WebSocket = require('ws')

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

  const app = express()
  const server = http.createServer(app)
  const wss = new WebSocket.Server({ server, path: '/ws/payments' })

  const PORT = process.env.PORT || 5000
  const HOST = process.env.HOST || '0.0.0.0'
  const localOriginPattern = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/
  const lanOriginPattern =
    /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}):\d+$/

  const extraCorsOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true)
        }
        if (localOriginPattern.test(origin)) {
          return callback(null, true)
        }
        if (lanOriginPattern.test(origin)) {
          return callback(null, true)
        }
        if (extraCorsOrigins.includes(origin)) {
          return callback(null, true)
        }
        // Allow all origins for development
        callback(null, true)
      },
    }),
  )
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
  const publicSitePath = path.join(publicPath, 'site-public.html')
  console.log(`📁 Dossier statique: ${publicPath}`)
  app.use(express.static(publicPath))

  app.get('/', (_req, res) => {
    res.json({
      name: 'ShopLink',
      project: 'ShopLink API',
      status: 'running',
      version: 'mvp-2',
      database: process.env.MONGODB_URI || process.env.MONGO_URI ? 'mongodb' : 'json',
    })
  })

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

  app.get('/boutique/:slug', async (req, res, next) => {
    const { slug } = req.params

    try {
      const site = await repo().findSiteBySlug(slug)

      if (!site || site.status !== 'published') {
        return next()
      }

      return res.sendFile(publicSitePath)
    } catch (error) {
      return next(error)
    }
  })

  app.get('/:slug', async (req, res, next) => {
    const { slug } = req.params

    if (!slug || slug.includes('.') || slug === 'api' || slug === 'ws') {
      return next()
    }

    try {
      const site = await repo().findSiteBySlug(slug)

      if (!site || site.status !== 'published') {
        return next()
      }

      return res.redirect(301, `/boutique/${slug}`)
    } catch (error) {
      return next(error)
    }
  })

  wss.on('connection', (ws) => {
    console.log('🔌 Admin connecté aux mises à jour temps réel')

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message)
        console.log("📨 Message reçu de l'admin:", data)
      } catch (error) {
        console.log('Erreur parsing message WebSocket', error.message)
      }
    })

    ws.on('close', () => {
      console.log('❌ Admin déconnecté')
    })

    ws.on('error', (error) => {
      console.log('❌ Erreur WebSocket:', error.message)
    })
  })

  app.locals.notifyAdmins = function notifyAdmins(event) {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(event))
      }
    })
  }

  app.use((req, res) => {
    res.status(404).json({
      success: false,
      message: `Route introuvable: ${req.method} ${req.originalUrl}`,
    })
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(
        `❌ Le port ${PORT} est déjà utilisé (autre terminal ou ancien "node index.js").`,
      )
      console.error(
        '   Fermez ce processus, ou dans .env mettez par exemple PORT=5001 puis relancez.',
      )
      process.exit(1)
    }
    throw err
  })

  function lanIpv4s() {
    const nets = os.networkInterfaces()
    const out = []
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] || []) {
        if (net.family === 'IPv4' && !net.internal) {
          out.push(net.address)
        }
      }
    }
    return out
  }

  server.listen(PORT, HOST, () => {
    console.log(`✅ Backend prêt sur http://localhost:${PORT}`)
    const ips = lanIpv4s()
    if (ips.length) {
      console.log(
        `📱 Depuis le mobile (même Wi‑Fi) : ${ips.map((ip) => `http://${ip}:${PORT}`).join(' | ')}`,
      )
    }
    console.log(`🔌 WebSocket ws://localhost:${PORT}/ws/payments`)
  })
}

main().catch((err) => {
  console.error('❌ Impossible de démarrer le serveur:', err.message)
  process.exit(1)
})
