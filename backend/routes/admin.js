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

function premiumDeliveryDays(payment) {
  return payment?.urgency === 'urgent' || payment?.premiumOrder?.delai === 'urgent' ? 21 : 28
}

function toPremiumProject(payment) {
  const order = payment.premiumOrder || {}
  const depositPaid = isPaid(payment.status)
  const deliveryDays = premiumDeliveryDays(payment)
  const deliveryTargetAt = payment.deliveryTargetAt || null
  const countdown = depositPaid ? getCountdown(deliveryTargetAt) : null
  const totalAmount = Number(order.totalPrice || payment.totalPrice || payment.amount * 2 || 0)
  const depositAmount = Number(payment.amount || order.amount || 0)

  return {
    id: payment.id,
    paymentId: payment.id,
    reference: payment.reference,
    clientName: order.manager || payment.clientName || 'N/A',
    clientEmail: order.email || payment.email || '',
    whatsapp: order.whatsapp || payment.whatsappNumber || payment.mobileMoneyPhone || '',
    company: order.company || payment.siteName || 'Projet Premium',
    activity: order.activity || payment.activityType || '',
    siteType: order.siteTypeLabel || order.siteType || payment.siteType || 'Site premium',
    style: order.styleLabel || order.style || '',
    totalAmount,
    depositAmount,
    remainingAmount: Math.max(0, totalAmount - depositAmount),
    depositPaid,
    paymentStatus: payment.status || 'pending',
    validationStatus: payment.validationStatus || 'pending',
    status: depositPaid ? (payment.projectStatus || 'in_progress') : 'pending',
    progress: depositPaid ? 10 : 0,
    urgent: order.delai === 'urgent' || payment.urgency === 'urgent',
    deliveryDays,
    depositDate: payment.validatedAt || payment.deliveryStartedAt || payment.updatedAt || payment.createdAt,
    deliveryStartedAt: payment.deliveryStartedAt || payment.validatedAt || null,
    deliveryTargetAt,
    countdown,
    createdAt: payment.createdAt,
    validatedAt: payment.validatedAt,
    transactionId: payment.transactionId,
    premiumOrder: order,
  }
}

router.get('/summary', async (_req, res) => {
  // Use Supabase-specific summary function if available
  if (repo().getSummary) {
    return repo().getSummary()
  }

  // Fallback to manual calculation for MongoDB/JSON
  const users = await repo().listUsers()
  const sites = await repo().listSites()
  const products = (
    await Promise.all(sites.map((s) => repo().listProductsBySiteId(s.id)))
  ).flat()
  const payments = await repo().listPayments()

  const premiumOrders = payments.filter((payment) => payment.type === 'premium')
  const activeCountdownPayment = premiumOrders.find(
    (payment) =>
      payment.status === 'paid' && payment.step === 'acompte' && !payment.deliveredAt
  )

  let countdown
  if (activeCountdownPayment) {
    const start = new Date(activeCountdownPayment.validatedAt || activeCountdownPayment.createdAt)
    const days = premiumDeliveryDays(activeCountdownPayment)
    const now = new Date()
    const diffMs = now - start
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    countdown = {
      days: Math.max(0, days - diffDays),
      hours: Math.max(0, 24 - diffHours),
      expired: diffDays >= days,
    }
  }

  return res.json({
    success: true,
    data: {
      users: users.length,
      sites: sites.length,
      products: products.length,
      payments: payments.length,
      revenue: payments
        .filter((p) => isPaid(p.status))
        .reduce((sum, p) => sum + (p.amount || 0), 0),
      countdown,
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

router.get('/tickets', async (_req, res) => {
  try {
    const tickets = await repo().listTickets()
    res.json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error('Error fetching tickets:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching tickets',
    })
  }
})

router.get('/premium-projects', async (_req, res) => {
  try {
    const payments = await repo().listPayments()
    const projects = payments
      .filter((payment) => payment.type === 'premium')
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.validatedAt || 0) -
          new Date(a.createdAt || a.validatedAt || 0),
      )
      .map(toPremiumProject)

    return res.json({
      success: true,
      projects,
    })
  } catch (error) {
    console.error('Error fetching premium projects:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching premium projects',
    })
  }
})

module.exports = router
