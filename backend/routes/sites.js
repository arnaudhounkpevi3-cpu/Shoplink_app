const express = require('express')

const { repo } = require('../data/repository')
const { attachUser, requireAuth } = require('../middleware/auth')
const { uniqueSlug } = require('../utils/slug')

const router = express.Router()

function canManageSite(user, site) {
  return Boolean(user && site && (user.role === 'admin' || user.id === site.userId))
}

router.get('/', async (_req, res) => {
  const sites = await repo().listSites()
  res.json({
    success: true,
    sites,
  })
})

router.post('/create', requireAuth, async (req, res) => {
  const {
    userId,
    name,
    slug,
    slogan,
    logo,
    description,
    whatsapp,
    secondaryPhone,
    address,
    activityType,
    status,
    primaryColor,
    secondaryColor,
  } = req.body

  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'name est obligatoire',
    })
  }

  const targetUserId = req.user.role === 'admin' && userId ? userId : req.user.id
  const nextSlug = await uniqueSlug(
    slug || name,
    async (candidate) => repo().slugTaken(candidate),
    { fallback: 'boutique' },
  )

  const site = await repo().createSite({
    userId: targetUserId,
    name,
    slug: nextSlug,
    slogan,
    logo,
    description,
    whatsapp,
    secondaryPhone,
    address,
    activityType,
    status,
    primaryColor,
    secondaryColor,
    createdAt: new Date().toISOString(),
  })

  return res.status(201).json({
    success: true,
    message: 'Site cree',
    site,
  })
})

router.get('/user/my-sites', requireAuth, async (req, res) => {
  try {
    const userSites = await repo().findSitesByUserId(req.user.id)

    return res.json({
      success: true,
      sites: userSites,
      count: userSites.length,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur serveur',
      error: error.message,
    })
  }
})

router.get('/:id', attachUser, async (req, res) => {
  const site = await repo().findSiteById(req.params.id)

  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site introuvable',
    })
  }

  if (site.status !== 'published' && !canManageSite(req.user, site)) {
    return res.status(403).json({
      success: false,
      message: 'Acces refuse a ce site',
    })
  }

  return res.json({
    success: true,
    site,
  })
})

router.put('/:id', requireAuth, async (req, res) => {
  const existingSite = await repo().findSiteById(req.params.id)

  if (!existingSite) {
    return res.status(404).json({
      success: false,
      message: 'Site introuvable',
    })
  }

  if (!canManageSite(req.user, existingSite)) {
    return res.status(403).json({
      success: false,
      message: 'Vous ne pouvez pas modifier ce site',
    })
  }

  const patch = { ...req.body }

  if (patch.userId && req.user.role !== 'admin') {
    delete patch.userId
  }

  if (patch.slug && patch.slug !== existingSite.slug) {
    const nextSlug = await uniqueSlug(
      patch.slug,
      async (candidate) => {
        if (candidate === existingSite.slug) {
          return false
        }
        return repo().slugTaken(candidate)
      },
      { fallback: existingSite.slug || 'boutique' },
    )
    patch.slug = nextSlug
  }

  const site = await repo().updateSite(req.params.id, patch)

  return res.json({
    success: true,
    message: 'Site mis a jour',
    site,
  })
})

router.delete('/:id', requireAuth, async (req, res) => {
  const existingSite = await repo().findSiteById(req.params.id)

  if (!existingSite) {
    return res.status(404).json({
      success: false,
      message: 'Site introuvable',
    })
  }

  if (!canManageSite(req.user, existingSite)) {
    return res.status(403).json({
      success: false,
      message: 'Vous ne pouvez pas supprimer ce site',
    })
  }

  const deletedSite = await repo().deleteSite(req.params.id)

  return res.json({
    success: true,
    message: 'Site supprime',
    site: deletedSite,
  })
})

module.exports = router
