const express = require('express')

const { repo } = require('../data/repository')
const { sanitizeUser } = require('../utils/sanitizeUser')

const router = express.Router()

function getCountdown(targetDate) {
  if (!targetDate) {
    return null
  }

  const diff = new Date(targetDate).getTime() - Date.now()
  if (diff <= 0) {
    return {
      days: 0,
      hours: 0,
      expired: true,
    }
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  return {
    days,
    hours,
    expired: false,
  }
}

function isPaid(status) {
  return ['paid', 'paye'].includes(String(status || '').toLowerCase())
}

router.get('/summary', async (_req, res) => {
  const users = await repo().listUsers()
  const sites = await repo().listSites()
  const products = (
    await Promise.all(sites.map((s) => repo().listProductsBySiteId(s.id)))
  ).flat()
  const payments = await repo().listPayments()

  const premiumOrders = payments.filter((payment) => payment.type === 'premium')
  const activeCountdownPayment = premiumOrders.find(
    (payment) =>
      payment.step === 'acompte' &&
      isPaid(payment.status) &&
      payment.deliveryTargetAt,
  )

  return res.json({
    success: true,
    data: {
      users: users.length,
      sites: sites.length,
      products: products.length,
      payments: payments.length,
      premiumOrders: premiumOrders.length,
      deliveryCountdownEnabled: Boolean(activeCountdownPayment),
      countdown: getCountdown(activeCountdownPayment?.deliveryTargetAt),
    },
  })
})

router.get('/users', async (_req, res) => {
  const users = await repo().listUsers()
  res.json({
    success: true,
    users: users.map(sanitizeUser),
  })
})

router.get('/sites', async (_req, res) => {
  const sites = await repo().listSites()
  res.json({
    success: true,
    sites,
  })
})

router.get('/payments', async (_req, res) => {
  const payments = await repo().listPayments()
  res.json({
    success: true,
    payments,
  })
})

router.get('/payments/validated', async (_req, res) => {
  const payments = await repo().listPayments()
  const validatedPayments = payments
    .filter((payment) => isPaid(payment.status))
    .sort(
      (a, b) =>
        new Date(b.validatedAt || b.updatedAt || 0) -
        new Date(a.validatedAt || a.updatedAt || 0),
    )

  return res.json({
    success: true,
    count: validatedPayments.length,
    payments: validatedPayments,
  })
})

router.get('/payments/pending', async (_req, res) => {
  const payments = await repo().listPayments()
  const pendingPayments = payments.filter((payment) => payment.status === 'pending')

  return res.json({
    success: true,
    count: pendingPayments.length,
    payments: pendingPayments,
  })
})

router.get('/payments/summary', async (_req, res) => {
  const payments = await repo().listPayments()
  const validatedPayments = payments.filter((payment) => isPaid(payment.status))

  const totalAmount = validatedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const autonomeTotal = validatedPayments
    .filter((p) => p.type === 'autonome')
    .reduce((sum, p) => sum + (p.amount || 0), 0)
  const premiumTotal = validatedPayments
    .filter((p) => p.type === 'premium')
    .reduce((sum, p) => sum + (p.amount || 0), 0)

  return res.json({
    success: true,
    summary: {
      totalValidated: validatedPayments.length,
      totalPending: payments.filter((p) => p.status === 'pending').length,
      totalAmount,
      autonomeTotal,
      premiumTotal,
      autonomeCount: validatedPayments.filter((p) => p.type === 'autonome').length,
      premiumCount: validatedPayments.filter((p) => p.type === 'premium').length,
    },
  })
})

router.get('/auto-created-clients', async (_req, res) => {
  const payments = await repo().listPayments()
  const paidPayments = payments.filter(
    (payment) => isPaid(payment.status) && payment.type === 'autonome',
  )

  const autoCreatedClients = []
  for (const payment of paidPayments) {
    const site = payment.siteId ? await repo().findSiteById(payment.siteId) : null
    autoCreatedClients.push({
      paymentId: payment.id,
      userId: payment.userId,
      clientName: payment.clientName || 'N/A',
      email: payment.email || 'N/A',
      phone: payment.mobileMoneyPhone,
      provider: payment.mobileMoneyProvider,
      amount: payment.amount,
      site: site || null,
      validatedAt: payment.validatedAt,
      transactionId: payment.transactionId,
    })
  }

  autoCreatedClients.sort(
    (a, b) => new Date(b.validatedAt || 0) - new Date(a.validatedAt || 0),
  )

  return res.json({
    success: true,
    count: autoCreatedClients.length,
    clients: autoCreatedClients,
  })
})

module.exports = router
