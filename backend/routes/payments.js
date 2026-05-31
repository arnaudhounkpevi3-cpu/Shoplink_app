const express = require('express')

const { repo } = require('../data/repository')
const { requireAuth } = require('../middleware/auth')
const { uniqueSlug } = require('../utils/slug')

const router = express.Router()

const MOBILE_MONEY_CONFIG = {
  MTN: {
    name: 'MTN Mobile Money',
    code: 'mtn',
    adminPhone: '0167163481',
  },
  MOOV: {
    name: 'MOOV Money',
    code: 'moov',
    adminPhone: '0167163481',
  },
}

function generateSMSCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
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

  if (paymentData.siteId) {
    const existingSite = await repo().findSiteById(paymentData.siteId)

    if (existingSite && existingSite.userId === userId) {
      return repo().updateSite(existingSite.id, {
        status: 'published',
        publishedAt: now,
      })
    }
  }
  
  return null
}

async function publishAutonomousSite(userId, paymentData) {
  const now = new Date().toISOString()

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
        activityType: paymentData.activityType || existingSite.activityType,
        primaryColor: paymentData.primaryColor || existingSite.primaryColor,
        secondaryColor: paymentData.secondaryColor || existingSite.secondaryColor,
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
    activityType: paymentData.activityType || 'Boutique',
    primaryColor: paymentData.primaryColor || '#667eea',
    secondaryColor: paymentData.secondaryColor || '#764ba2',
    status: 'published',
    createdAt: now,
    publishedAt: now,
  })
}

async function validateAndProcessPayment(req, paymentId, phoneNumber, provider) {
  return new Promise((resolve) => {
    const smsCode = generateSMSCode()

    setTimeout(async () => {
      try {
        const r = repo()
        const payment = await r.findPaymentById(paymentId)

        if (!payment) {
          resolve({ success: false, message: 'Paiement introuvable' })
          return
        }

        const transactionId = `TXN-${provider.toUpperCase()}-${Date.now()}`
        await r.patchPayment(paymentId, {
          status: 'paid',
          validationStatus: 'sms_validated',
          mobileMoneyPhone: phoneNumber,
          mobileMoneyProvider: provider,
          transactionId,
          smsCode,
          validatedAt: new Date().toISOString(),
          ...(payment.type === 'premium' && payment.step === 'acompte'
            ? {
                projectStatus: 'in_progress',
                paymentStatus: 'paid',
                deliveryStartedAt: new Date().toISOString(),
                deliveryTargetAt: premiumDeliveryTarget(payment),
              }
            : {}),
        })

        let newSite = null
        if (payment.type === 'autonome') {
          newSite = await publishAutonomousSite(payment.userId, payment)
          await r.patchPayment(paymentId, { siteId: newSite.id })
        } else if (payment.type === 'premium') {
          newSite = await publishPremiumSite(payment.userId, payment)
          if (newSite) {
            await r.patchPayment(paymentId, { siteId: newSite.id })
          }
        }

        const updatedPayment = await r.findPaymentById(paymentId)

        if (req.app.locals.notifyAdmins) {
          req.app.locals.notifyAdmins({
            type: 'payment_validated',
            event: `Paiement valide - ${MOBILE_MONEY_CONFIG[provider.toUpperCase()]?.name || provider}`,
            payment: updatedPayment,
            newSite,
            adminNotification: {
              message: `Paiement de ${payment.amount} FCFA recu sur ${MOBILE_MONEY_CONFIG[provider.toUpperCase()]?.adminPhone}`,
              timestamp: new Date().toISOString(),
            },
          })
        }

        resolve({
          success: true,
          smsCode,
          transactionId,
          newSite,
          message: 'Paiement valide avec succes. Votre site est en cours de creation.',
        })
      } catch (err) {
        console.error(err)
        resolve({ success: false, message: err.message })
      }
    }, 3000)
  })
}

router.get('/status/:id', async (req, res) => {
  const payment = await repo().findPaymentById(req.params.id)

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Paiement introuvable',
    })
  }

  return res.json({
    success: true,
    payment,
  })
})

router.get('/promo-count', async (_req, res) => {
  const autonomeCount = await repo().countAutonomePaid()
  const premiumCount = await repo().countPremiumAcomptePaid()

  return res.json({
    success: true,
    autonomeCount,
    premiumCount,
  })
})

router.post('/premium-order', async (req, res) => {
  const { premiumOrder, amount, reference, name, email } = req.body

  if (!premiumOrder || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'premiumOrder et amount sont obligatoires',
    })
  }

  const paymentPayload = {
    userId: premiumOrder.userId || 'premium-guest',
    type: 'premium',
    amount,
    step: 'acompte',
    siteId: '',
    urgency: premiumOrder.delai || 'normal',
    status: 'pending',
    validationStatus: 'pending',
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
  }

  const payment = await repo().createPayment(paymentPayload)

  return res.status(201).json({
    success: true,
    message: 'Commande premium creee en attente de paiement',
    payment,
  })
})

router.post('/initiate', requireAuth, async (req, res) => {
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
    slogan,
    primaryColor,
    secondaryColor,
    logo,
    reference,
    email,
    name,
    premiumOrder,
  } = req.body

  if (!type || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'type et amount sont obligatoires',
    })
  }

  const effectiveUserId = req.user.role === 'admin' && userId ? userId : req.user.id

  if (siteId) {
    const relatedSite = await repo().findSiteById(siteId)

    if (!relatedSite) {
      return res.status(404).json({
        success: false,
        message: 'Site introuvable pour ce paiement',
      })
    }

    if (req.user.role !== 'admin' && relatedSite.userId !== effectiveUserId) {
      return res.status(403).json({
        success: false,
        message: 'Vous ne pouvez pas lancer un paiement pour ce site',
      })
    }
  }

  const paymentPayload = {
    userId: effectiveUserId,
    type,
    amount,
    step: step || (type === 'premium' ? 'acompte' : 'full'),
    siteId: siteId || '',
    urgency: urgency || 'normal',
    status: 'pending',
    validationStatus: 'pending',
    reference: `PAY-${Date.now()}`,
    clientReference: reference || '',
    siteName,
    siteDescription,
    whatsappNumber,
    secondaryPhone,
    address,
    activityType,
    slogan,
    primaryColor,
    secondaryColor,
    logo,
    premiumOrder: premiumOrder || null,
    paymentStatus: 'pending',
    projectStatus: type === 'premium' ? 'pending_payment' : undefined,
    clientName: name || req.user.name,
    email: email || req.user.email,
    createdAt: new Date().toISOString(),
  }

  const payment = await repo().createPayment(paymentPayload)

  // Auto-validate for testing
  const transactionId = `TXN-TEST-${Date.now()}`
  const smsCode = generateSMSCode()
  
  await repo().patchPayment(payment.id, {
    status: 'paid',
    validationStatus: 'sms_validated',
    mobileMoneyPhone: '0167163481',
    mobileMoneyProvider: 'mtn',
    transactionId,
    smsCode,
    validatedAt: new Date().toISOString(),
    ...(payment.type === 'premium' && payment.step === 'acompte'
      ? {
          projectStatus: 'in_progress',
          paymentStatus: 'paid',
          deliveryStartedAt: new Date().toISOString(),
          deliveryTargetAt: premiumDeliveryTarget(payment),
        }
      : {}),
  })

  let newSite = null
  if (payment.type === 'autonome') {
    newSite = await publishAutonomousSite(payment.userId, payment)
    await repo().patchPayment(payment.id, { siteId: newSite.id })
  } else if (payment.type === 'premium') {
    newSite = await publishPremiumSite(payment.userId, payment)
    if (newSite) {
      await repo().patchPayment(payment.id, { siteId: newSite.id })
    }
  }

  const updatedPayment = await repo().findPaymentById(payment.id)

  return res.json({
    success: true,
    message: 'Paiement valide avec succes. Votre site est cree.',
    payment: updatedPayment,
    newSite,
    siteSlug: newSite ? newSite.slug : null,
  })
})

router.post('/mobile-money/validate', async (req, res) => {
  const { paymentId, phoneNumber, provider } = req.body

  if (!paymentId || !phoneNumber || !provider) {
    return res.status(400).json({
      success: false,
      message: 'paymentId, phoneNumber et provider (mtn/moov) sont obligatoires',
    })
  }

  const providerUpper = provider.toUpperCase()
  if (!MOBILE_MONEY_CONFIG[providerUpper]) {
    return res.status(400).json({
      success: false,
      message: `Provider invalide. Utilisez: ${Object.keys(MOBILE_MONEY_CONFIG).map((k) => k.toLowerCase()).join(', ')}`,
    })
  }

  const payment = await repo().findPaymentById(paymentId)

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Paiement introuvable',
    })
  }

  try {
    res.json({
      success: true,
      message: `Paiement en cours de traitement via ${MOBILE_MONEY_CONFIG[providerUpper].name}...`,
      payment,
      phoneNumber,
      provider: providerUpper.toLowerCase(),
      status: 'processing',
      adminNotice: `Veuillez envoyer ${payment.amount} FCFA au numero ${MOBILE_MONEY_CONFIG[providerUpper].adminPhone} via ${MOBILE_MONEY_CONFIG[providerUpper].name}`,
    })

    const result = await validateAndProcessPayment(
      req,
      paymentId,
      phoneNumber,
      providerUpper.toLowerCase(),
    )

    if (result.success && req.app.locals.notifyAdmins) {
      const updated = await repo().findPaymentById(paymentId)
      req.app.locals.notifyAdmins({
        type: 'payment_validated_notification',
        event: `ARGENT RECU - ${MOBILE_MONEY_CONFIG[providerUpper].name}`,
        details: {
          amount: payment.amount,
          phoneNumber,
          provider: MOBILE_MONEY_CONFIG[providerUpper].name,
          clientName: payment.clientName || 'Client',
          transactionId: result.transactionId || updated?.transactionId,
          message: `${payment.amount} FCFA recus sur le numero ${MOBILE_MONEY_CONFIG[providerUpper].adminPhone}`,
        },
        timestamp: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error(`Erreur validation paiement: ${error.message}`)
  }
})

router.post('/confirm-received', async (req, res) => {
  const { paymentId, phoneNumber, provider, smsCode } = req.body

  if (!paymentId) {
    return res.status(400).json({
      success: false,
      message: 'paymentId est obligatoire',
    })
  }

  const payment = await repo().findPaymentById(paymentId)

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Paiement introuvable',
    })
  }

  const r = repo()
  await r.patchPayment(paymentId, {
    status: 'paid',
    validationStatus: 'sms_validated',
    mobileMoneyPhone: phoneNumber,
    mobileMoneyProvider: provider,
    smsCode: smsCode || generateSMSCode(),
    validatedAt: new Date().toISOString(),
    ...(payment.type === 'premium' && payment.step === 'acompte'
      ? {
          projectStatus: 'in_progress',
          paymentStatus: 'paid',
          deliveryStartedAt: new Date().toISOString(),
          deliveryTargetAt: premiumDeliveryTarget(payment),
        }
      : {}),
  })

  let newSite = null
  if (payment.type === 'autonome') {
    newSite = await publishAutonomousSite(payment.userId, payment)
    await r.patchPayment(paymentId, { siteId: newSite.id })
  }

  const updated = await r.findPaymentById(paymentId)

  return res.json({
    success: true,
    message: 'Paiement confirme et valide',
    payment: updated,
    newSite,
    adminPhoneReceived: MOBILE_MONEY_CONFIG[provider?.toUpperCase()]?.adminPhone,
  })
})

router.get('/recent/:minutes', async (req, res) => {
  const minutes = parseInt(req.params.minutes, 10) || 30
  const cutoffTime = new Date(Date.now() - minutes * 60 * 1000)

  const payments = await repo().listPayments()
  const recentPayments = payments.filter(
    (p) => new Date(p.createdAt) >= cutoffTime,
  )

  return res.json({
    success: true,
    minutes,
    count: recentPayments.length,
    payments: recentPayments,
  })
})

router.get('/list', async (req, res) => {
  const { type, status, provider } = req.query

  let payments = await repo().listPayments()

  if (type) {
    payments = payments.filter((p) => p.type === type)
  }

  if (status) {
    payments = payments.filter((p) => p.status === status)
  }

  if (provider) {
    payments = payments.filter((p) => p.mobileMoneyProvider === provider)
  }

  return res.json({
    success: true,
    count: payments.length,
    payments,
  })
})

router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params
  const payments = await repo().listPayments()
  const userPayments = payments.filter((p) => p.userId === userId)

  // Sort by createdAt descending to get most recent first
  userPayments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  return res.json({
    success: true,
    count: userPayments.length,
    payments: userPayments,
  })
})

router.post('/callback', async (req, res) => {
  const { reference, status, transactionId } = req.body

  if (!reference || !status) {
    return res.status(400).json({
      success: false,
      message: 'reference et status sont obligatoires',
    })
  }

  const payment = await repo().findPaymentByReference(reference)

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Paiement introuvable',
    })
  }

  const r = repo()
  await r.patchPayment(payment.id, {
    status,
    transactionId: transactionId || payment.transactionId,
    ...(payment.type === 'premium' && payment.step === 'acompte' && (status === 'paid' || status === 'paye')
      ? {
          projectStatus: 'in_progress',
          paymentStatus: 'paid',
          deliveryStartedAt: new Date().toISOString(),
          validatedAt: new Date().toISOString(),
          deliveryTargetAt: premiumDeliveryTarget(payment),
        }
      : {}),
  })

  let newSite = null
  if (payment.type === 'autonome' && (status === 'paid' || status === 'paye')) {
    newSite = await publishAutonomousSite(payment.userId, payment)
    await r.patchPayment(payment.id, { siteId: newSite.id })
  }

  const updated = await r.findPaymentById(payment.id)

  return res.json({
    success: true,
    message: 'Paiement mis a jour',
    payment: updated,
    newSite,
  })
})

module.exports = router
