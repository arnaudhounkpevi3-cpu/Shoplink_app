const express = require('express')

const { repo } = require('../data/repository')
const { isInlineImage, storeInlineImageIfNeeded } = require('../services/imageStorage')
const { buildBoutiqueUrl } = require('../utils/publicUrl')

const router = express.Router()
const PUBLIC_PAYLOAD_VERSION = 'public-v4-cdn-images'
const DEFAULT_IMAGE_CDN_BASE_URL = 'https://shoplink-images.arnaudhounkpevi3.workers.dev'

function imageCdnBaseUrl() {
  return String(process.env.IMAGE_CDN_BASE_URL || DEFAULT_IMAGE_CDN_BASE_URL || '').replace(/\/$/, '')
}

function cdnImageUrl(imageUrl) {
  const raw = String(imageUrl || '')
  const marker = '/storage/v1/object/public/'
  const markerIndex = raw.indexOf(marker)
  const cdnBase = imageCdnBaseUrl()

  if (!raw || isInlineImage(raw) || !cdnBase || markerIndex === -1) return raw

  const path = raw.slice(markerIndex + marker.length)
  return `${cdnBase}/${path}`
}

function publicSitePayload(site, logo) {
  return {
    id: site.id,
    userId: site.userId,
    name: site.name,
    slug: site.slug,
    slogan: site.slogan || '',
    logo: cdnImageUrl(logo),
    description: site.description || '',
    whatsapp: site.whatsapp || '',
    secondaryPhone: site.secondaryPhone || '',
    address: site.address || '',
    activityType: site.activityType || 'Boutique',
    primaryColor: site.primaryColor || '',
    status: site.status,
    publicUrl: '',
    whatsappLink: '',
  }
}

function publicProductPayload(product, image, whatsapp) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image: cdnImageUrl(image),
    description: product.description || '',
    category: product.category || '',
    availability: product.availability || 'available',
    stock: product.stock || '',
    badge: product.badge || '',
    oldPrice: product.oldPrice || '',
    variantInfo: product.variantInfo || '',
    extraInfo: product.extraInfo || '',
    whatsappLink: buildWhatsAppLink(whatsapp, product.name),
  }
}

function weakEtag(site, products = []) {
  const seed = [
    PUBLIC_PAYLOAD_VERSION,
    site.id,
    site.updatedAt || site.publishedAt || site.createdAt || '',
    products.length,
    ...products.map((product) => `${product.id}:${product.updatedAt || product.createdAt || ''}:${product.image || ''}`),
  ].join('|')
  return `W/"${Buffer.from(seed).toString('base64url').slice(0, 48)}"`
}

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
  res.set('Cache-Control', 'public, max-age=60, s-maxage=600, stale-while-revalidate=86400')

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
  const visibleRawProducts = rawProducts
    .filter((product) => product.visible !== false && product.status !== 'hidden')
  const etag = weakEtag(site, visibleRawProducts)
  res.set('ETag', etag)

  if (req.headers['if-none-match'] === etag) {
    return res.status(304).end()
  }

  const products = await Promise.all(visibleRawProducts
    .map(async (product) => {
      const publicImage = await normalizePublicImage(product.image, { siteId: site.id })
      if (publicImage && publicImage !== product.image && !isInlineImage(publicImage)) {
        await repo().updateProduct(product.id, { image: publicImage })
      }

      return publicProductPayload(product, publicImage, site.whatsapp)
    }))

  const publicSite = publicSitePayload(site, publicLogo)
  publicSite.publicUrl = buildBoutiqueUrl(site.slug, req)
  publicSite.whatsappLink = buildWhatsAppLink(site.whatsapp)

  return res.json({
    success: true,
    site: publicSite,
    products,
  })
})

module.exports = router
