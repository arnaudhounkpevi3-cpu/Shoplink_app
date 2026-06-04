const express = require('express')

const { requireAuth, requireAdmin } = require('../middleware/auth')
const {
  getPublicKey,
  saveSubscription,
  sendAdminPushNotification,
} = require('../services/pushNotifications')

const router = express.Router()

router.get('/vapid-public-key', requireAuth, requireAdmin, (_req, res) => {
  return res.json({
    success: true,
    publicKey: getPublicKey(),
  })
})

router.post('/subscribe', requireAuth, requireAdmin, async (req, res) => {
  const subscription = req.body?.subscription || req.body
  if (!subscription?.endpoint) {
    return res.status(400).json({
      success: false,
      message: 'Abonnement push invalide',
    })
  }

  const result = await saveSubscription(subscription, req.user)
  return res.status(201).json({
    success: true,
    fallback: result.fallback,
  })
})

router.post('/test', requireAuth, requireAdmin, async (_req, res) => {
  const result = await sendAdminPushNotification({
    title: 'ShopLink Admin',
    body: 'Notification de test active.',
    tag: 'shoplink-admin-test',
  })

  return res.json({
    success: true,
    result,
  })
})

module.exports = router
