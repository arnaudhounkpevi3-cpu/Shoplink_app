const bcrypt = require('bcryptjs')
const supabase = require('../config/supabase')
const { normalizeActivityType, getActivityTheme } = require('../utils/activityTheme')

const DEFAULT_LIMIT = Number(process.env.SUPABASE_DEFAULT_LIMIT || 100)
const ADMIN_LIMIT = Number(process.env.SUPABASE_ADMIN_LIMIT || 500)
const TRACKING_LIMIT = Number(process.env.SUPABASE_TRACKING_LIMIT || 1000)
const CACHE_TTL_MS = Number(process.env.SUPABASE_CACHE_TTL_MS || 30000)

const USER_COLUMNS = 'id,name,email,phone,role,password,created_at,updated_at'
const PUBLIC_USER_COLUMNS = 'id,name,email,phone,role,created_at,updated_at'
const SITE_COLUMNS = 'id,user_id,name,slug,slogan,logo_url,description,whatsapp,phone2,address,activity_type,primary_color,status,created_at,published_at,updated_at'
const PRODUCT_COLUMNS = 'id,site_id,user_id,name,price,image_url,description,category,is_visible,availability,stock,badge,old_price,variant_info,extra_info,created_at,updated_at'
const PAYMENT_COLUMNS = 'id,user_id,site_id,type,amount,step,status,method,reference,admin_note,paid_at,created_at,updated_at'
const TICKET_COLUMNS = 'id,user_id,user_name,user_email,subject,message,priority,status,replies,created_at,updated_at'
const TRACKING_COLUMNS = 'id,site_id,product_id,type,visitor_id,session_id,ip_address,user_agent,referrer,platform,time_spent,created_at'
const PREMIUM_ORDER_COLUMNS = 'id,user_id,site_id,manager_name,email,whatsapp,site_type,activity_type,delai,acompte_paid_at,status,created_at'
const LINK_VISIT_COLUMNS = 'id,user_id,site_id,source,visited_at,week_number,year,created_at'
const SITE_VISIT_COLUMNS = 'id,shop_id,site_id,ip_address,visitor_id,source,visited_at,visit_date,week_number,year,created_at'
const PRODUCT_EVENT_COLUMNS = 'id,shop_id,site_id,product_id,event_type,ip_address,visitor_id,created_at,event_date,week_number,year'
const ORDER_COLUMNS = 'id,reference,site_order_number,site_id,site_slug,site_name,seller_user_id,buyer_name,buyer_phone,buyer_address,buyer_note,total_amount,currency,source,status,payment_status,payment_method,payer_name,payer_phone,transaction_reference,payment_submitted_at,cancelled_at,cancellation_source,created_at,updated_at'
const ORDER_ITEM_COLUMNS = 'id,order_id,product_id,name,category,quantity,unit_price,total,created_at'

const memoryCache = new Map()

function cached(key, ttlMs, producer) {
  const entry = memoryCache.get(key)
  if (entry && Date.now() - entry.createdAt < ttlMs) return Promise.resolve(entry.value)
  return Promise.resolve(producer()).then((value) => {
    memoryCache.set(key, { value, createdAt: Date.now() })
    return value
  })
}

function invalidateCache(prefix = '') {
  if (!prefix) {
    memoryCache.clear()
    return
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key)
  }
}

function iso(d) {
  if (!d) {
    return undefined
  }
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString()
}

function newEntityId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

const PRODUCT_META_PREFIX = '\n<!--SHOPLINK_PRODUCT_META:'
const PRODUCT_META_SUFFIX = '-->'

function productMetaFromData(data = {}) {
  return {
    availability: data.availability || 'available',
    stock: data.stock || '',
    badge: data.badge || '',
    oldPrice: data.oldPrice || '',
    variantInfo: data.variantInfo || '',
    extraInfo: data.extraInfo || '',
  }
}

function hasProductMeta(meta) {
  return Boolean(
    meta &&
      (meta.availability !== 'available' ||
        meta.stock ||
        meta.badge ||
        meta.oldPrice ||
        meta.variantInfo ||
        meta.extraInfo),
  )
}

function encodeProductDescription(description = '', meta = {}) {
  const cleanDescription = String(description || '').replace(/\n<!--SHOPLINK_PRODUCT_META:[\s\S]*?-->/g, '')
  if (!hasProductMeta(meta)) return cleanDescription
  return `${cleanDescription}${PRODUCT_META_PREFIX}${JSON.stringify(meta)}${PRODUCT_META_SUFFIX}`
}

function decodeProductDescription(description = '') {
  const raw = String(description || '')
  const match = raw.match(/\n<!--SHOPLINK_PRODUCT_META:([\s\S]*?)-->/)
  let meta = {}

  if (match) {
    try {
      meta = JSON.parse(match[1]) || {}
    } catch (_error) {
      meta = {}
    }
  }

  return {
    description: raw.replace(/\n<!--SHOPLINK_PRODUCT_META:[\s\S]*?-->/g, ''),
    meta,
  }
}

function mapUser(u) {
  if (!u) {
    return null
  }
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || '',
    role: u.role,
    passwordHash: u.password,
    createdAt: iso(u.created_at),
  }
}

function mapSite(s) {
  if (!s) {
    return null
  }
  return {
    id: s.id,
    userId: s.user_id,
    name: s.name,
    slug: s.slug,
    slogan: s.slogan || '',
    logo: s.logo_url || '',
    description: s.description || '',
    whatsapp: s.whatsapp || '',
    secondaryPhone: s.phone2 || '',
    address: s.address || '',
    activityType: s.activity_type || 'Boutique',
    primaryColor: s.primary_color,
    secondaryColor: '', // Not in Supabase schema
    status: s.status,
    createdAt: iso(s.created_at),
    publishedAt: s.published_at ? iso(s.published_at) : undefined,
    updatedAt: s.updated_at ? iso(s.updated_at) : undefined,
  }
}

function mapProduct(p) {
  if (!p) {
    return null
  }
  const decoded = decodeProductDescription(p.description || '')
  const meta = decoded.meta || {}
  return {
    id: p.id,
    siteId: p.site_id,
    userId: p.user_id,
    name: p.name,
    price: p.price,
    image: p.image_url || '',
    description: decoded.description || '',
    category: p.category || '',
    visible: p.is_visible !== false,
    status: p.is_visible === false ? 'hidden' : 'published',
    availability: p.availability || meta.availability || 'available',
    stock: p.stock || meta.stock || '',
    badge: p.badge || meta.badge || '',
    oldPrice: p.old_price || meta.oldPrice || '',
    variantInfo: p.variant_info || meta.variantInfo || '',
    extraInfo: p.extra_info || meta.extraInfo || '',
    createdAt: iso(p.created_at),
    updatedAt: p.updated_at ? iso(p.updated_at) : undefined,
  }
}

function isMissingOptionalProductColumn(error) {
  return Boolean(
    error &&
      typeof error.message === 'string' &&
      /Could not find the '(availability|stock|badge|old_price|variant_info|extra_info)' column/.test(error.message),
  )
}

function baseProductInsertPayload(id, data) {
  const meta = productMetaFromData(data)
  return {
    id,
    site_id: data.siteId,
    user_id: data.userId,
    name: data.name,
    price: data.price,
    image_url: data.image || '',
    description: encodeProductDescription(data.description || '', meta),
    category: data.category || '',
    is_visible: data.visible !== false && data.status !== 'hidden',
    created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
  }
}

function advancedProductFields(data) {
  const meta = productMetaFromData(data)
  return {
    availability: meta.availability,
    stock: meta.stock,
    badge: meta.badge,
    old_price: meta.oldPrice || null,
    variant_info: meta.variantInfo,
    extra_info: meta.extraInfo,
  }
}

function mapPayment(p) {
  if (!p) {
    return null
  }
  let premiumOrder = null
  if (p.admin_note) {
    try {
      const parsed = JSON.parse(p.admin_note)
      premiumOrder = parsed.premiumOrder || null
    } catch (_e) {
      premiumOrder = null
    }
  }
  return {
    id: p.id,
    userId: p.user_id,
    type: p.type,
    amount: p.amount,
    step: p.step,
    siteId: p.site_id || '',
    status: p.status,
    reference: p.reference,
    adminNote: p.admin_note || '',
    premiumOrder,
    validationStatus: premiumOrder?.validationStatus,
    transactionId: premiumOrder?.transactionId,
    paymentStatus: premiumOrder?.paymentStatus,
    projectStatus: premiumOrder?.projectStatus,
    deliveryStartedAt: premiumOrder?.deliveryStartedAt,
    deliveryTargetAt: premiumOrder?.deliveryTargetAt,
    paidAt: p.paid_at ? iso(p.paid_at) : undefined,
    createdAt: iso(p.created_at),
    updatedAt: p.updated_at ? iso(p.updated_at) : undefined,
  }
}

function mapOrder(row, items = []) {
  if (!row) return null
  return {
    id: row.id,
    reference: row.reference,
    siteOrderNumber: row.site_order_number,
    siteId: row.site_id,
    siteSlug: row.site_slug,
    siteName: row.site_name,
    sellerUserId: row.seller_user_id,
    buyerName: row.buyer_name,
    buyerPhone: row.buyer_phone,
    buyerAddress: row.buyer_address || '',
    buyerNote: row.buyer_note || '',
    items,
    totalAmount: Number(row.total_amount || 0),
    currency: row.currency || 'FCFA',
    source: row.source || 'direct',
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method || '',
    payerName: row.payer_name || '',
    payerPhone: row.payer_phone || '',
    transactionReference: row.transaction_reference || '',
    paymentSubmittedAt: row.payment_submitted_at ? iso(row.payment_submitted_at) : undefined,
    cancelledAt: row.cancelled_at ? iso(row.cancelled_at) : undefined,
    cancellationSource: row.cancellation_source || '',
    createdAt: iso(row.created_at),
    updatedAt: row.updated_at ? iso(row.updated_at) : undefined,
  }
}

function mapOrderItem(row) {
  if (!row) return null
  return {
    id: row.id,
    orderId: row.order_id,
    productId: row.product_id,
    name: row.name,
    category: row.category || '',
    quantity: Number(row.quantity || 1),
    unitPrice: Number(row.unit_price || 0),
    total: Number(row.total || 0),
    createdAt: iso(row.created_at),
  }
}

async function seedIfEmpty() {
  try {
    const { count, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .limit(1)
    if (countError) {
      console.warn('⚠️ Erreur lors du comptage des users:', countError.message)
      return
    }
    if (count > 0) {
      return
    }

    const adminHash = bcrypt.hashSync('admin12345', 10)
    const clientHash = bcrypt.hashSync('12345678', 10)

    const { error: usersError } = await supabase.from('users').insert([
      {
        id: 'user-1',
        name: 'Administrateur',
        email: 'admin@myonlinestore.local',
        phone: '+22900000000',
        role: 'admin',
        password: adminHash,
        created_at: new Date().toISOString(),
      },
      {
        id: 'user-2',
        name: 'Client Test',
        email: 'clienttest@example.com',
        phone: '+22997000000',
        role: 'user',
        password: clientHash,
        created_at: new Date().toISOString(),
      },
    ])

    if (usersError) {
      console.warn('⚠️ Erreur lors de l\'insertion des users:', usersError.message)
      return
    }

    const { error: sitesError } = await supabase.from('sites').insert({
      id: 'site-1',
      user_id: 'user-2',
      name: 'Boutique Test',
      slug: 'boutique-test',
      slogan: 'Boutique de demonstration',
      logo_url: '',
      description: 'Boutique de demonstration',
      whatsapp: '+22997000000',
      address: 'Cotonou',
      activity_type: 'boutique',
      primary_color: '#d9643a',
      status: 'published',
      created_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    })

    if (sitesError) {
      console.warn('⚠️ Erreur lors de l\'insertion du site:', sitesError.message)
    }

    const { error: productsError } = await supabase.from('products').insert([
      {
        id: 'product-1',
        site_id: 'site-1',
        user_id: 'user-2',
        name: 'Sac a main',
        price: 15000,
        image_url: 'https://example.com/sac.jpg',
        description: 'Sac elegant pour demonstration',
        category: 'Mode',
        created_at: new Date().toISOString(),
      },
      {
        id: 'product-2',
        site_id: 'site-1',
        user_id: 'user-2',
        name: 'Chaussure femme',
        price: 22000,
        image_url: 'https://example.com/chaussure.jpg',
        description: 'Chaussure confortable pour demonstration',
        category: 'Chaussures',
        created_at: new Date().toISOString(),
      },
    ])

    if (productsError) {
      console.warn('⚠️ Erreur lors de l\'insertion des produits:', productsError.message)
    }

    console.log('🌱 Base Supabase initialisée (comptes démo)')
  } catch (error) {
    console.warn('⚠️ Erreur lors du seedIfEmpty:', error.message)
  }
}

module.exports = {
  seedIfEmpty,

  async findUserByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('email', String(email).toLowerCase())
      .limit(1)
      .single()
    return error || !data ? null : mapUser(data)
  },

  async findUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select(USER_COLUMNS)
      .eq('id', id)
      .limit(1)
      .single()
    return error || !data ? null : mapUser(data)
  },

  async createUser(data) {
    const id = data.id || newEntityId('user')
    const { data: result, error } = await supabase
      .from('users')
      .insert({
        id,
        name: data.name,
        email: String(data.email).toLowerCase(),
        phone: data.phone || '',
        role: data.role || 'user',
        password: data.passwordHash,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select(USER_COLUMNS)
      .single()
    invalidateCache('users:')
    return error || !result ? null : mapUser(result)
  },

  async updateUser(id, patch) {
    const update = {}

    if (patch.name !== undefined) update.name = patch.name
    if (patch.email !== undefined) update.email = String(patch.email).toLowerCase()
    if (patch.phone !== undefined) update.phone = patch.phone
    if (patch.role !== undefined) update.role = patch.role
    if (patch.passwordHash !== undefined) update.password = patch.passwordHash
    update.updated_at = new Date().toISOString()

    const { data: result, error } = await supabase
      .from('users')
      .update(update)
      .eq('id', id)
      .select(USER_COLUMNS)
      .single()

    invalidateCache('users:')
    return error || !result ? null : mapUser(result)
  },

  async listUsers() {
    return cached('users:list', CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('users')
        .select(PUBLIC_USER_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(ADMIN_LIMIT)
      return error ? [] : data.map(mapUser)
    })
  },

  async listSites() {
    return cached('sites:list', CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('sites')
        .select(SITE_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(ADMIN_LIMIT)
      return error ? [] : data.map(mapSite)
    })
  },

  async findSiteById(id) {
    const { data, error } = await supabase
      .from('sites')
      .select(SITE_COLUMNS)
      .eq('id', id)
      .limit(1)
      .single()
    return error || !data ? null : mapSite(data)
  },

  async findSiteBySlug(slug) {
    const { data, error } = await supabase
      .from('sites')
      .select(SITE_COLUMNS)
      .eq('slug', slug)
      .limit(1)
      .single()
    return error || !data ? null : mapSite(data)
  },

  async findSitesByUserId(userId) {
    const { data, error } = await supabase
      .from('sites')
      .select(SITE_COLUMNS)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(DEFAULT_LIMIT)
    return error ? [] : data.map(mapSite)
  },

  async slugTaken(slug) {
    const { count, error } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    return error ? false : Number(count || 0) > 0
  },

  async createSite(data) {
    const id = data.id || newEntityId('site')
    const theme = getActivityTheme(data.activityType)
    const { data: result, error } = await supabase
      .from('sites')
      .insert({
        id,
        user_id: data.userId,
        name: data.name,
        slug: data.slug,
        slogan: data.slogan || '',
        logo_url: data.logo || '',
        description: data.description || '',
        whatsapp: data.whatsapp || '',
        phone2: data.secondaryPhone || '',
        address: data.address || '',
        activity_type: theme.activityType,
        primary_color: data.primaryColor || theme.primaryColor,
        status: data.status || 'draft',
        published_at: data.publishedAt ? new Date(data.publishedAt).toISOString() : null,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select(SITE_COLUMNS)
      .limit(1)
      .single()
    if (error) {
      console.error('❌ Erreur création site Supabase:', error.message)
      return null
    }

    invalidateCache('sites:')
    return !result ? null : mapSite(result)
  },

  async updateSite(id, patch) {
    const updates = {
      updated_at: new Date().toISOString(),
    }

    if (patch.name) updates.name = patch.name
    if (patch.slug !== undefined) updates.slug = patch.slug
    if (patch.slogan !== undefined) updates.slogan = patch.slogan
    if (patch.logo !== undefined) updates.logo_url = patch.logo
    if (patch.description !== undefined) updates.description = patch.description
    if (patch.whatsapp !== undefined) updates.whatsapp = patch.whatsapp
    if (patch.secondaryPhone !== undefined) updates.phone2 = patch.secondaryPhone
    if (patch.address !== undefined) updates.address = patch.address
    if (patch.activityType !== undefined) {
      const theme = getActivityTheme(patch.activityType)
      updates.activity_type = theme.activityType
      if (patch.primaryColor === undefined) updates.primary_color = theme.primaryColor
    }
    if (patch.primaryColor !== undefined) updates.primary_color = patch.primaryColor
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.publishedAt !== undefined) updates.published_at = patch.publishedAt ? new Date(patch.publishedAt).toISOString() : null

    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select(SITE_COLUMNS)
      .limit(1)
      .single()
    if (error) {
      console.error('❌ Erreur mise à jour site Supabase:', error.message)
      return null
    }

    invalidateCache('sites:')
    return !data ? null : mapSite(data)
  },

  async deleteSite(id) {
    // Delete products first
    await supabase.from('products').delete().eq('site_id', id)

    const { data, error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)
      .select(SITE_COLUMNS)
      .limit(1)
      .single()
    invalidateCache('sites:')
    invalidateCache('products:')
    return error || !data ? null : mapSite(data)
  },

  async listProductsBySiteId(siteId) {
    return cached(`products:site:${siteId}`, CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('products')
        .select(PRODUCT_COLUMNS)
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(DEFAULT_LIMIT)
      return error ? [] : data.map(mapProduct)
    })
  },

  async findProductById(id) {
    const { data, error } = await supabase
      .from('products')
      .select(PRODUCT_COLUMNS)
      .eq('id', id)
      .limit(1)
      .single()
    return error || !data ? null : mapProduct(data)
  },

  async createProduct(data) {
    const id = data.id || newEntityId('product')
    const insertPayload = {
      ...baseProductInsertPayload(id, data),
      ...advancedProductFields(data),
    }

    let { data: result, error } = await supabase
      .from('products')
      .insert(insertPayload)
      .select(PRODUCT_COLUMNS)
      .limit(1)
      .single()

    if (isMissingOptionalProductColumn(error)) {
      console.warn('⚠️ Colonnes produits avancées absentes dans Supabase. Publication sans champs avancés. Exécutez backend/supabase-product-details.sql.')
      ;({ data: result, error } = await supabase
        .from('products')
        .insert(baseProductInsertPayload(id, data))
        .select(PRODUCT_COLUMNS)
        .limit(1)
        .single())
    }

    if (error) {
      console.error('❌ Erreur création produit Supabase:', error.message)
      return null
    }

    invalidateCache('products:')
    return !result ? null : mapProduct(result)
  },

  async updateProduct(id, patch) {
    const updates = {
      updated_at: new Date().toISOString(),
    }
    
    if (patch.name) updates.name = patch.name
    if (patch.price !== undefined) updates.price = patch.price
    if (patch.image !== undefined) updates.image_url = patch.image
    if (patch.description !== undefined) updates.description = patch.description
    if (patch.category !== undefined) updates.category = patch.category
    if (patch.visible !== undefined) updates.is_visible = patch.visible !== false
    if (patch.status !== undefined) updates.is_visible = patch.status !== 'hidden'
    const advancedUpdates = {}
    if (patch.availability !== undefined) advancedUpdates.availability = patch.availability || 'available'
    if (patch.stock !== undefined) advancedUpdates.stock = patch.stock || ''
    if (patch.badge !== undefined) advancedUpdates.badge = patch.badge || ''
    if (patch.oldPrice !== undefined) advancedUpdates.old_price = patch.oldPrice || null
    if (patch.variantInfo !== undefined) advancedUpdates.variant_info = patch.variantInfo || ''
    if (patch.extraInfo !== undefined) advancedUpdates.extra_info = patch.extraInfo || ''
    Object.assign(updates, advancedUpdates)

    let { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(PRODUCT_COLUMNS)
      .limit(1)
      .single()

    if (isMissingOptionalProductColumn(error)) {
      console.warn('⚠️ Colonnes produits avancées absentes dans Supabase. Mise à jour sans champs avancés. Exécutez backend/supabase-product-details.sql.')
      Object.keys(advancedUpdates).forEach((key) => delete updates[key])
      ;({ data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select(PRODUCT_COLUMNS)
        .limit(1)
        .single())
    }

    if (error) {
      console.error('❌ Erreur mise à jour produit Supabase:', error.message)
      return null
    }

    invalidateCache('products:')
    return !data ? null : mapProduct(data)
  },

  async deleteProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select(PRODUCT_COLUMNS)
      .limit(1)
      .single()
    invalidateCache('products:')
    return error || !data ? null : mapProduct(data)
  },

  async listPayments() {
    return cached('payments:list', CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(PAYMENT_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(ADMIN_LIMIT)
      return error ? [] : data.map(mapPayment)
    })
  },

  async findPaymentById(id) {
    const { data, error } = await supabase
      .from('payments')
      .select(PAYMENT_COLUMNS)
      .eq('id', id)
      .limit(1)
      .single()
    return error || !data ? null : mapPayment(data)
  },

  async findPaymentByReference(reference) {
    const { data, error } = await supabase
      .from('payments')
      .select(PAYMENT_COLUMNS)
      .eq('reference', reference)
      .limit(1)
      .single()
    return error || !data ? null : mapPayment(data)
  },

  async createPayment(data) {
    const id = data.id || newEntityId('payment')
    const adminNote = data.premiumOrder
      ? JSON.stringify({
          premiumOrder: {
            ...data.premiumOrder,
            paymentStatus: data.paymentStatus,
            projectStatus: data.projectStatus,
          },
        })
      : (data.adminNote || '')

    const { data: result, error } = await supabase
      .from('payments')
      .insert({
        id,
        user_id: data.userId || null,
        site_id: data.siteId || null,
        type: data.type,
        amount: data.amount,
        step: data.step || 'full',
        status: data.status || 'pending',
        method: data.method || 'fedapay',
        reference: data.reference || `PAY-${Date.now()}`,
        admin_note: adminNote,
        paid_at: data.paidAt ? new Date(data.paidAt).toISOString() : null,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select(PAYMENT_COLUMNS)
      .limit(1)
      .single()
    if (error) {
      console.error('❌ Erreur création paiement Supabase:', error.message)
      return null
    }

    invalidateCache('payments:')
    return !result ? null : mapPayment(result)
  },

  async patchPayment(id, patch) {
    const existing = await this.findPaymentById(id)
    let notePayload = {}

    if (existing?.adminNote) {
      try {
        notePayload = JSON.parse(existing.adminNote)
      } catch (_error) {
        notePayload = { note: existing.adminNote }
      }
    }

    if (existing?.premiumOrder || notePayload.premiumOrder) {
      notePayload.premiumOrder = {
        ...(notePayload.premiumOrder || existing.premiumOrder || {}),
      }
    }

    const updates = {
      updated_at: new Date().toISOString(),
    }
    
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.paidAt !== undefined) updates.paid_at = patch.paidAt ? new Date(patch.paidAt).toISOString() : null
    if (patch.validatedAt !== undefined) updates.paid_at = patch.validatedAt ? new Date(patch.validatedAt).toISOString() : null

    for (const key of [
      'validationStatus',
      'transactionId',
      'paymentStatus',
      'projectStatus',
      'deliveryStartedAt',
      'deliveryTargetAt',
      'mobileMoneyPhone',
      'mobileMoneyProvider',
      'smsCode',
    ]) {
      if (patch[key] !== undefined) {
        if (notePayload.premiumOrder) {
          notePayload.premiumOrder[key] = patch[key]
        } else {
          notePayload[key] = patch[key]
        }
      }
    }

    if (Object.keys(notePayload).length) {
      updates.admin_note = JSON.stringify(notePayload)
    }

    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select(PAYMENT_COLUMNS)
      .limit(1)
      .single()
    if (error) {
      console.error('❌ Erreur mise à jour paiement Supabase:', error.message)
      return null
    }

    invalidateCache('payments:')
    return !data ? null : mapPayment(data)
  },

  async countAutonomePaid() {
    const { count, error } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'autonome')
      .in('status', ['paid', 'paye'])
      .limit(1)
    return error ? 0 : count
  },

  async countPremiumAcomptePaid() {
    const { count, error } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .eq('type', 'premium')
      .eq('step', 'acompte')
      .in('status', ['paid', 'paye'])
      .limit(1)
    return error ? 0 : count
  },

  // Tickets from Supabase
  async listTickets() {
    return cached('tickets:list', CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select(TICKET_COLUMNS)
        .order('created_at', { ascending: false })
        .limit(ADMIN_LIMIT)
      if (error) return []
      return data.map(t => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name,
      userEmail: t.user_email,
      subject: t.subject,
      message: t.message,
      priority: t.priority,
      status: t.status,
      replies: t.replies || [],
      createdAt: iso(t.created_at),
      updatedAt: t.updated_at ? iso(t.updated_at) : undefined,
      }))
    })
  },

  async findTicketById(id) {
    const { data, error } = await supabase
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('id', id)
      .limit(1)
      .single()
    if (error || !data) return null
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userEmail: data.user_email,
      subject: data.subject,
      message: data.message,
      priority: data.priority,
      status: data.status,
      replies: data.replies || [],
      createdAt: iso(data.created_at),
      updatedAt: data.updated_at ? iso(data.updated_at) : undefined,
    }
  },

  async findTicketsByUserId(userId) {
    const { data, error } = await supabase
      .from('tickets')
      .select(TICKET_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(DEFAULT_LIMIT)
    if (error) return []
    return data.map(t => ({
      id: t.id,
      userId: t.user_id,
      userName: t.user_name,
      userEmail: t.user_email,
      subject: t.subject,
      message: t.message,
      priority: t.priority,
      status: t.status,
      replies: t.replies || [],
      createdAt: iso(t.created_at),
      updatedAt: t.updated_at ? iso(t.updated_at) : undefined,
    }))
  },

  async createTicket(data) {
    const id = data.id || newEntityId('ticket')
    const { data: result, error } = await supabase
      .from('tickets')
      .insert({
        id,
        user_id: data.userId,
        user_name: data.userName,
        user_email: data.userEmail,
        subject: data.subject,
        message: data.message,
        priority: data.priority || 'normal',
        status: data.status || 'open',
        replies: data.replies || [],
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select(TICKET_COLUMNS)
      .limit(1)
      .single()
    if (error || !result) return null
    invalidateCache('tickets:')
    return {
      id: result.id,
      userId: result.user_id,
      userName: result.user_name,
      userEmail: result.user_email,
      subject: result.subject,
      message: result.message,
      priority: result.priority,
      status: result.status,
      replies: result.replies || [],
      createdAt: iso(result.created_at),
      updatedAt: result.updated_at ? iso(result.updated_at) : undefined,
    }
  },

  async addReplyToTicket(id, reply) {
    const { data: ticket } = await supabase
      .from('tickets')
      .select('replies')
      .eq('id', id)
      .limit(1)
      .single()
    
    if (!ticket) return null

    const updatedReplies = [...(ticket.replies || []), reply]
    const { data: result, error } = await supabase
      .from('tickets')
      .update({ replies: updatedReplies })
      .eq('id', id)
      .select(TICKET_COLUMNS)
      .limit(1)
      .single()
    
    if (error || !result) return null
    invalidateCache('tickets:')
    return {
      id: result.id,
      userId: result.user_id,
      userName: result.user_name,
      userEmail: result.user_email,
      subject: result.subject,
      message: result.message,
      priority: result.priority,
      status: result.status,
      replies: result.replies || [],
      createdAt: iso(result.created_at),
      updatedAt: iso(result.updated_at),
    }
  },

  async updateTicketStatus(id, status) {
    const { data, error } = await supabase
      .from('tickets')
      .update({ status })
      .eq('id', id)
      .select(TICKET_COLUMNS)
      .limit(1)
      .single()
    if (error || !data) return null
    invalidateCache('tickets:')
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userEmail: data.user_email,
      subject: data.subject,
      message: data.message,
      priority: data.priority,
      status: data.status,
      replies: data.replies || [],
      createdAt: iso(data.created_at),
      updatedAt: iso(data.updated_at),
    }
  },

  async deleteTicket(id) {
    const { data, error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)
      .select(TICKET_COLUMNS)
      .limit(1)
      .single()
    if (error || !data) return null
    invalidateCache('tickets:')
    return {
      id: data.id,
      userId: data.user_id,
      userName: data.user_name,
      userEmail: data.user_email,
      subject: data.subject,
      message: data.message,
      priority: data.priority,
      status: data.status,
      replies: data.replies || [],
      createdAt: iso(data.created_at),
      updatedAt: data.updated_at ? iso(data.updated_at) : undefined,
    }
  },

  // Tracking from Supabase
  async addTracking(data) {
    const id = data.id || newEntityId('track')
    const { data: result, error } = await supabase
      .from('tracking')
      .insert({
        id,
        site_id: data.siteId,
        product_id: data.productId || null,
        type: data.type,
        visitor_id: data.visitorId || null,
        session_id: data.sessionId || null,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        referrer: data.referrer || null,
        platform: data.platform || null,
        time_spent: data.timeSpent || null,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select(TRACKING_COLUMNS)
      .limit(1)
      .single()
    return error || !result ? data : { ...data, id: result.id }
  },

  async getTrackingBySite(siteId) {
    const { data, error } = await supabase
      .from('tracking')
      .select(TRACKING_COLUMNS)
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
      .limit(TRACKING_LIMIT)
    return error ? [] : data.map(t => ({
      id: t.id,
      siteId: t.site_id,
      productId: t.product_id,
      type: t.type,
      visitorId: t.visitor_id,
      sessionId: t.session_id,
      ipAddress: t.ip_address,
      userAgent: t.user_agent,
      referrer: t.referrer,
      platform: t.platform,
      timeSpent: t.time_spent,
      timestamp: iso(t.created_at),
      createdAt: iso(t.created_at),
    }))
  },

  async addLinkVisit(data) {
    const id = data.id || newEntityId('link-visit')
    const payload = {
      id,
      user_id: data.userId,
      site_id: data.siteId,
      source: data.source || 'direct',
      visited_at: data.visitedAt ? new Date(data.visitedAt).toISOString() : new Date().toISOString(),
      week_number: data.weekNumber,
      year: data.year,
      created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('link_visits')
      .insert(payload)
      .select(LINK_VISIT_COLUMNS)
      .limit(1)
      .single()

    if (error) {
      console.error('❌ Erreur création link_visit Supabase:', error.message)
      return { ...data, id }
    }

    invalidateCache(`link_visits:${data.siteId}:`)
    return {
      id: result.id,
      userId: result.user_id,
      siteId: result.site_id,
      source: result.source,
      visitedAt: iso(result.visited_at),
      weekNumber: result.week_number,
      year: result.year,
      createdAt: iso(result.created_at),
    }
  },

  async getLinkVisitsBySiteWeek(siteId, weekNumber, year) {
    const cacheKey = `link_visits:${siteId}:${year}:${weekNumber}`
    return cached(cacheKey, CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('link_visits')
        .select(LINK_VISIT_COLUMNS)
        .eq('site_id', siteId)
        .eq('week_number', weekNumber)
        .eq('year', year)
        .order('visited_at', { ascending: false })
        .limit(TRACKING_LIMIT)

      return error ? [] : data.map((row) => ({
        id: row.id,
        userId: row.user_id,
        siteId: row.site_id,
        source: row.source,
        visitedAt: iso(row.visited_at),
        weekNumber: row.week_number,
        year: row.year,
        createdAt: iso(row.created_at),
      }))
    })
  },

  async addSiteVisit(data) {
    const id = data.id || newEntityId('site-visit')
    const visitedAt = data.visitedAt ? new Date(data.visitedAt) : new Date()
    const payload = {
      id,
      shop_id: data.userId,
      site_id: data.siteId,
      ip_address: data.ipAddress || null,
      visitor_id: data.visitorId || null,
      source: data.source || 'direct',
      visited_at: visitedAt.toISOString(),
      visit_date: visitedAt.toISOString().slice(0, 10),
      week_number: data.weekNumber,
      year: data.year,
      created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
    }

    const { data: result, error } = await supabase
      .from('site_visits')
      .insert(payload)
      .select(SITE_VISIT_COLUMNS)
      .limit(1)
      .single()

    if (error) {
      if (error.code !== '23505') console.error('❌ Erreur création site_visit Supabase:', error.message)
      return { ...data, id, duplicate: error.code === '23505' }
    }

    invalidateCache(`site_visits:${data.siteId}:`)
    return {
      id: result.id,
      userId: result.shop_id,
      siteId: result.site_id,
      source: result.source,
      visitorId: result.visitor_id,
      ipAddress: result.ip_address,
      visitedAt: iso(result.visited_at),
      weekNumber: result.week_number,
      year: result.year,
      createdAt: iso(result.created_at),
    }
  },

  async addProductEvent(data) {
    const id = data.id || newEntityId('product-event')
    const createdAt = data.createdAt ? new Date(data.createdAt) : new Date()
    const payload = {
      id,
      shop_id: data.userId,
      site_id: data.siteId,
      product_id: data.productId,
      event_type: data.eventType,
      ip_address: data.ipAddress || null,
      visitor_id: data.visitorId || null,
      created_at: createdAt.toISOString(),
      event_date: createdAt.toISOString().slice(0, 10),
      week_number: data.weekNumber,
      year: data.year,
    }

    const { data: result, error } = await supabase
      .from('product_events')
      .insert(payload)
      .select(PRODUCT_EVENT_COLUMNS)
      .limit(1)
      .single()

    if (error) {
      if (error.code !== '23505') console.error('❌ Erreur création product_event Supabase:', error.message)
      return { ...data, id, duplicate: error.code === '23505' }
    }

    invalidateCache(`product_events:${data.siteId}:`)
    return {
      id: result.id,
      userId: result.shop_id,
      siteId: result.site_id,
      productId: result.product_id,
      eventType: result.event_type,
      visitorId: result.visitor_id,
      ipAddress: result.ip_address,
      createdAt: iso(result.created_at),
      weekNumber: result.week_number,
      year: result.year,
    }
  },

  async getSiteVisitsBySiteWeek(siteId, weekNumber, year) {
    const cacheKey = `site_visits:${siteId}:${year}:${weekNumber}`
    return cached(cacheKey, CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('site_visits')
        .select(SITE_VISIT_COLUMNS)
        .eq('site_id', siteId)
        .eq('week_number', weekNumber)
        .eq('year', year)
        .order('visited_at', { ascending: false })
        .limit(TRACKING_LIMIT)

      return error ? [] : data.map((row) => ({
        id: row.id,
        userId: row.shop_id,
        siteId: row.site_id,
        source: row.source,
        visitorId: row.visitor_id,
        ipAddress: row.ip_address,
        visitedAt: iso(row.visited_at),
        weekNumber: row.week_number,
        year: row.year,
        createdAt: iso(row.created_at),
      }))
    })
  },

  async getProductEventsBySiteWeek(siteId, weekNumber, year) {
    const cacheKey = `product_events:${siteId}:${year}:${weekNumber}`
    return cached(cacheKey, CACHE_TTL_MS, async () => {
      const { data, error } = await supabase
        .from('product_events')
        .select(PRODUCT_EVENT_COLUMNS)
        .eq('site_id', siteId)
        .eq('week_number', weekNumber)
        .eq('year', year)
        .order('created_at', { ascending: false })
        .limit(TRACKING_LIMIT)

      return error ? [] : data.map((row) => ({
        id: row.id,
        userId: row.shop_id,
        siteId: row.site_id,
        productId: row.product_id,
        eventType: row.event_type,
        visitorId: row.visitor_id,
        ipAddress: row.ip_address,
        createdAt: iso(row.created_at),
        weekNumber: row.week_number,
        year: row.year,
      }))
    })
  },

  async createOrder(data) {
    const siteOrderNumber = Number(data.siteOrderNumber || Date.now())
    const id = data.id || newEntityId('order')
    const reference = data.reference || `${String(data.siteName || 'SHOPLINK')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 28) || 'SHOPLINK'}-${String(siteOrderNumber).padStart(4, '0')}`

    const { data: orderRow, error } = await supabase
      .from('orders')
      .insert({
        id,
        reference,
        site_order_number: siteOrderNumber,
        site_id: data.siteId,
        site_slug: data.siteSlug || '',
        site_name: data.siteName || '',
        seller_user_id: data.sellerUserId,
        buyer_name: data.buyerName,
        buyer_phone: data.buyerPhone,
        buyer_address: data.buyerAddress || '',
        buyer_note: data.buyerNote || '',
        total_amount: data.totalAmount || 0,
        currency: data.currency || 'FCFA',
        source: data.source || 'direct',
        status: data.status || 'pending_payment',
        payment_status: data.paymentStatus || 'pending',
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select(ORDER_COLUMNS)
      .limit(1)
      .single()

    if (error || !orderRow) {
      console.error('❌ Erreur création commande Supabase:', error && error.message)
      return null
    }

    const items = (data.items || []).map((item) => ({
      id: item.id || newEntityId('order-item'),
      order_id: orderRow.id,
      product_id: item.productId || null,
      name: item.name,
      category: item.category || '',
      quantity: Number(item.quantity || 1),
      unit_price: Number(item.unitPrice || 0),
      total: Number(item.total || 0),
      created_at: new Date().toISOString(),
    }))

    let savedItems = []
    if (items.length) {
      const { data: itemRows, error: itemError } = await supabase
        .from('order_items')
        .insert(items)
        .select(ORDER_ITEM_COLUMNS)
        .limit(DEFAULT_LIMIT)

      if (itemError) {
        console.error('❌ Erreur création lignes commande Supabase:', itemError.message)
      } else {
        savedItems = (itemRows || []).map(mapOrderItem)
      }
    }

    invalidateCache(`orders:site:${orderRow.site_id}`)
    return mapOrder(orderRow, savedItems)
  },

  async findOrderById(id) {
    const { data: orderRow, error } = await supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('id', id)
      .limit(1)
      .single()
    if (error || !orderRow) return null

    const { data: itemRows } = await supabase
      .from('order_items')
      .select(ORDER_ITEM_COLUMNS)
      .eq('order_id', id)
      .limit(DEFAULT_LIMIT)

    return mapOrder(orderRow, (itemRows || []).map(mapOrderItem))
  },

  async listOrdersBySiteId(siteId) {
    return cached(`orders:site:${siteId}`, CACHE_TTL_MS, async () => {
      const { data: rows, error } = await supabase
        .from('orders')
        .select(ORDER_COLUMNS)
        .eq('site_id', siteId)
        .order('created_at', { ascending: false })
        .limit(ADMIN_LIMIT)
      if (error || !rows) return []

      const orderIds = rows.map((row) => row.id)
      let itemsByOrder = new Map()
      if (orderIds.length) {
        const { data: itemRows } = await supabase
          .from('order_items')
          .select(ORDER_ITEM_COLUMNS)
          .in('order_id', orderIds)
          .limit(ADMIN_LIMIT * 10)
        ;(itemRows || []).forEach((row) => {
          if (!itemsByOrder.has(row.order_id)) itemsByOrder.set(row.order_id, [])
          itemsByOrder.get(row.order_id).push(mapOrderItem(row))
        })
      }

      return rows.map((row) => mapOrder(row, itemsByOrder.get(row.id) || []))
    })
  },

  async updateOrder(id, patch) {
    const updates = { updated_at: new Date().toISOString() }
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.paymentStatus !== undefined) updates.payment_status = patch.paymentStatus
    if (patch.paymentMethod !== undefined) updates.payment_method = patch.paymentMethod
    if (patch.payerName !== undefined) updates.payer_name = patch.payerName
    if (patch.payerPhone !== undefined) updates.payer_phone = patch.payerPhone
    if (patch.transactionReference !== undefined) updates.transaction_reference = patch.transactionReference
    if (patch.paymentSubmittedAt !== undefined) updates.payment_submitted_at = patch.paymentSubmittedAt ? new Date(patch.paymentSubmittedAt).toISOString() : null
    if (patch.cancelledAt !== undefined) updates.cancelled_at = patch.cancelledAt ? new Date(patch.cancelledAt).toISOString() : null
    if (patch.cancellationSource !== undefined) updates.cancellation_source = patch.cancellationSource

    const { data: row, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select(ORDER_COLUMNS)
      .limit(1)
      .single()
    if (error || !row) return null

    invalidateCache(`orders:site:${row.site_id}`)
    return this.findOrderById(id)
  },

  // Admin-specific functions
  async getSummary() {
    const [usersResult, sitesResult, productsResult, paymentsResult] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).limit(1),
      supabase.from('sites').select('id', { count: 'exact', head: true }).limit(1),
      supabase.from('products').select('id', { count: 'exact', head: true }).limit(1),
      supabase.from('payments').select('id', { count: 'exact', head: true }).limit(1),
    ])

    const paidPaymentsResult = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'paid')
      .limit(ADMIN_LIMIT)

    const totalRevenue = paidPaymentsResult.data ? 
      paidPaymentsResult.data.reduce((sum, p) => sum + (p.amount || 0), 0) : 0

    return {
      success: true,
      data: {
        users: usersResult.count || 0,
        sites: sitesResult.count || 0,
        products: productsResult.count || 0,
        payments: paymentsResult.count || 0,
        revenue: totalRevenue,
      }
    }
  },

  async listPremiumProjects() {
    const { data, error } = await supabase
      .from('premium_orders')
      .select('id,user_id,site_id,manager_name,email,whatsapp,site_type,activity_type,delai,acompte_paid_at,status,created_at')
      .order('created_at', { ascending: false })
      .limit(ADMIN_LIMIT)
    
    if (error || !data) return { success: false, projects: [] }

    const projects = data.map(p => ({
      id: p.id,
      userId: p.user_id,
      siteId: p.site_id,
      clientName: p.manager_name,
      clientEmail: p.email,
      whatsapp: p.whatsapp,
      siteType: p.site_type,
      activityType: p.activity_type,
      deliveryDays: p.delai === 'urgent' ? 14 : 21,
      depositAmount: 5000,
      totalAmount: 10000,
      depositPaid: !!p.acompte_paid_at,
      depositDate: p.acompte_paid_at,
      status: p.status,
      progress: p.status === 'pending' ? 0 : p.status === 'in_progress' ? 50 : p.status === 'delivered' ? 100 : 0,
      currentStage: p.status === 'pending' ? 'En attente' : p.status === 'in_progress' ? 'Design en cours' : 'Livré',
      createdAt: p.created_at,
    }))

    return { success: true, projects }
  },

  async getMyPremiumProject(userId) {
    const { data, error } = await supabase
      .from('premium_orders')
      .select(PREMIUM_ORDER_COLUMNS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !data) return { success: false, project: null }

    return {
      success: true,
      project: {
        id: data.id,
        userId: data.user_id,
        siteId: data.site_id,
        siteType: data.site_type,
        deliveryDays: data.delai === 'urgent' ? 14 : 21,
        depositPaid: !!data.acompte_paid_at,
        depositDate: data.acompte_paid_at,
        status: data.status,
        progress: data.status === 'pending' ? 0 : data.status === 'in_progress' ? 50 : data.status === 'delivered' ? 100 : 0,
        currentStage: data.status === 'pending' ? 'En attente' : data.status === 'in_progress' ? 'Design en cours' : 'Livré',
        createdAt: data.created_at,
      }
    }
  },
}
