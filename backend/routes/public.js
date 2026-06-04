const express = require('express')

const { repo } = require('../data/repository')
const { isInlineImage, storeInlineImageIfNeeded, thumbnailUrlForOriginal } = require('../services/imageStorage')
const { buildBoutiqueUrl } = require('../utils/publicUrl')

const router = express.Router()
const PUBLIC_PAYLOAD_VERSION = 'public-v2-image-fallback'

function publicSitePayload(site, logo) {
  return {
    id: site.id,
    userId: site.userId,
    name: site.name,
    slug: site.slug,
    slogan: site.slogan || '',
    logo: logo || '',
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

function supabaseThumbnailUrl(imageUrl, width = 640, quality = 72) {
  const raw = String(imageUrl || '')
  if (!raw || isInlineImage(raw) || !raw.includes('/storage/v1/object/public/')) return raw

  try {
    const url = new URL(raw)
    url.pathname = url.pathname.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
    url.searchParams.set('width', String(width))
    url.searchParams.set('quality', String(quality))
    url.searchParams.set('resize', 'contain')
    return url.toString()
  } catch (_error) {
    return raw
  }
}

function publicProductPayload(product, image, whatsapp) {
  // Use Supabase's transform endpoint first because it is generated on demand.
  // Real uploaded thumbnails are kept as a future optimization, but old products
  // may not have them, so guessing /thumbs/... first can break product cards.
  const thumbnail = supabaseThumbnailUrl(image) || thumbnailUrlForOriginal(image)
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    image: thumbnail || image || '',
    fullImage: image || thumbnail || '',
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
