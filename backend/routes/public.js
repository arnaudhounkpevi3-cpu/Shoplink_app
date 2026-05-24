const express = require('express')

const { repo } = require('../data/repository')

const router = express.Router()

function buildWhatsAppLink(whatsapp, productName) {
  if (!whatsapp) {
    return ''
  }

  const cleaned = String(whatsapp).replace(/[^\d]/g, '')
  const message = encodeURIComponent(
    `Bonjour je veux commander ${productName || 'ce produit'}`,
  )

  return `https://wa.me/${cleaned}?text=${message}`
}

router.get('/:slug', async (req, res) => {
  const site = await repo().findSiteBySlug(req.params.slug)

  if (!site) {
    return res.status(404).json({
      success: false,
      message: 'Site public introuvable',
    })
  }

  if (site.status !== 'published') {
    return res.status(403).json({
      success: false,
      message: 'Ce site nest pas encore publie',
      site: {
        id: site.id,
        name: site.name,
        slug: site.slug,
        status: site.status,
      },
    })
  }

  const rawProducts = await repo().listProductsBySiteId(site.id)
  const products = rawProducts.map((product) => ({
    ...product,
    whatsappLink: buildWhatsAppLink(site.whatsapp, product.name),
  }))

  return res.json({
    success: true,
    site: {
      ...site,
      publicUrl: `/${site.slug}`,
      whatsappLink: buildWhatsAppLink(site.whatsapp),
    },
    products,
  })
})

module.exports = router
