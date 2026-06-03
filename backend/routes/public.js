const express = require('express')

const { repo } = require('../data/repository')
const { isInlineImage, storeInlineImageIfNeeded } = require('../services/imageStorage')
const { buildBoutiqueUrl } = require('../utils/publicUrl')

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

async function normalizePublicImage(value, options = {}) {
  if (!isInlineImage(value)) return value || ''

  try {
    return await storeInlineImageIfNeeded(value, options)
  } catch (error) {
    console.warn('Image inline conservee pour affichage public:', error.message)
    return value
  }
}

router.get('/:slug', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.set('Pragma', 'no-cache')
  res.set('Expires', '0')

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

  const publicLogo = await normalizePublicImage(site.logo, { siteId: site.id })
  if (publicLogo && publicLogo !== site.logo && !isInlineImage(publicLogo)) {
    await repo().updateSite(site.id, { logo: publicLogo })
  }

  const rawProducts = await repo().listProductsBySiteId(site.id)
  const products = await Promise.all(rawProducts
    .filter((product) => product.visible !== false && product.status !== 'hidden')
    .map(async (product) => {
      const publicImage = await normalizePublicImage(product.image, { siteId: site.id })
      if (publicImage && publicImage !== product.image && !isInlineImage(publicImage)) {
        await repo().updateProduct(product.id, { image: publicImage })
      }

      return {
        ...product,
        image: publicImage,
        whatsappLink: buildWhatsAppLink(site.whatsapp, product.name),
      }
    }))

  return res.json({
    success: true,
    site: {
      ...site,
      logo: publicLogo,
      publicUrl: buildBoutiqueUrl(site.slug, req),
      whatsappLink: buildWhatsAppLink(site.whatsapp),
    },
    products,
  })
})

module.exports = router
