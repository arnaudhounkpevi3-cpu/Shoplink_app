const { repo } = require('../data/repository')
const { uniqueSlug } = require('../utils/slug')
const { getActivityTheme } = require('../utils/activityTheme')
const { sendAdminPushNotification } = require('./pushNotifications')

function generateSmsReference(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const code = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[^A-Z0-9]/g, 'X')
  return `SL-${y}${m}${d}-${code}`
}

function extractSmsReference(content = '') {
  const match = String(content || '').match(/SL-\d{8}-[A-Z0-9]{4}/i)
  return match ? match[0].toUpperCase() : ''
}

function parseAmountValue(value = '') {
  const clean = String(value || '').replace(/[^\d]/g, '')
  return clean ? Number(clean) : 0
}

function extractSmsAmount(content = '', reference = '') {
  const text = String(content || '').replace(reference, ' ')
  const currencyMatch = text.match(/(\d[\d\s.,]*)\s*(?:XOF|FCFA|F\s*CFA|F\b)/i)
  if (currencyMatch) return parseAmountValue(currencyMatch[1])

  const amounts = [...text.matchAll(/\b\d[\d\s.,]{2,}\b/g)]
    .map((match) => parseAmountValue(match[0]))
    .filter((amount) => amount > 0 && amount < 10000000)
  return amounts.length ? Math.max(...amounts) : 0
}

function premiumDeliveryDays(payment) {
  return payment?.urgency === 'urgent' || payment?.premiumOrder?.delai === 'urgent' ? 21 : 28
}

function premiumDeliveryTarget(payment, startDate = new Date()) {
  const targetDate = new Date(startDate)
  targetDate.setDate(targetDate.getDate() + premiumDeliveryDays(payment))
  return targetDate.toISOString()
}

async function publishPremiumSite(userId, paymentData) {
  const now = new Date().toISOString()
  if (!paymentData.siteId) return null

  const existingSite = await repo().findSiteById(paymentData.siteId)
  if (!existingSite || existingSite.userId !== userId) return null

  return repo().updateSite(existingSite.id, {
    status: 'published',
    publishedAt: now,
  })
}

async function publishAutonomousSite(userId, paymentData) {
  const now = new Date().toISOString()
  const theme = getActivityTheme(paymentData.activityType || 'Boutique')

  if (paymentData.siteId) {
    const existingSite = await repo().findSiteById(paymentData.siteId)
    if (existingSite && existingSite.userId === userId) {
      return repo().updateSite(existingSite.id, {
        name: paymentData.siteName || existingSite.name,
        slogan: paymentData.slogan || existingSite.slogan,
        logo: paymentData.logo || existingSite.logo,
        description: paymentData.siteDescription || existingSite.description,
        whatsapp: paymentData.whatsappNumber || existingSite.whatsapp,
        secondaryPhone: paymentData.secondaryPhone || existingSite.secondaryPhone,
        address: paymentData.address || existingSite.address,
        activityType: theme.activityType || existingSite.activityType,
        primaryColor: paymentData.primaryColor || existingSite.primaryColor || theme.primaryColor,
        secondaryColor: paymentData.secondaryColor || existingSite.secondaryColor || theme.secondaryColor,
        status: 'published',
        publishedAt: now,
      })
    }
  }

  const slug = await uniqueSlug(
    paymentData.siteName || `boutique-${userId}`,
    async (candidate) => repo().slugTaken(candidate),
    { fallback: `boutique-${userId}` },
  )

  return repo().createSite({
    userId,
    name: paymentData.siteName || `Boutique ${userId}`,
    slug,
    slogan: paymentData.slogan || '',
    logo: paymentData.logo || '',
    description: paymentData.siteDescription || '',
    whatsapp: paymentData.whatsappNumber || '',
    secondaryPhone: paymentData.secondaryPhone || '',
    address: paymentData.address || '',
    activityType: theme.activityType,
    primaryColor: paymentData.primaryColor || theme.primaryColor,
    secondaryColor: paymentData.secondaryColor || theme.secondaryColor,
    status: 'published',
    createdAt: now,
    publishedAt: now,
  })
}

async function finalizeSmsPayment(payment, options = {}) {
  const provider = options.provider || 'sms'
  const transactionId = options.transactionId || `SMS-${Date.now()}`
  const phoneNumber = options.phoneNumber || ''

  await repo().patchPayment(payment.id, {
    status: 'paid',
    validationStatus: 'sms_validated',
    paymentStatus: 'paid',
    mobileMoneyPhone: phoneNumber,
    mobileMoneyProvider: provider,
    transactionId,
    smsCode: options.reference || '',
    validatedAt: new Date().toISOString(),
    ...(payment.type === 'premium' && payment.step === 'acompte'
      ? {
          projectStatus: 'in_progress',
          deliveryStartedAt: new Date().toISOString(),
          deliveryTargetAt: premiumDeliveryTarget(payment),
        }
      : {}),
  })

  let newSite = null
  if (payment.type === 'autonome') {
    newSite = await publishAutonomousSite(payment.userId, payment)
    if (newSite) await repo().patchPayment(payment.id, { siteId: newSite.id })
  } else if (payment.type === 'premium') {
    newSite = await publishPremiumSite(payment.userId, payment)
    if (newSite) await repo().patchPayment(payment.id, { siteId: newSite.id })
  }

  if (repo().updateUser && payment.userId) {
    await repo().updateUser(payment.userId, { paiement: true })
  }

  const updatedPayment = await repo().findPaymentById(payment.id)
  sendAdminPushNotification({
    title: 'Paiement SMS validé',
    body: `${payment.clientName || payment.email || 'Un client'} · ${Number(payment.amount || 0).toLocaleString('fr-FR')} F · ${options.reference || payment.reference}`,
    tag: 'shoplink-admin-sms-payment',
  }).catch((error) => console.warn('Push admin SMS non envoyé:', error.message))

  return { payment: updatedPayment, newSite }
}

module.exports = {
  extractSmsAmount,
  extractSmsReference,
  finalizeSmsPayment,
  generateSmsReference,
}
