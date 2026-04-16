const {
  state,
  nextUserId,
  nextSiteId,
  nextProductId,
  nextPaymentId,
  saveState,
} = require('./store')

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
      passwordHash: data.passwordHash,
      createdAt: data.createdAt || new Date().toISOString(),
    }
    state.users.push(user)
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
      activityType: data.activityType || 'Boutique',
      primaryColor: data.primaryColor || '#d9643a',
      secondaryColor: data.secondaryColor || '#176b5b',
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
    Object.assign(site, patch, { updatedAt: new Date().toISOString() })
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
      category: data.category || 'General',
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
      slogan: data.slogan,
      primaryColor: data.primaryColor,
      secondaryColor: data.secondaryColor,
      logo: data.logo,
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
}
