const express = require('express')

const { repo } = require('../data/repository')
const { requireAuth } = require('../middleware/auth')
const { sendAdminPushNotification } = require('../services/pushNotifications')
const { publicKey, sandboxEnabled, verifyKkiapayTransaction } = require('../services/kkiapayPayments')
const { finalizePayment } = require('../services/paymentFinalization')

const router = express.Router()

function paymentPayloadFromBody(req) {
  const {
    userId,
    type,
    amount,
    step,
    siteId,
    urgency,
    siteName,
    siteDescription,
    whatsappNumber,
    secondaryPhone,
    address,
    activityType,
    activityLabel,
    slogan,
    primaryColor,
    secondaryColor,
    logo,
    reference,
    email,
    name,
    premiumOrder,
    method,
  } = req.body

  const effectiveUserId = req.user?.role === 'admin' && userId ? userId : req.user?.id

  return {
    userId: effectiveUserId,
    type,
    amount,
    step: step || (type === 'premium' ? 'acompte' : 'full'),
    siteId: siteId || '',
    urgency: urgency || 'normal',
    status: 'pending',
    validationStatus: 'manual_pending',
    method: method || 'manual_mobile_money',
    reference: reference || `PAY-${Date.now()}`,
    clientReference: reference || '',
    siteName,
    siteDescription,
    whatsappNumber,
    secondaryPhone,
    address,
    activityType,
    activityLabel,
    slogan,
    primaryColor,
    secondaryColor,
    logo,
    premiumOrder: premiumOrder || null,
    paymentStatus: 'pending',
    projectStatus: type === 'premium' ? 'pending_payment' : undefined,
    clientName: name || req.user?.name,
    email: email || req.user?.email,
    createdAt: new Date().toISOString(),
  }
}

async function assertSiteBelongsToUser(siteId, userId, role) {
  if (!siteId) return
  const relatedSite = await repo().findSiteById(siteId)
  if (!relatedSite) {
    const error = new Error('Site introuvable pour ce paiement')
    error.statusCode = 404
    throw error
  }
  if (role !== 'admin' && relatedSite.userId !== userId) {
    const error = new Error('Vous ne pouvez pas lancer un paiement pour ce site')
    error.statusCode = 403
    throw error
  }
}

router.get('/status/:id', async (req, res) => {
  const payment = await repo().findPaymentById(req.params.id)
  if (!payment) return res.status(404).json({ success: false, message: 'Paiement introuvable' })
  return res.json({ success: true, payment })
})

router.get('/promo-count', async (_req, res) => {
  const autonomeCount = await repo().countAutonomePaid()
  const premiumCount = await repo().countPremiumAcomptePaid()
  return res.json({ success: true, autonomeCount, premiumCount })
})

router.post('/premium-order', async (req, res) => {
  const { premiumOrder, amount, reference, name, email } = req.body
  if (!premiumOrder || amount === undefined) {
    return res.status(400).json({ success: false, message: 'premiumOrder et amount sont obligatoires' })
  }

  const payment = await repo().createPayment({
    userId: premiumOrder.userId || null,
    type: 'premium',
    amount,
    step: 'acompte',
    siteId: null,
    urgency: premiumOrder.delai || 'normal',
    status: 'pending',
    validationStatus: 'manual_pending',
    method: 'manual_mobile_money',
    reference: `PAY-${Date.now()}`,
    clientReference: reference || '',
    siteName: premiumOrder.company || '',
    siteDescription: premiumOrder.activityDescription || '',
    whatsappNumber: premiumOrder.whatsapp || '',
    address: [premiumOrder.city, premiumOrder.district].filter(Boolean).join(', '),
    activityType: premiumOrder.activity || '',
    logo: premiumOrder.logo?.src || '',
    premiumOrder,
    paymentStatus: 'pending',
    projectStatus: 'pending_payment',
    clientName: premiumOrder.manager || name || 'Client Premium',
    email: premiumOrder.email || email || '',
    createdAt: new Date().toISOString(),
  })

  if (!payment) {
    return res.status(500).json({ success: false, message: 'Impossible de créer la commande premium dans la base de données' })
  }

  sendAdminPushNotification({
    title: 'Nouveau projet premium',
    body: `${payment.clientName || payment.email || 'Un client'} a lancé un projet premium.`,
    tag: 'shoplink-admin-premium',
  }).catch((error) => console.warn('Push admin premium non envoyé:', error.message))

  return res.status(201).json({ success: true, message: 'Commande premium créée en attente de paiement manuel', payment })
})

router.post('/initiate', requireAuth, async (req, res) => {
  const { type, amount, siteId } = req.body
  if (!type || amount === undefined) {
    return res.status(400).json({ success: false, message: 'type et amount sont obligatoires' })
  }

  try {
    const effectiveUserId = req.user.role === 'admin' && req.body.userId ? req.body.userId : req.user.id
    await assertSiteBelongsToUser(siteId, effectiveUserId, req.user.role)
    const payment = await repo().createPayment(paymentPayloadFromBody(req))
    if (!payment) return res.status(500).json({ success: false, message: 'Impossible de créer le paiement' })

    sendAdminPushNotification({
      title: 'Nouveau paiement en attente',
      body: `${payment.clientName || payment.email || 'Un client'} · ${payment.type || 'paiement'} · ${Number(payment.amount || 0).toLocaleString('fr-FR')} F`,
      tag: 'shoplink-admin-payment',
    }).catch((error) => console.warn('Push admin paiement non envoyé:', error.message))

    return res.status(201).json({ success: true, message: 'Paiement enregistré en attente de validation manuelle.', payment })
  } catch (error) {
    return res.status(error.statusCode || 500).json({ success: false, message: error.message })
  }
})

router.get('/kkiapay/config', requireAuth, (_req, res) => {
  const key = publicKey()
  if (!key) {
    return res.status(500).json({
      success: false,
      message: 'Clé publique KKiaPay non configurée',
    })
  }

  return res.json({
    success: true,
    publicKey: key,
    sandbox: sandboxEnabled(),
    theme: '#1a5c38',
  })
})

router.post('/kkiapay/confirm', requireAuth, async (req, res) => {
  const { paymentId, transactionId } = req.body

  if (!paymentId || !transactionId) {
    return res.status(400).json({
      success: false,
      message: 'paymentId et transactionId sont obligatoires',
    })
  }

  try {
    const payment = await repo().findPaymentById(paymentId)
    if (!payment) return res.status(404).json({ success: false, message: 'Paiement introuvable' })
    if (req.user.role !== 'admin' && payment.userId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Accès refusé à ce paiement' })
    }
    if (payment.status !== 'pending') {
      return res.json({ success: true, alreadyProcessed: true, payment })
    }

    const verification = await verifyKkiapayTransaction(transactionId)
    const status = String(verification.status || '').toUpperCase()
    const verifiedAmount = Number(verification.amount || verification.amountDebited || 0)
    const expectedAmount = Number(payment.amount || 0)

    if (!['SUCCESS', 'SUCCESSFUL', 'PAID'].includes(status)) {
      return res.status(400).json({
        success: false,
        status,
        message: 'Paiement KKiaPay non confirmé',
      })
    }

    if (verifiedAmount && expectedAmount && verifiedAmount < expectedAmount) {
      return res.status(400).json({
        success: false,
        message: 'Montant KKiaPay insuffisant',
      })
    }

    const result = await finalizePayment(payment, {
      transactionId,
      validationStatus: 'kkiapay_validated',
    })

    return res.json({
      success: true,
      status,
      payment: result.payment,
      siteSlug: result.newSite?.slug || null,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Erreur de confirmation KKiaPay',
    })
  }
})

router.get('/recent/:minutes', async (req, res) => {
  const minutes = parseInt(req.params.minutes, 10) || 30
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)
  const payments = await repo().listPayments()
  const recentPayments = payments.filter((p) => new Date(p.createdAt) >= cutoffTime)
  return res.json({ success: true, minutes, count: recentPayments.length, payments: recentPayments })
})

router.get('/list', async (req, res) => {
  const { type, status, provider } = req.query
  let payments = await repo().listPayments()
  if (type) payments = payments.filter((p) => p.type === type)
  if (status) payments = payments.filter((p) => p.status === status)
  if (provider) payments = payments.filter((p) => p.mobileMoneyProvider === provider)
  return res.json({ success: true, count: payments.length, payments })
})

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params
  const payments = await repo().listPayments()
  const userPayments = payments.filter((p) => p.userId === userId)
  userPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  return res.json({ success: true, count: userPayments.length, payments: userPayments })
})

router.post('/callback', async (req, res) => {
  const { reference, status, transactionId } = req.body
  if (!reference || !status) return res.status(400).json({ success: false, message: 'reference et status sont obligatoires' })
  const payment = await repo().findPaymentByReference(reference)
  if (!payment) return res.status(404).json({ success: false, message: 'Paiement introuvable' })

  await repo().patchPayment(payment.id, { status, transactionId: transactionId || payment.transactionId })
  const updatedPayment = await repo().findPaymentById(payment.id)
  return res.json({ success: true, message: 'Paiement mis à jour', payment: updatedPayment })
})

module.exports = router
