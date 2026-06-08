const { repo } = require('../data/repository')
const { getActivityTheme } = require('../utils/activityTheme')
const { uniqueSlug } = require('../utils/slug')
const { sendAdminPushNotification } = require('./pushNotifications')
const { sendWelcomeEmailAfterPayment } = require('./welcomeEmail')

function premiumDeliveryTarget(payment, startDate = new Date()) {
  const targetDate = new Date(startDate)
  targetDate.setDate(targetDate.getDate() + (payment?.urgency === 'urgent' ? 21 : 28))
  return targetDate.toISOString()
}

async function publishAutonomousSite(userId, paymentData = {}) {
  const now = new Date().toISOString()
  const theme = getActivityTheme(paymentData.activityType || 'Boutique')
  const activityLabel = theme.activityType === 'autre' ? String(paymentData.activityLabel || '').trim() : ''
  if (paymentData.siteId) {
    const site = await repo().findSiteById(paymentData.siteId)
    if (site && site.userId === userId) {
      return repo().updateSite(site.id, {
        name: paymentData.siteName || site.name,
        slogan: paymentData.slogan || site.slogan,
        logo: paymentData.logo || site.logo,
        description: paymentData.siteDescription || site.description,
        whatsapp: paymentData.whatsappNumber || site.whatsapp,
        secondaryPhone: paymentData.secondaryPhone || site.secondaryPhone,
        address: paymentData.address || site.address,
        activityType: theme.activityType || site.activityType,
        activityLabel: activityLabel || site.activityLabel || '',
        primaryColor: paymentData.primaryColor || site.primaryColor || theme.primaryColor,
        secondaryColor: paymentData.secondaryColor || site.secondaryColor || theme.secondaryColor,
        status: 'published',
        publishedAt: now,
      })
    }
  }
  const slug = await uniqueSlug(paymentData.siteName || `boutique-${userId}`, async (candidate) => repo().slugTaken(candidate), { fallback: `boutique-${userId}` })
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
    activityLabel,
    primaryColor: paymentData.primaryColor || theme.primaryColor,
    secondaryColor: paymentData.secondaryColor || theme.secondaryColor,
    status: 'published',
    createdAt: now,
    publishedAt: now,
  })
}

async function activatePayment(payment, options = {}) {
  await repo().patchPayment(payment.id, {
    status: 'paid',
    validationStatus: options.validationStatus || 'ocr_validated',
    paymentStatus: 'paid',
    mobileMoneyProvider: options.operator || payment.mobileMoneyProvider || 'ocr',
    transactionId: options.transactionCode || payment.transactionId || '',
    validatedAt: new Date().toISOString(),
    ...(payment.type === 'premium' && payment.step === 'acompte'
      ? { projectStatus: 'in_progress', deliveryStartedAt: new Date().toISOString(), deliveryTargetAt: premiumDeliveryTarget(payment) }
      : {}),
  })
  let newSite = null
  if (payment.type === 'autonome') {
    newSite = await publishAutonomousSite(payment.userId, payment)
    if (newSite) await repo().patchPayment(payment.id, { siteId: newSite.id })
  } else if (payment.type === 'premium' && payment.siteId) {
    const site = await repo().findSiteById(payment.siteId)
    if (site && site.userId === payment.userId) newSite = await repo().updateSite(site.id, { status: 'published', publishedAt: new Date().toISOString() })
  }
  if (repo().updateUser && payment.userId) await repo().updateUser(payment.userId, { paiement: true })
  if (payment.userId && repo().findUserById) {
    const user = await repo().findUserById(payment.userId)
    if (user) {
      const emailResult = await sendWelcomeEmailAfterPayment(user)
      if (!emailResult.success) console.warn('Email de bienvenue OCR non envoyé:', emailResult.message)
    }
  }
  sendAdminPushNotification({ title: 'Paiement validé par capture', body: `${payment.clientName || payment.email || 'Un client'} · ${Number(payment.amount || 0).toLocaleString('fr-FR')} F`, tag: 'shoplink-admin-ocr-payment' }).catch(() => {})
  return { payment: await repo().findPaymentById(payment.id), newSite }
}

module.exports = { activatePayment }
