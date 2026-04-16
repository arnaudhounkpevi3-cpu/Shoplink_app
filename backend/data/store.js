const fs = require('fs')
const path = require('path')
const bcrypt = require('bcryptjs')

const STORE_FILE = path.join(__dirname, 'state.json')

const seedState = {
  users: [
    {
      id: 'user-1',
      name: 'Administrateur',
      email: 'admin@myonlinestore.local',
      phone: '+22900000000',
      role: 'admin',
      passwordHash: bcrypt.hashSync('admin12345', 10),
      createdAt: new Date().toISOString(),
    },
    {
      id: 'user-2',
      name: 'Client Test',
      email: 'clienttest@example.com',
      phone: '+22997000000',
      role: 'user',
      passwordHash: bcrypt.hashSync('12345678', 10),
      createdAt: new Date().toISOString(),
    },
  ],
  sites: [
    {
      id: 'site-1',
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
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    },
  ],
  products: [
    {
      id: 'product-1',
      siteId: 'site-1',
      name: 'Sac a main',
      price: 15000,
      image: 'https://example.com/sac.jpg',
      description: 'Sac elegant pour demonstration',
      category: 'Mode',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'product-2',
      siteId: 'site-1',
      name: 'Chaussure femme',
      price: 22000,
      image: 'https://example.com/chaussure.jpg',
      description: 'Chaussure confortable pour demonstration',
      category: 'Chaussures',
      createdAt: new Date().toISOString(),
    },
  ],
  payments: [
    {
      id: 'payment-1',
      userId: 'user-2',
      type: 'autonome',
      amount: 4000,
      step: 'full',
      siteId: 'site-1',
      urgency: 'normal',
      status: 'paid',
      reference: 'PAY-SEED-AUTO',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'payment-2',
      userId: 'user-2',
      type: 'premium',
      amount: 5000,
      step: 'acompte',
      siteId: '',
      urgency: 'normal',
      status: 'paid',
      reference: 'PAY-SEED-PREMIUM',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deliveryTargetAt: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
}

function loadState() {
  if (fs.existsSync(STORE_FILE)) {
    const raw = fs.readFileSync(STORE_FILE, 'utf8')
    return JSON.parse(raw)
  }

  fs.writeFileSync(STORE_FILE, JSON.stringify(seedState, null, 2))
  return JSON.parse(JSON.stringify(seedState))
}

const state = loadState()

let userCounter = state.users.length + 1
let siteCounter = state.sites.length + 1
let productCounter = state.products.length + 1
let paymentCounter = state.payments.length + 1

function nextUserId() {
  return `user-${userCounter++}`
}

function nextSiteId() {
  return `site-${siteCounter++}`
}

function nextProductId() {
  return `product-${productCounter++}`
}

function nextPaymentId() {
  return `payment-${paymentCounter++}`
}

function sanitizeUser(user) {
  if (!user) {
    return null
  }

  const { passwordHash, ...safeUser } = user
  return safeUser
}

function saveState() {
  fs.writeFileSync(STORE_FILE, JSON.stringify(state, null, 2))
}

module.exports = {
  state,
  nextUserId,
  nextSiteId,
  nextProductId,
  nextPaymentId,
  sanitizeUser,
  saveState,
}
