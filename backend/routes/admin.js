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

function premiumProjectKey(project = {}) {
  return [
    String(project.clientEmail || '').trim().toLowerCase(),
    String(project.company || '').trim().toLowerCase(),
    String(project.whatsapp || '').replace(/\D/g, ''),
    String(project.siteType || '').trim().toLowerCase(),
    Number(project.totalAmount || 0),
  ].join('|')
}

function premiumProjectCompleteness(project = {}) {
  const order = project.premiumOrder || {}
  const productPhotos = (order.products || []).reduce((total, product) => {
    return total + (product.photos || []).filter((photo) => photo && photo.src).length
  }, 0)

  return [
    project.depositPaid ? 8 : 0,
    order.logo?.src ? 10 : 0,
    productPhotos * 12,
    (order.products || []).length * 2,
    order.company ? 2 : 0,
    order.manager ? 2 : 0,
    order.email ? 2 : 0,
    order.activityDescription ? 2 : 0,
    order.notes ? 1 : 0,
  ].reduce((sum, value) => sum + value, 0)
}

function mergePremiumProject(primary, secondary) {
  const complete = premiumProjectCompleteness(primary) >= premiumProjectCompleteness(secondary) ? primary : secondary
  const other = complete === primary ? secondary : primary

  if (other.depositPaid && !complete.depositPaid) {
    return {
      ...complete,
      depositPaid: other.depositPaid,
      paymentStatus: other.paymentStatus,
      validationStatus: other.validationStatus,
      status: other.status,
      progress: other.progress,
      depositDate: other.depositDate,
      validatedAt: other.validatedAt,
      transactionId: other.transactionId,
      deliveryStartedAt: other.deliveryStartedAt,
      deliveryTargetAt: other.deliveryTargetAt,
      countdown: other.countdown,
      reference: other.reference || complete.reference,
      paymentId: other.paymentId || complete.paymentId,
    }
  }

  return complete
}

function dedupePremiumProjects(projects = []) {
  const grouped = new Map()
  const passthrough = []

  projects.forEach((project) => {
    const key = premiumProjectKey(project)
    if (!key.replace(/\|/g, '')) {
      passthrough.push(project)
      return
    }

    const existing = grouped.get(key)
    grouped.set(key, existing ? mergePremiumProject(existing, project) : project)
  })

  return [...grouped.values(), ...passthrough].sort(
    (a, b) => new Date(b.createdAt || b.validatedAt || 0) - new Date(a.createdAt || a.validatedAt || 0),
  )
}

function paymentMetricsFromPayments(payments = []) {
  const paidPayments = payments.filter((payment) => isPaid(payment.status))
  const premiumProjects = dedupePremiumProjects(payments
    .filter((payment) => payment.type === 'premium')
    .map(toPremiumProject))
  const paidPremiumProjects = premiumProjects.filter((project) => project.depositPaid)
  const pendingPayments = payments.filter((payment) => String(payment.status || 'pending').toLowerCase() === 'pending')

  return {
    totalCollected: paidPayments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0),
    depositsReceived: paidPremiumProjects.reduce((sum, project) => sum + Number(project.depositAmount || 0), 0),
    depositProjectCount: paidPremiumProjects.length,
    remainingBalances: paidPremiumProjects.reduce((sum, project) => sum + Number(project.remainingAmount || 0), 0),
    pendingCount: pendingPayments.length,
  }
}

async function globalStatsFromData(users = [], sites = [], payments = []) {
  const paidPayments = payments.filter((payment) => isPaid(payment.status))
  const autonomousRevenue = paidPayments
    .filter((payment) => payment.type === 'autonome')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const premiumProjects = dedupePremiumProjects(payments
    .filter((payment) => payment.type === 'premium')
    .map(toPremiumProject))
  const paidPremiumProjects = premiumProjects.filter((project) => project.depositPaid)
  const premiumDepositsRevenue = paidPremiumProjects.reduce((sum, project) => sum + Number(project.depositAmount || 0), 0)
  const premiumBalancesRevenue = paidPayments
    .filter((payment) => payment.type === 'premium' && ['solde', 'balance', 'remaining'].includes(String(payment.step || '').toLowerCase()))
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)

  const paidUserIds = new Set(paidPayments.map((payment) => payment.userId).filter(Boolean))
  const conversionRate = users.length ? Math.round((paidUserIds.size / users.length) * 100) : 0

  let whatsappClicks = 0
  if (repo().getTrackingBySite) {
    const siteTrackings = await Promise.all(
      sites.map((site) => repo().getTrackingBySite(site.id).catch(() => [])),
    )
    whatsappClicks = siteTrackings
      .flat()
      .filter((event) => event.type === 'whatsapp_click')
      .length
  }

  return {
    conversionRate,
    whatsappClicks,
    autonomousSites: sites.length,
    totalUsers: users.length,
    premiumSites: premiumProjects.length,
    autonomousRevenue,
    premiumDepositsRevenue,
    premiumBalancesRevenue,
    totalRevenue: autonomousRevenue + premiumDepositsRevenue + premiumBalancesRevenue,
  }
}

router.get('/summary', async (_req, res) => {
  // Use Supabase-specific summary function if available
  if (repo().getSummary) {
    const summary = await repo().getSummary()
    const payments = await repo().listPayments()
    const users = await repo().listUsers()
    const sites = await repo().listSites()
    const rootVisitStats = repo().getRootVisitStats ? await repo().getRootVisitStats() : { total: 0, today: 0, last7Days: 0 }
    summary.data = {
      ...(summary.data || {}),
      paymentMetrics: paymentMetricsFromPayments(payments),
      globalStats: await globalStatsFromData(users, sites, payments),
      rootVisitStats,
    }
    return res.json(summary)
  }

  // Fallback to manual calculation for MongoDB/JSON
  const users = await repo().listUsers()
  const sites = await repo().listSites()
  const products = (
    await Promise.all(sites.map((s) => repo().listProductsBySiteId(s.id)))
  ).flat()
  const payments = await repo().listPayments()
  const rootVisitStats = repo().getRootVisitStats ? await repo().getRootVisitStats() : { total: 0, today: 0, last7Days: 0 }

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
      paymentMetrics: paymentMetricsFromPayments(payments),
      globalStats: await globalStatsFromData(users, sites, payments),
      rootVisitStats,
      countdown,
    },
  })
})

function pageParams(req) {
  return {
    page: Math.max(Number(req.query.page || 1), 1),
    limit: Math.min(Math.max(Number(req.query.limit || 25), 1), 50),
  }
}

function paginationPayload(pageData, fallbackItems = []) {
  return {
    page: pageData?.page || 1,
    limit: pageData?.limit || fallbackItems.length,
    total: pageData?.total ?? fallbackItems.length,
    totalPages: pageData?.totalPages || 1,
  }
}

router.get('/users', async (req, res) => {
  const { page, limit } = pageParams(req)
  const usersPage = repo().listUsersPage ? await repo().listUsersPage(page, limit) : null
  const users = usersPage ? usersPage.items : (await repo().listUsers()).slice((page - 1) * limit, page * limit)
  res.json({
    success: true,
    users: users.map(sanitizeUser),
    pagination: paginationPayload(usersPage, users),
  })
})

router.get('/sites', async (req, res) => {
  const { page, limit } = pageParams(req)
  const sitesPage = repo().listSitesPage ? await repo().listSitesPage(page, limit) : null
  const sites = sitesPage ? sitesPage.items : (await repo().listSites()).slice((page - 1) * limit, page * limit)

  const enrichedSites = await Promise.all(sites.map(async (site) => {
    const [products, tracking] = await Promise.all([
      repo().listProductsBySiteId ? repo().listProductsBySiteId(site.id).catch(() => []) : [],
      repo().getTrackingBySite ? repo().getTrackingBySite(site.id).catch(() => []) : [],
    ])

    const productCount = (products || []).filter((product) => product.visible !== false && product.status !== 'hidden').length
    const views = (tracking || []).filter((event) => event.type === 'visit').length

    return {
      ...site,
      productCount,
      productsCount: productCount,
      views,
    }
  }))

  res.json({
    success: true,
    sites: enrichedSites,
    pagination: paginationPayload(sitesPage, enrichedSites),
  })
})

router.get('/payments', async (req, res) => {
  const { page, limit } = pageParams(req)
  const paymentsPage = repo().listPaymentsPage ? await repo().listPaymentsPage(page, limit) : null
  const payments = paymentsPage ? paymentsPage.items : (await repo().listPayments()).slice((page - 1) * limit, page * limit)
  res.json({
    success: true,
    payments,
    pagination: paginationPayload(paymentsPage, payments),
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

router.get('/tickets', async (req, res) => {
  try {
    const { page, limit } = pageParams(req)
    const ticketsPage = repo().listTicketsPage ? await repo().listTicketsPage(page, limit) : null
    const tickets = ticketsPage ? ticketsPage.items : (await repo().listTickets()).slice((page - 1) * limit, page * limit)
    res.json({
      success: true,
      tickets,
      pagination: paginationPayload(ticketsPage, tickets),
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
    const projects = dedupePremiumProjects(payments
      .filter((payment) => payment.type === 'premium')
      .sort(
        (a, b) =>
          new Date(b.createdAt || b.validatedAt || 0) -
          new Date(a.createdAt || a.validatedAt || 0),
      )
      .map(toPremiumProject))

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

router.get('/updates', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : new Date(Date.now() - 5 * 60 * 1000)
    const isValidSince = !Number.isNaN(since.getTime())
    const sinceTime = isValidSince ? since.getTime() : Date.now() - 5 * 60 * 1000
    const limit = Math.min(Number(req.query.limit || 25), 50)
    const newerThan = (value) => value && new Date(value).getTime() > sinceTime

    if (repo().listAdminUpdates) {
      const updates = await repo().listAdminUpdates(new Date(sinceTime).toISOString(), limit)
      return res.json({
        success: true,
        since: new Date(sinceTime).toISOString(),
        serverTime: new Date().toISOString(),
        updates: {
          users: (updates.users || []).map(sanitizeUser),
          sites: updates.sites || [],
          payments: updates.payments || [],
          tickets: updates.tickets || [],
          premiumProjects: updates.premiumProjects || [],
        },
        counts: {
          users: (updates.users || []).length,
          sites: (updates.sites || []).length,
          payments: (updates.payments || []).length,
          tickets: (updates.tickets || []).length,
          premiumProjects: (updates.premiumProjects || []).length,
        },
      })
    }

    const [users, sites, payments, tickets] = await Promise.all([
      repo().listUsers(),
      repo().listSites(),
      repo().listPayments(),
      repo().listTickets ? repo().listTickets() : [],
    ])

    const nextUsers = users
      .filter((user) => newerThan(user.createdAt || user.updatedAt))
      .slice(0, limit)
      .map(sanitizeUser)

    const nextSites = sites
      .filter((site) => newerThan(site.createdAt || site.updatedAt || site.publishedAt))
      .slice(0, limit)
      .map((site) => ({
        id: site.id,
        name: site.name,
        slug: site.slug,
        status: site.status,
        createdAt: site.createdAt,
        updatedAt: site.updatedAt,
      }))

    const nextPayments = payments
      .filter((payment) => newerThan(payment.createdAt || payment.updatedAt || payment.paidAt))
      .slice(0, limit)
      .map((payment) => ({
        id: payment.id,
        type: payment.type,
        amount: payment.amount,
        status: payment.status,
        reference: payment.reference,
        clientName: payment.clientName,
        email: payment.email,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      }))

    const nextTickets = tickets
      .filter((ticket) => newerThan(ticket.createdAt || ticket.updatedAt))
      .slice(0, limit)
      .map((ticket) => ({
        id: ticket.id,
        userName: ticket.userName,
        userEmail: ticket.userEmail,
        subject: ticket.subject,
        priority: ticket.priority,
        status: ticket.status,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      }))

    const nextPremiumProjects = payments
      .filter((payment) => payment.type === 'premium' && newerThan(payment.createdAt || payment.updatedAt || payment.paidAt))
      .slice(0, limit)
      .map(toPremiumProject)

    return res.json({
      success: true,
      since: new Date(sinceTime).toISOString(),
      serverTime: new Date().toISOString(),
      updates: {
        users: nextUsers,
        sites: nextSites,
        payments: nextPayments,
        tickets: nextTickets,
        premiumProjects: nextPremiumProjects,
      },
      counts: {
        users: nextUsers.length,
        sites: nextSites.length,
        payments: nextPayments.length,
        tickets: nextTickets.length,
        premiumProjects: nextPremiumProjects.length,
      },
    })
  } catch (error) {
    console.error('Error fetching admin updates:', error)
    return res.status(500).json({
      success: false,
      message: 'Error fetching admin updates',
    })
  }
})

module.exports = router
