const express = require('express')

const { repo } = require('../data/repository')
const { attachUser, requireAuth } = require('../middleware/auth')

const router = express.Router()

function canManageSite(user, site) {
  return Boolean(user && site && (user.role === 'admin' || user.id === site.userId))
}

router.post('/', requireAuth, async (req, res) => {
  const { siteId, name, price, image, description, category } = req.body

  if (!siteId || !name || price === undefined) {
    return res.status(400).json({
      success: false,
      message: 'siteId, name et price sont obligatoires',
    })
  }

  const relatedSite = await repo().findSiteById(siteId)
  if (!relatedSite) {
    return res.status(404).json({
      success: false,
      message: 'Le site lie au produit est introuvable',
    })
  }

  if (!canManageSite(req.user, relatedSite)) {
    return res.status(403).json({
      success: false,
      message: 'Vous ne pouvez pas ajouter de produit sur ce site',
    })
  }

  const product = await repo().createProduct({
    siteId,
    name,
    price,
    image,
    description,
    category,
    createdAt: new Date().toISOString(),
  })

  return res.status(201).json({
    success: true,
    message: 'Produit cree',
    product,
  })
})

router.get('/:siteId', attachUser, async (req, res) => {
  const site = await repo().findSiteById(req.params.siteId)

  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site introuvable',
    })
  }

  if (site.status !== 'published' && !canManageSite(req.user, site)) {
    return res.status(403).json({
      success: false,
      message: 'Acces refuse a ces produits',
    })
  }

  const products = await repo().listProductsBySiteId(req.params.siteId)

  return res.json({
    success: true,
    products,
  })
})

router.put('/:id', requireAuth, async (req, res) => {
  const existingProduct = await repo().findProductById(req.params.id)

  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      message: 'Produit introuvable',
    })
  }

  const relatedSite = await repo().findSiteById(existingProduct.siteId)

  if (!canManageSite(req.user, relatedSite)) {
    return res.status(403).json({
      success: false,
      message: 'Vous ne pouvez pas modifier ce produit',
    })
  }

  const patch = { ...req.body }
  delete patch.siteId

  const product = await repo().updateProduct(req.params.id, patch)

  return res.json({
    success: true,
    message: 'Produit mis a jour',
    product,
  })
})

router.delete('/:id', requireAuth, async (req, res) => {
  const existingProduct = await repo().findProductById(req.params.id)

  if (!existingProduct) {
    return res.status(404).json({
      success: false,
      message: 'Produit introuvable',
    })
  }

  const relatedSite = await repo().findSiteById(existingProduct.siteId)

  if (!canManageSite(req.user, relatedSite)) {
    return res.status(403).json({
      success: false,
      message: 'Vous ne pouvez pas supprimer ce produit',
    })
  }

  const deletedProduct = await repo().deleteProduct(req.params.id)

  return res.json({
    success: true,
    message: 'Produit supprime',
    product: deletedProduct,
  })
})

module.exports = router
