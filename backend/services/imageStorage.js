const crypto = require('crypto')

const supabase = require('../config/supabase')

let sharp = null
try {
  sharp = require('sharp')
} catch (_error) {
  sharp = null
}

const DEFAULT_BUCKET = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || 'product-images'

function isInlineImage(value) {
  return /^data:image\//i.test(String(value || ''))
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || '').match(/^data:(image\/(png|jpe?g|webp|gif));base64,([\s\S]+)$/i)
  if (!match) return null

  const contentType = match[1].toLowerCase()
  const ext = match[2].toLowerCase().replace('jpeg', 'jpg')
  const buffer = Buffer.from(match[3], 'base64')

  return { contentType, ext, buffer }
}

async function ensurePublicBucket(bucket = DEFAULT_BUCKET) {
  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: '5MB',
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
  })

  if (error && /already exists/i.test(error.message || '')) {
    await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: '5MB',
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
    })
    return
  }

  if (error) {
    throw error
  }
}

async function storeInlineImageIfNeeded(image, options = {}) {
  if (!isInlineImage(image)) return image || ''

  const parsed = parseDataUrl(image)
  if (!parsed || !parsed.buffer.length) {
    throw new Error('Image produit invalide')
  }

  await ensurePublicBucket()

  const siteId = String(options.siteId || 'site').replace(/[^a-z0-9_-]+/gi, '-')
  const digest = crypto.createHash('sha1').update(parsed.buffer).digest('hex').slice(0, 16)
  const filePath = `${siteId}/${Date.now()}-${digest}.${parsed.ext}`
  const thumbPath = `${siteId}/thumbs/${pathBasename(filePath)}.webp`

  const { error } = await supabase.storage
    .from(DEFAULT_BUCKET)
    .upload(filePath, parsed.buffer, {
      contentType: parsed.contentType,
      cacheControl: '31536000',
      upsert: true,
    })

  if (error) {
    throw error
  }

  await uploadThumbnail(parsed.buffer, thumbPath)

  const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(filePath)
  return data.publicUrl || ''
}

function pathBasename(filePath = '') {
  const file = String(filePath).split('/').pop() || 'image'
  return file.replace(/\.[a-z0-9]+$/i, '')
}

async function uploadThumbnail(buffer, thumbPath) {
  if (!sharp || !Buffer.isBuffer(buffer) || !buffer.length) return ''

  try {
    const thumbBuffer = await sharp(buffer)
      .rotate()
      .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72 })
      .toBuffer()

    const { error } = await supabase.storage
      .from(DEFAULT_BUCKET)
      .upload(thumbPath, thumbBuffer, {
        contentType: 'image/webp',
        cacheControl: '31536000',
        upsert: true,
      })

    if (error) return ''
    const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(thumbPath)
    return data.publicUrl || ''
  } catch (error) {
    console.warn('Miniature produit non générée:', error.message)
    return ''
  }
}

function thumbnailUrlForOriginal(imageUrl) {
  const raw = String(imageUrl || '')
  if (!raw || isInlineImage(raw) || !raw.includes('/storage/v1/object/public/')) return ''

  try {
    const url = new URL(raw)
    const parts = url.pathname.split('/')
    const filename = parts.pop() || ''
    const base = filename.replace(/\.[a-z0-9]+$/i, '')
    if (!base) return ''
    parts.push('thumbs', `${base}.webp`)
    url.pathname = parts.join('/')
    url.search = ''
    return url.toString()
  } catch (_error) {
    return ''
  }
}

module.exports = {
  isInlineImage,
  storeInlineImageIfNeeded,
  thumbnailUrlForOriginal,
}
