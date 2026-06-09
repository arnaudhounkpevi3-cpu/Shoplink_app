const {
  state,
  nextUserId,
  nextSiteId,
  nextProductId,
  nextPaymentId,
  nextTicketId,
  saveState,
} = require('./store')
const { getActivityTheme } = require('../utils/activityTheme')

function mapUser(u) {
  if (!u) {
    return null
  }
  return { ...u }
}

module.exports = {
  async seedIfEmpty() {},

  async findUserByEmail(email) {
    const u = state.users.find(
      (user) => user.email.toLowerCase() === String(email).toLowerCase(),
    )
    return u ? mapUser(u) : null
  },

  async findUserById(id) {
    const u = state.users.find((entry) => entry.id === id)
    return u ? mapUser(u) : null
  },

  async createUser(data) {
    const user = {
      id: data.id || nextUserId(),
      name: data.name,
      email: data.email,
      phone: data.phone || '',
      role: data.role || 'user',
      paiement: Boolean(data.paiement || false),
      passwordHash: data.passwordHash,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.users.push(user)
    saveState()
    return mapUser(user)
  },

  async updateUser(id, patch) {
    const user = state.users.find((entry) => entry.id === id)
    if (!user) {
      return null
    }

    Object.assign(user, patch, { updatedAt: new Date().toISOString() })
    saveState()
    return mapUser(user)
  },

  async listUsers() {
    return state.users.map(mapUser)
  },

  async listSites() {
    return state.sites.map((s) => ({ ...s }))
  },

  async findSiteById(id) {
    const s = state.sites.find((entry) => entry.id === id)
    return s ? { ...s } : null
  },

  async findSiteBySlug(slug) {
    const s = state.sites.find((entry) => entry.slug === slug)
    return s ? { ...s } : null
  },

  async findSitesByUserId(userId) {
    return state.sites.filter((site) => site.userId === userId).map((s) => ({ ...s }))
  },

  async slugTaken(slug) {
    return state.sites.some((site) => site.slug === slug)
  },

  async createSite(data) {
    const theme = getActivityTheme(data.activityType)
    const site = {
      id: data.id || nextSiteId(),
      userId: data.userId,
      name: data.name,
      slug: data.slug,
      slogan: data.slogan || '',
      logo: data.logo || '',
      description: data.description || '',
      whatsapp: data.whatsapp || '',
      secondaryPhone: data.secondaryPhone || '',
      address: data.address || '',
      activityType: theme.activityType,
      activityLabel: theme.activityType === 'autre' ? String(data.activityLabel || '').trim() : '',
      primaryColor: data.primaryColor || theme.primaryColor,
      secondaryColor: data.secondaryColor || theme.secondaryColor,
      status: data.status || 'draft',
      createdAt: data.createdAt || new Date().toISOString(),
      publishedAt: data.publishedAt,
    }
    state.sites.push(site)
    saveState()
    return { ...site }
  },

  async updateSite(id, patch) {
    const site = state.sites.find((entry) => entry.id === id)
    if (!site) {
      return null
    }
    const nextPatch = { ...patch }
    if (patch.activityType !== undefined) {
      const theme = getActivityTheme(patch.activityType)
      nextPatch.activityType = theme.activityType
      nextPatch.activityLabel = theme.activityType === 'autre' ? String(patch.activityLabel || site.activityLabel || '').trim() : ''
      if (patch.primaryColor === undefined) nextPatch.primaryColor = theme.primaryColor
      if (patch.secondaryColor === undefined) nextPatch.secondaryColor = theme.secondaryColor
    }
    if (patch.activityLabel !== undefined && (nextPatch.activityType || site.activityType) === 'autre') {
      nextPatch.activityLabel = String(patch.activityLabel || '').trim()
    }
    Object.assign(site, nextPatch, { updatedAt: new Date().toISOString() })
    saveState()
    return { ...site }
  },

  async deleteSite(id) {
    const index = state.sites.findIndex((entry) => entry.id === id)
    if (index === -1) {
      return null
    }
    const [deletedSite] = state.sites.splice(index, 1)
    state.products = state.products.filter((product) => product.siteId !== deletedSite.id)
    saveState()
    return { ...deletedSite }
  },

  async listProductsBySiteId(siteId) {
    return state.products.filter((p) => p.siteId === siteId).map((p) => ({ ...p }))
  },

  async findProductById(id) {
    const p = state.products.find((entry) => entry.id === id)
    return p ? { ...p } : null
  },

  async createProduct(data) {
    const product = {
      id: data.id || nextProductId(),
      siteId: data.siteId,
      name: data.name,
      price: data.price,
      image: data.image || '',
      description: data.description || '',
      category: data.category || '',
      visible: data.visible !== false,
      status: data.status || (data.visible === false ? 'hidden' : 'published'),
      availability: data.availability || 'available',
      stock: data.stock || '',
      badge: data.badge || '',
      oldPrice: data.oldPrice || '',
      variantInfo: data.variantInfo || '',
      extraInfo: data.extraInfo || '',
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.products.push(product)
    saveState()
    return { ...product }
  },

  async updateProduct(id, patch) {
    const product = state.products.find((entry) => entry.id === id)
    if (!product) {
      return null
    }
    Object.assign(product, patch, { updatedAt: new Date().toISOString() })
    saveState()
    return { ...product }
  },

  async deleteProduct(id) {
    const index = state.products.findIndex((entry) => entry.id === id)
    if (index === -1) {
      return null
    }
    const [deletedProduct] = state.products.splice(index, 1)
    saveState()
    return { ...deletedProduct }
  },

  async listPayments() {
    return state.payments.map((p) => ({ ...p }))
  },

  async findPaymentById(id) {
    const p = state.payments.find((entry) => entry.id === id)
    return p ? { ...p } : null
  },

  async findPaymentByReference(reference) {
    const p = state.payments.find((entry) => entry.reference === reference)
    return p ? { ...p } : null
  },

  async createPayment(data) {
    const payment = {
      id: data.id || nextPaymentId(),
      userId: data.userId,
      type: data.type,
      amount: data.amount,
      step: data.step || 'full',
      siteId: data.siteId || '',
      urgency: data.urgency || 'normal',
      status: data.status || 'pending',
      validationStatus: data.validationStatus || 'pending',
      reference: data.reference || `PAY-${Date.now()}`,
      siteName: data.siteName,
      siteDescription: data.siteDescription,
      whatsappNumber: data.whatsappNumber,
      secondaryPhone: data.secondaryPhone,
      address: data.address,
      activityType: data.activityType,
      activityLabel: data.activityLabel || '',
      slogan: data.slogan,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      logo: data.logo,
      premiumOrder: data.premiumOrder || null,
      paymentStatus: data.paymentStatus,
      projectStatus: data.projectStatus,
      deliveryStartedAt: data.deliveryStartedAt,
      clientName: data.clientName,
      email: data.email,
      clientReference: data.clientReference,
      deliveryTargetAt: data.deliveryTargetAt,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.payments.push(payment)
    saveState()
    return { ...payment }
  },

  async patchPayment(id, patch) {
    const payment = state.payments.find((entry) => entry.id === id)
    if (!payment) {
      return null
    }
    Object.assign(payment, patch, { updatedAt: new Date().toISOString() })
    saveState()
    return { ...payment }
  },

  async countAutonomePaid() {
    return state.payments.filter(
      (payment) =>
        payment.type === 'autonome' &&
        ['paid', 'paye'].includes(String(payment.status || '').toLowerCase()),
    ).length
  },

  async countPremiumAcomptePaid() {
    return state.payments.filter(
      (payment) =>
        payment.type === 'premium' &&
        payment.step === 'acompte' &&
        ['paid', 'paye'].includes(String(payment.status || '').toLowerCase()),
    ).length
  },

  async listTickets() {
    return state.tickets.map((t) => ({ ...t }))
  },

  async findTicketById(id) {
    const t = state.tickets.find((entry) => entry.id === id)
    return t ? { ...t } : null
  },

  async findTicketsByUserId(userId) {
    return state.tickets.filter((ticket) => ticket.userId === userId).map((t) => ({ ...t }))
  },

  async createTicket(data) {
    const ticket = {
      id: data.id || nextTicketId(),
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      subject: data.subject,
      message: data.message,
      priority: data.priority || 'normal',
      status: data.status || 'open',
      replies: data.replies || [],
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.tickets.push(ticket)
    saveState()
    return { ...ticket }
  },

  async addReplyToTicket(id, reply) {
    const ticket = state.tickets.find((entry) => entry.id === id)
    if (!ticket) {
      return null
    }
    if (!ticket.replies) {
      ticket.replies = []
    }
    ticket.replies.push(reply)
    ticket.updatedAt = new Date().toISOString()
    saveState()
    return { ...ticket }
  },

  async updateTicketStatus(id, status) {
    const ticket = state.tickets.find((entry) => entry.id === id)
    if (!ticket) {
      return null
    }
    ticket.status = status
    ticket.updatedAt = new Date().toISOString()
    saveState()
    return { ...ticket }
  },

  async deleteTicket(id) {
    const index = state.tickets.findIndex((entry) => entry.id === id)
    if (index === -1) {
      return null
    }
    const [deletedTicket] = state.tickets.splice(index, 1)
    saveState()
    return { ...deletedTicket }
  },

  async addTracking(data) {
    const event = {
      ...data,
      id: data.id || `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: data.timestamp || data.createdAt || new Date().toISOString(),
      createdAt: data.createdAt || data.timestamp || new Date().toISOString(),
    }
    state.tracking.push(event)
    saveState()
    return { ...event }
  },

  async getTrackingBySite(siteId) {
    return state.tracking.filter((entry) => entry.siteId === siteId).map((entry) => ({ ...entry }))
  },

  async addRootVisit(data = {}) {
    if (!state.rootVisits) state.rootVisits = []
    const event = {
      ...data,
      id: data.id || `root-visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      path: data.path || '/',
      source: data.source || 'direct',
      visitedAt: data.visitedAt || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.rootVisits.push(event)
    saveState()
    return { ...event }
  },

  async getRootVisitStats() {
    if (!state.rootVisits) state.rootVisits = []
    const now = new Date()
    const todayStart = new Date(now)
    todayStart.setHours(0, 0, 0, 0)
    const sevenDaysAgo = new Date(now)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    return {
      total: state.rootVisits.length,
      today: state.rootVisits.filter((visit) => new Date(visit.visitedAt || visit.createdAt || 0) >= todayStart).length,
      last7Days: state.rootVisits.filter((visit) => new Date(visit.visitedAt || visit.createdAt || 0) >= sevenDaysAgo).length,
    }
  },

  async addLinkVisit(data) {
    if (!state.linkVisits) state.linkVisits = []
    const event = {
      ...data,
      id: data.id || `link-visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      visitedAt: data.visitedAt || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.linkVisits.push(event)
    saveState()
    return { ...event }
  },

  async getLinkVisitsBySiteWeek(siteId, weekNumber, year) {
    if (!state.linkVisits) state.linkVisits = []
    return state.linkVisits
      .filter((entry) => entry.siteId === siteId && Number(entry.weekNumber) === Number(weekNumber) && Number(entry.year) === Number(year))
      .map((entry) => ({ ...entry }))
  },

  async addSiteVisit(data) {
    if (!state.siteVisits) state.siteVisits = []
    const date = (data.visitedAt || new Date().toISOString()).slice(0, 10)
    const exists = state.siteVisits.some((entry) => entry.siteId === data.siteId && entry.visitorId === data.visitorId && entry.visitDate === date)
    if (exists) return { ...data, duplicate: true }
    const event = {
      ...data,
      id: data.id || `site-visit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      visitDate: date,
      visitedAt: data.visitedAt || new Date().toISOString(),
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.siteVisits.push(event)
    saveState()
    return { ...event }
  },

  async addProductEvent(data) {
    if (!state.productEvents) state.productEvents = []
    const date = (data.createdAt || new Date().toISOString()).slice(0, 10)
    if (data.eventType === 'view') {
      const exists = state.productEvents.some((entry) => entry.siteId === data.siteId && entry.productId === data.productId && entry.visitorId === data.visitorId && entry.eventDate === date && entry.eventType === 'view')
      if (exists) return { ...data, duplicate: true }
    }
    const event = {
      ...data,
      id: data.id || `product-event-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventDate: date,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.productEvents.push(event)
    saveState()
    return { ...event }
  },

  async getSiteVisitsBySiteWeek(siteId, weekNumber, year) {
    if (!state.siteVisits) state.siteVisits = []
    return state.siteVisits
      .filter((entry) => entry.siteId === siteId && Number(entry.weekNumber) === Number(weekNumber) && Number(entry.year) === Number(year))
      .map((entry) => ({ ...entry }))
  },

  async getProductEventsBySiteWeek(siteId, weekNumber, year) {
    if (!state.productEvents) state.productEvents = []
    return state.productEvents
      .filter((entry) => entry.siteId === siteId && Number(entry.weekNumber) === Number(weekNumber) && Number(entry.year) === Number(year))
      .map((entry) => ({ ...entry }))
  },

  async createOrder(data) {
    if (!state.orders) state.orders = []
    const latestSiteOrderNumber = Math.max(
      0,
      ...state.orders
        .filter((order) => order.siteId === data.siteId)
        .map((order) => Number(order.siteOrderNumber || 0))
        .filter(Number.isFinite),
    )
    const siteOrderNumber = Number(data.siteOrderNumber || latestSiteOrderNumber + 1)
    const order = {
      id: data.id || `order-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      reference: data.reference || `${String(data.siteName || 'SHOPLINK').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 28) || 'SHOPLINK'}-${String(siteOrderNumber).padStart(3, '0')}`,
      siteOrderNumber,
      siteId: data.siteId,
      siteSlug: data.siteSlug || '',
      siteName: data.siteName || '',
      sellerUserId: data.sellerUserId,
      buyerName: data.buyerName,
      buyerPhone: data.buyerPhone,
      buyerAddress: data.buyerAddress || '',
      buyerNote: data.buyerNote || '',
      items: data.items || [],
      totalAmount: Number(data.totalAmount || 0),
      currency: data.currency || 'FCFA',
      source: data.source || 'direct',
      status: data.status || 'pending_payment',
      paymentStatus: data.paymentStatus || 'pending',
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
    }
    state.orders.push(order)
    saveState()
    return { ...order }
  },

  async findOrderById(id) {
    if (!state.orders) state.orders = []
    const order = state.orders.find((entry) => entry.id === id)
    return order ? { ...order } : null
  },

  async listOrdersBySiteId(siteId) {
    if (!state.orders) state.orders = []
    return state.orders
      .filter((entry) => entry.siteId === siteId)
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .map((entry) => ({ ...entry }))
  },

  async updateOrder(id, patch) {
    if (!state.orders) state.orders = []
    const order = state.orders.find((entry) => entry.id === id)
    if (!order) return null
    Object.assign(order, patch, { updatedAt: new Date().toISOString() })
    saveState()
    return { ...order }
  },
}
