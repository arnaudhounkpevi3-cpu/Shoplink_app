const crypto = require('crypto')

const supabase = require('../config/supabase')

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

  const { data } = supabase.storage.from(DEFAULT_BUCKET).getPublicUrl(filePath)
  return data.publicUrl || ''
}

module.exports = {
  isInlineImage,
  storeInlineImageIfNeeded,
}
