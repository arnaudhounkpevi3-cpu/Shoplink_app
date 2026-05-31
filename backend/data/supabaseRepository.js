const bcrypt = require('bcryptjs')
const supabase = require('../config/supabase')

function iso(d) {
  if (!d) {
    return undefined
  }
  return d instanceof Date ? d.toISOString() : new Date(d).toISOString()
}

function newEntityId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
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
  return {
    id: p.id,
    siteId: p.site_id,
    userId: p.user_id,
    name: p.name,
    price: p.price,
    image: p.image_url || '',
    description: p.description || '',
    category: p.category || 'General',
    createdAt: iso(p.created_at),
    updatedAt: p.updated_at ? iso(p.updated_at) : undefined,
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
    paidAt: p.paid_at ? iso(p.paid_at) : undefined,
    createdAt: iso(p.created_at),
    updatedAt: p.updated_at ? iso(p.updated_at) : undefined,
  }
}

async function seedIfEmpty() {
  try {
    const { count, error: countError } = await supabase.from('users').select('*', { count: 'exact', head: true })
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
      .select('*')
      .eq('email', String(email).toLowerCase())
      .single()
    return error || !data ? null : mapUser(data)
  },

  async findUserById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
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
      .select()
      .single()
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
      .select()
      .single()

    return error || !result ? null : mapUser(result)
  },

  async listUsers() {
    const { data, error } = await supabase.from('users').select('*')
    return error ? [] : data.map(mapUser)
  },

  async listSites() {
    const { data, error } = await supabase.from('sites').select('*')
    return error ? [] : data.map(mapSite)
  },

  async findSiteById(id) {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('id', id)
      .single()
    return error || !data ? null : mapSite(data)
  },

  async findSiteBySlug(slug) {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('slug', slug)
      .single()
    return error || !data ? null : mapSite(data)
  },

  async findSitesByUserId(userId) {
    const { data, error } = await supabase
      .from('sites')
      .select('*')
      .eq('user_id', userId)
    return error ? [] : data.map(mapSite)
  },

  async slugTaken(slug) {
    const { data, error } = await supabase
      .from('sites')
      .select('id', { count: 'exact', head: true })
      .eq('slug', slug)
    return error ? false : data > 0
  },

  async createSite(data) {
    const id = data.id || newEntityId('site')
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
        activity_type: (data.activityType || 'Boutique').toLowerCase(),
        primary_color: data.primaryColor || '#d9643a',
        status: data.status || 'draft',
        published_at: data.publishedAt ? new Date(data.publishedAt).toISOString() : null,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select()
      .single()
    return error || !result ? null : mapSite(result)
  },

  async updateSite(id, patch) {
    const updates = {
      updated_at: new Date().toISOString(),
    }
    
    if (patch.name) updates.name = patch.name
    if (patch.slogan !== undefined) updates.slogan = patch.slogan
    if (patch.logo !== undefined) updates.logo_url = patch.logo
    if (patch.description !== undefined) updates.description = patch.description
    if (patch.whatsapp !== undefined) updates.whatsapp = patch.whatsapp
    if (patch.secondaryPhone !== undefined) updates.phone2 = patch.secondaryPhone
    if (patch.address !== undefined) updates.address = patch.address
    if (patch.activityType !== undefined) updates.activity_type = patch.activityType.toLowerCase()
    if (patch.primaryColor !== undefined) updates.primary_color = patch.primaryColor
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.publishedAt !== undefined) updates.published_at = patch.publishedAt ? new Date(patch.publishedAt).toISOString() : null

    const { data, error } = await supabase
      .from('sites')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return error || !data ? null : mapSite(data)
  },

  async deleteSite(id) {
    // Delete products first
    await supabase.from('products').delete().eq('site_id', id)
    
    const { data, error } = await supabase
      .from('sites')
      .delete()
      .eq('id', id)
      .select()
      .single()
    return error || !data ? null : mapSite(data)
  },

  async listProductsBySiteId(siteId) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('site_id', siteId)
    return error ? [] : data.map(mapProduct)
  },

  async findProductById(id) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single()
    return error || !data ? null : mapProduct(data)
  },

  async createProduct(data) {
    const id = data.id || newEntityId('product')
    const { data: result, error } = await supabase
      .from('products')
      .insert({
        id,
        site_id: data.siteId,
        user_id: data.userId,
        name: data.name,
        price: data.price,
        image_url: data.image || '',
        description: data.description || '',
        category: data.category || 'General',
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select()
      .single()
    return error || !result ? null : mapProduct(result)
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

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return error || !data ? null : mapProduct(data)
  },

  async deleteProduct(id) {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', id)
      .select()
      .single()
    return error || !data ? null : mapProduct(data)
  },

  async listPayments() {
    const { data, error } = await supabase.from('payments').select('*')
    return error ? [] : data.map(mapPayment)
  },

  async findPaymentById(id) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single()
    return error || !data ? null : mapPayment(data)
  },

  async findPaymentByReference(reference) {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('reference', reference)
      .single()
    return error || !data ? null : mapPayment(data)
  },

  async createPayment(data) {
    const id = data.id || newEntityId('payment')
    const { data: result, error } = await supabase
      .from('payments')
      .insert({
        id,
        user_id: data.userId,
        site_id: data.siteId || '',
        type: data.type,
        amount: data.amount,
        step: data.step || 'full',
        status: data.status || 'pending',
        method: data.method || 'fedapay',
        reference: data.reference || `PAY-${Date.now()}`,
        admin_note: data.premiumOrder ? JSON.stringify({ premiumOrder: data.premiumOrder }) : (data.adminNote || ''),
        paid_at: data.paidAt ? new Date(data.paidAt).toISOString() : null,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select()
      .single()
    return error || !result ? null : mapPayment(result)
  },

  async patchPayment(id, patch) {
    const updates = {
      updated_at: new Date().toISOString(),
    }
    
    if (patch.status !== undefined) updates.status = patch.status
    if (patch.validationStatus !== undefined) updates.admin_note = patch.validationStatus
    if (patch.paidAt !== undefined) updates.paid_at = patch.paidAt ? new Date(patch.paidAt).toISOString() : null
    if (patch.transactionId !== undefined) updates.admin_note = patch.transactionId

    const { data, error } = await supabase
      .from('payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    return error || !data ? null : mapPayment(data)
  },

  async countAutonomePaid() {
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'autonome')
      .in('status', ['paid', 'paye'])
    return error ? 0 : count
  },

  async countPremiumAcomptePaid() {
    const { count, error } = await supabase
      .from('payments')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'premium')
      .eq('step', 'acompte')
      .in('status', ['paid', 'paye'])
    return error ? 0 : count
  },

  // Tickets from Supabase
  async listTickets() {
    const { data, error } = await supabase.from('tickets').select('*')
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

  async findTicketById(id) {
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('id', id)
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
      .select('*')
      .eq('user_id', userId)
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
      .select()
      .single()
    if (error || !result) return null
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
      .single()
    
    if (!ticket) return null

    const updatedReplies = [...(ticket.replies || []), reply]
    const { data: result, error } = await supabase
      .from('tickets')
      .update({ replies: updatedReplies })
      .eq('id', id)
      .select()
      .single()
    
    if (error || !result) return null
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
      .select()
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
      updatedAt: iso(data.updated_at),
    }
  },

  async deleteTicket(id) {
    const { data, error } = await supabase
      .from('tickets')
      .delete()
      .eq('id', id)
      .select()
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

  // Tracking from Supabase
  async addTracking(data) {
    const id = data.id || newEntityId('track')
    const { data: result, error } = await supabase
      .from('tracking')
      .insert({
        id,
        site_id: data.siteId,
        type: data.type,
        ip_address: data.ipAddress || null,
        user_agent: data.userAgent || null,
        referrer: data.referrer || null,
        created_at: data.createdAt ? new Date(data.createdAt).toISOString() : new Date().toISOString(),
      })
      .select()
      .single()
    return error || !result ? data : { ...data, id: result.id }
  },

  async getTrackingBySite(siteId) {
    const { data, error } = await supabase
      .from('tracking')
      .select('*')
      .eq('site_id', siteId)
      .order('created_at', { ascending: false })
    return error ? [] : data.map(t => ({
      id: t.id,
      siteId: t.site_id,
      type: t.type,
      ipAddress: t.ip_address,
      userAgent: t.user_agent,
      referrer: t.referrer,
      createdAt: iso(t.created_at),
    }))
  },

  // Admin-specific functions
  async getSummary() {
    const [usersResult, sitesResult, productsResult, paymentsResult] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('sites').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('payments').select('*', { count: 'exact', head: true }),
    ])

    const paidPaymentsResult = await supabase
      .from('payments')
      .select('amount', { count: 'exact', head: true })
      .eq('status', 'paid')

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
      .select('*, users(name, email), sites(name, slug)')
    
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
      .select('*')
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
