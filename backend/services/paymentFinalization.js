const { repo } = require('../data/repository')
const { uniqueSlug } = require('../utils/slug')
const { getActivityTheme } = require('../utils/activityTheme')
const { sendAdminPushNotification } = require('./pushNotifications')
const { sendWelcomeEmailAfterPayment } = require('./welcomeEmail')

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
  const activityLabel = theme.activityType === 'autre'
    ? String(paymentData.activityLabel || '').trim()
    : ''

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
        activityLabel: activityLabel || existingSite.activityLabel || '',
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
    activityLabel,
    primaryColor: paymentData.primaryColor || theme.primaryColor,
    secondaryColor: paymentData.secondaryColor || theme.secondaryColor,
    status: 'published',
    createdAt: now,
    publishedAt: now,
  })
}

async function finalizePayment(payment, options = {}) {
  await repo().patchPayment(payment.id, {
    status: 'paid',
    validationStatus: options.validationStatus || 'kkiapay_validated',
    paymentStatus: 'paid',
    mobileMoneyProvider: 'kkiapay',
    transactionId: options.transactionId || payment.transactionId || '',
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

  if (payment.userId && repo().findUserById) {
    const user = await repo().findUserById(payment.userId)
    if (user) {
      const emailResult = await sendWelcomeEmailAfterPayment(user)
      if (!emailResult.success) {
        console.warn('Email de bienvenue post-paiement non envoyé:', emailResult.message)
      }
    }
  }

  const updatedPayment = await repo().findPaymentById(payment.id)
  sendAdminPushNotification({
    title: 'Paiement KKiaPay validé',
    body: `${payment.clientName || payment.email || 'Un client'} · ${Number(payment.amount || 0).toLocaleString('fr-FR')} F`,
    tag: 'shoplink-admin-kkiapay-payment',
  }).catch((error) => console.warn('Push admin paiement KKiaPay non envoyé:', error.message))

  return { payment: updatedPayment, newSite }
}

module.exports = {
  finalizePayment,
}
