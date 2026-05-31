const bcrypt = require('bcryptjs')
const User = require('../models/User')
const Site = require('../models/Site')
const Product = require('../models/Product')
const Payment = require('../models/Payment')
const Ticket = require('../models/Ticket')

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
  const o = u.toObject ? u.toObject() : u
  return {
    id: o._id,
    name: o.name,
    email: o.email,
    phone: o.phone || '',
    role: o.role,
    passwordHash: o.passwordHash,
    createdAt: iso(o.createdAt),
  }
}

function mapSite(s) {
  if (!s) {
    return null
  }
  const o = s.toObject ? s.toObject() : s
  return {
    id: o._id,
    userId: o.userId,
    name: o.name,
    slug: o.slug,
    slogan: o.slogan || '',
    logo: o.logo || '',
    description: o.description || '',
    whatsapp: o.whatsapp || '',
    secondaryPhone: o.secondaryPhone || '',
    address: o.address || '',
    activityType: o.activityType || 'Boutique',
    primaryColor: o.primaryColor,
    secondaryColor: o.secondaryColor,
    status: o.status,
    createdAt: iso(o.createdAt),
    publishedAt: o.publishedAt ? iso(o.publishedAt) : undefined,
    updatedAt: o.updatedAt ? iso(o.updatedAt) : undefined,
  }
}

function mapProduct(p) {
  if (!p) {
    return null
  }
  const o = p.toObject ? p.toObject() : p
  return {
    id: o._id,
    siteId: o.siteId,
    name: o.name,
    price: o.price,
    image: o.image || '',
    description: o.description || '',
    category: o.category || 'General',
    createdAt: iso(o.createdAt),
    updatedAt: o.updatedAt ? iso(o.updatedAt) : undefined,
  }
}

function mapPayment(p) {
  if (!p) {
    return null
  }
  const o = p.toObject ? p.toObject() : p
  return {
    id: o._id,
    userId: o.userId,
    type: o.type,
    amount: o.amount,
    step: o.step,
    siteId: o.siteId || '',
    urgency: o.urgency,
    status: o.status,
    validationStatus: o.validationStatus,
    reference: o.reference,
    siteName: o.siteName,
    siteDescription: o.siteDescription,
    whatsappNumber: o.whatsappNumber,
    secondaryPhone: o.secondaryPhone,
    address: o.address,
    activityType: o.activityType,
    slogan: o.slogan,
    primaryColor: o.primaryColor,
    secondaryColor: o.secondaryColor,
    logo: o.logo,
    premiumOrder: o.premiumOrder || null,
    paymentStatus: o.paymentStatus,
    projectStatus: o.projectStatus,
    deliveryStartedAt: o.deliveryStartedAt ? iso(o.deliveryStartedAt) : undefined,
    deliveryTargetAt: o.deliveryTargetAt ? iso(o.deliveryTargetAt) : undefined,
    mobileMoneyPhone: o.mobileMoneyPhone,
    mobileMoneyProvider: o.mobileMoneyProvider,
    transactionId: o.transactionId,
    smsCode: o.smsCode,
    validatedAt: o.validatedAt ? iso(o.validatedAt) : undefined,
    clientName: o.clientName,
    email: o.email,
    clientReference: o.clientReference,
    fedapayTransactionId: o.fedapayTransactionId,
    createdAt: iso(o.createdAt),
    updatedAt: o.updatedAt ? iso(o.updatedAt) : undefined,
  }
}

async function seedIfEmpty() {
  const count = await User.countDocuments()
  if (count > 0) {
    return
  }

  const adminHash = bcrypt.hashSync('admin12345', 10)
  const clientHash = bcrypt.hashSync('12345678', 10)

  await User.insertMany([
    {
      _id: 'user-1',
      name: 'Administrateur',
      email: 'admin@myonlinestore.local',
      phone: '+22900000000',
      role: 'admin',
      passwordHash: adminHash,
      createdAt: new Date(),
    },
    {
      _id: 'user-2',
      name: 'Client Test',
      email: 'clienttest@example.com',
      phone: '+22997000000',
      role: 'user',
      passwordHash: clientHash,
      createdAt: new Date(),
    },
  ])

  await Site.create({
    _id: 'site-1',
    userId: 'user-2',
    name: 'Boutique Test',
    slug: 'boutique-test',
    slogan: 'Boutique de demonstration',
    logo: '',
    description: 'Boutique de demonstration',
    whatsapp: '+22997000000',
    address: 'Cotonou',
    activityType: 'Boutique',
    primaryColor: '#d9643a',
    secondaryColor: '#176b5b',
    status: 'published',
    createdAt: new Date(),
    publishedAt: new Date(),
  })

  await Product.insertMany([
    {
      _id: 'product-1',
      siteId: 'site-1',
      name: 'Sac a main',
      price: 15000,
      image: 'https://example.com/sac.jpg',
      description: 'Sac elegant pour demonstration',
      category: 'Mode',
      createdAt: new Date(),
    },
    {
      _id: 'product-2',
      siteId: 'site-1',
      name: 'Chaussure femme',
      price: 22000,
      image: 'https://example.com/chaussure.jpg',
      description: 'Chaussure confortable pour demonstration',
      category: 'Chaussures',
      createdAt: new Date(),
    },
  ])

  const deliveryTargetAt = new Date(Date.now() + 21 * 24 * 60 * 60 * 1000)

  await Payment.insertMany([
    {
      _id: 'payment-1',
      userId: 'user-2',
      type: 'autonome',
      amount: 4000,
      step: 'full',
      siteId: 'site-1',
      urgency: 'normal',
      status: 'paid',
      validationStatus: 'pending',
      reference: 'PAY-SEED-AUTO',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      _id: 'payment-2',
      userId: 'user-2',
      type: 'premium',
      amount: 5000,
      step: 'acompte',
      siteId: '',
      urgency: 'normal',
      status: 'paid',
      validationStatus: 'pending',
      reference: 'PAY-SEED-PREMIUM',
      createdAt: new Date(),
      updatedAt: new Date(),
      deliveryTargetAt,
    },
  ])

  console.log('🌱 Base MongoDB initialisée (comptes démo)')
}

module.exports = {
  seedIfEmpty,

  async findUserByEmail(email) {
    const u = await User.findOne({ email: String(email).toLowerCase() }).lean()
    return u ? mapUser(u) : null
  },

  async findUserById(id) {
    const u = await User.findById(id).lean()
    return u ? mapUser(u) : null
  },

  async createUser(data) {
    const doc = await User.create({
      _id: data.id || newEntityId('user'),
      name: data.name,
      email: String(data.email).toLowerCase(),
      phone: data.phone || '',
      role: data.role || 'user',
      passwordHash: data.passwordHash,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    return mapUser(doc)
  },

  async updateUser(id, patch) {
    const update = { ...patch, updatedAt: new Date() }
    const doc = await User.findByIdAndUpdate(id, update, { new: true }).lean()
    return doc ? mapUser(doc) : null
  },

  async listUsers() {
    const list = await User.find().lean()
    return list.map(mapUser)
  },

  async listSites() {
    const list = await Site.find().lean()
    return list.map(mapSite)
  },

  async findSiteById(id) {
    const s = await Site.findById(id).lean()
    return s ? mapSite(s) : null
  },

  async findSiteBySlug(slug) {
    const s = await Site.findOne({ slug }).lean()
    return s ? mapSite(s) : null
  },

  async findSitesByUserId(userId) {
    const list = await Site.find({ userId }).lean()
    return list.map(mapSite)
  },

  async slugTaken(slug) {
    const n = await Site.countDocuments({ slug })
    return n > 0
  },

  async createSite(data) {
    const id = data.id || newEntityId('site')
    const doc = await Site.create({
      _id: id,
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
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : undefined,
    })
    return mapSite(doc)
  },

  async updateSite(id, patch) {
    const next = { ...patch, updatedAt: new Date() }
    if (patch.publishedAt) {
      next.publishedAt = new Date(patch.publishedAt)
    }
    const doc = await Site.findByIdAndUpdate(id, { $set: next }, { new: true }).lean()
    return doc ? mapSite(doc) : null
  },

  async deleteSite(id) {
    await Product.deleteMany({ siteId: id })
    const doc = await Site.findByIdAndDelete(id).lean()
    return doc ? mapSite(doc) : null
  },

  async listProductsBySiteId(siteId) {
    const list = await Product.find({ siteId }).lean()
    return list.map(mapProduct)
  },

  async findProductById(id) {
    const p = await Product.findById(id).lean()
    return p ? mapProduct(p) : null
  },

  async createProduct(data) {
    const id = data.id || newEntityId('product')
    const doc = await Product.create({
      _id: id,
      siteId: data.siteId,
      name: data.name,
      price: data.price,
      image: data.image || '',
      description: data.description || '',
      category: data.category || 'General',
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    return mapProduct(doc)
  },

  async updateProduct(id, patch) {
    const doc = await Product.findByIdAndUpdate(
      id,
      { $set: { ...patch, updatedAt: new Date() } },
      { new: true },
    ).lean()
    return doc ? mapProduct(doc) : null
  },

  async deleteProduct(id) {
    const doc = await Product.findByIdAndDelete(id).lean()
    return doc ? mapProduct(doc) : null
  },

  async listPayments() {
    const list = await Payment.find().lean()
    return list.map(mapPayment)
  },

  async findPaymentById(id) {
    const p = await Payment.findById(id).lean()
    return p ? mapPayment(p) : null
  },

  async findPaymentByReference(reference) {
    const p = await Payment.findOne({ reference }).lean()
    return p ? mapPayment(p) : null
  },

  async createPayment(data) {
    const id = data.id || newEntityId('payment')
    const doc = await Payment.create({
      _id: id,
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
      premiumOrder: data.premiumOrder || null,
      paymentStatus: data.paymentStatus,
      projectStatus: data.projectStatus,
      deliveryStartedAt: data.deliveryStartedAt ? new Date(data.deliveryStartedAt) : undefined,
      clientName: data.clientName,
      email: data.email,
      clientReference: data.clientReference,
      deliveryTargetAt: data.deliveryTargetAt ? new Date(data.deliveryTargetAt) : undefined,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    return mapPayment(doc)
  },

  async patchPayment(id, patch) {
    const set = { ...patch, updatedAt: new Date() }
    for (const k of ['deliveryTargetAt', 'deliveryStartedAt', 'validatedAt', 'createdAt', 'updatedAt']) {
      if (set[k]) {
        set[k] = new Date(set[k])
      }
    }
    const doc = await Payment.findByIdAndUpdate(id, { $set: set }, { new: true }).lean()
    return doc ? mapPayment(doc) : null
  },

  async countAutonomePaid() {
    return Payment.countDocuments({
      type: 'autonome',
      status: { $in: ['paid', 'paye'] },
    })
  },

  async countPremiumAcomptePaid() {
    return Payment.countDocuments({
      type: 'premium',
      step: 'acompte',
      status: { $in: ['paid', 'paye'] },
    })
  },

  async listTickets() {
    const tickets = await Ticket.find().lean()
    return tickets.map(t => ({ id: t._id, ...t }))
  },

  async findTicketById(id) {
    const ticket = await Ticket.findById(id).lean()
    return ticket ? { id: ticket._id, ...ticket } : null
  },

  async findTicketsByUserId(userId) {
    const tickets = await Ticket.find({ userId }).lean()
    return tickets.map(t => ({ id: t._id, ...t }))
  },

  async createTicket(data) {
    const doc = await Ticket.create({
      userId: data.userId,
      userName: data.userName,
      userEmail: data.userEmail,
      subject: data.subject,
      message: data.message,
      priority: data.priority || 'normal',
      status: data.status || 'open',
      replies: data.replies || [],
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
    })
    return { id: doc._id, ...doc.toObject() }
  },

  async addReplyToTicket(id, reply) {
    const doc = await Ticket.findByIdAndUpdate(
      id,
      { $push: { replies: reply }, $set: { updatedAt: new Date() } },
      { new: true }
    ).lean()
    return doc ? { id: doc._id, ...doc } : null
  },

  async updateTicketStatus(id, status) {
    const doc = await Ticket.findByIdAndUpdate(
      id,
      { $set: { status, updatedAt: new Date() } },
      { new: true }
    ).lean()
    return doc ? { id: doc._id, ...doc } : null
  },

  async deleteTicket(id) {
    const doc = await Ticket.findByIdAndDelete(id).lean()
    return doc ? { id: doc._id, ...doc } : null
  },

  async addTracking(data) {
    const state = require('./state.json')
    state.tracking.push(data)
    require('fs').writeFileSync('./data/state.json', JSON.stringify(state, null, 2))
    return data
  },

  async getTrackingBySite(siteId) {
    const state = require('./state.json')
    return state.tracking.filter(t => t.siteId === siteId)
  },
}
