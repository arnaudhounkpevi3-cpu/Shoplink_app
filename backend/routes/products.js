const express = require('express')

const { repo } = require('../data/repository')
const { attachUser, requireAuth } = require('../middleware/auth')

const router = express.Router()

function canManageSite(user, site) {
  return Boolean(user && site && (user.role === 'admin' || user.id === site.userId))
}

router.post('/', requireAuth, async (req, res) => {
  const { siteId, name, price, image, description, category, visible, status, availability, stock, badge, oldPrice, variantInfo, extraInfo } = req.body

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
    userId: req.user.id,
    name,
    price,
    image,
    description,
    category,
    visible,
    status,
    availability,
    stock,
    badge,
    oldPrice,
    variantInfo,
    extraInfo,
    createdAt: new Date().toISOString(),
  })

  return res.status(201).json({
    success: true,
    message: 'Produit cree',
    product,
  })
})

router.put('/site/:siteId/replace', requireAuth, async (req, res) => {
  const { products = [] } = req.body
  const site = await repo().findSiteById(req.params.siteId)

  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site introuvable',
    })
  }

  if (!canManageSite(req.user, site)) {
    return res.status(403).json({
      success: false,
      message: 'Vous ne pouvez pas modifier les produits de ce site',
    })
  }

  const existingProducts = await repo().listProductsBySiteId(site.id)
  await Promise.all(existingProducts.map((product) => repo().deleteProduct(product.id)))

  const cleanProducts = products
    .filter((product) => product && product.name)
    .map((product) => ({
      siteId: site.id,
      userId: req.user.id,
      name: product.name,
      price: Number(product.price || 0),
      image: product.image || '',
      description: product.description || '',
      category: product.category || '',
      visible: product.visible !== false && product.status !== 'hidden',
      status: product.status || 'published',
      availability: product.availability || 'available',
      stock: product.stock || '',
      badge: product.badge || '',
      oldPrice: product.oldPrice || '',
      variantInfo: product.variantInfo || '',
      extraInfo: product.extraInfo || '',
      createdAt: new Date().toISOString(),
    }))

  const savedProducts = []
  for (const product of cleanProducts) {
    const saved = await repo().createProduct(product)
    if (saved) savedProducts.push(saved)
  }

  return res.json({
    success: true,
    message: 'Catalogue publié',
    products: savedProducts,
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
