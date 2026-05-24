const express = require('express')

const { repo } = require('../data/repository')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const router = express.Router()

function normalizePhone(value) {
  const raw = String(value || '').replace(/\D/g, '')
  if (!raw) return ''
  if (raw.startsWith('229')) return raw
  if (raw.length === 10 && raw.startsWith('01')) return `229${raw}`
  if (raw.length === 8) return `22901${raw}`
  return raw
}

function publicOrder(order) {
  return {
    id: order.id,
    reference: order.reference || order.id,
    siteOrderNumber: order.siteOrderNumber || null,
    siteId: order.siteId,
    siteSlug: order.siteSlug,
    siteName: order.siteName,
    buyerName: order.buyerName,
    buyerPhone: order.buyerPhone,
    buyerAddress: order.buyerAddress,
    items: order.items,
    totalAmount: order.totalAmount,
    currency: order.currency,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
  }
}

router.post('/public', async (req, res) => {
  const { siteSlug, siteId, buyerName, buyerPhone, buyerAddress, buyerNote, items, source } = req.body || {}

  if ((!siteSlug && !siteId) || !buyerName || !buyerPhone || !Array.isArray(items) || !items.length) {
    return res.status(400).json({
      success: false,
      message: 'siteSlug/siteId, buyerName, buyerPhone et items sont obligatoires',
    })
  }

  const site = siteId ? await repo().findSiteById(siteId) : await repo().findSiteBySlug(siteSlug)
  if (!site || site.status !== 'published') {
    return res.status(404).json({ success: false, message: 'Boutique publique introuvable' })
  }

  const products = await repo().listProductsBySiteId(site.id)
  const itemsWithPrices = items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)
    if (!product) return null
    const quantity = Math.max(1, Number(item.quantity || 1))
    const unitPrice = Number(product.price || 0)
    return {
      productId: product.id,
      name: product.name,
      category: product.category || '',
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    }
  }).filter(Boolean)

  if (!itemsWithPrices.length) {
    return res.status(400).json({ success: false, message: 'Aucun produit valide dans le panier' })
  }

  const totalAmount = itemsWithPrices.reduce((sum, item) => sum + item.total, 0)
  const order = await repo().createOrder({
    siteId: site.id,
    siteSlug: site.slug,
    siteName: site.name,
    sellerUserId: site.userId,
    buyerName,
    buyerPhone: normalizePhone(buyerPhone),
    buyerAddress,
    buyerNote,
    items: itemsWithPrices,
    totalAmount,
    source: source || 'direct',
    status: 'pending_payment',
    paymentStatus: 'pending',
  })

  if (repo().createClientEvent) {
    await repo().createClientEvent({
      type: 'buyer_order_created',
      title: `Nouvelle commande acheteur - ${site.name}`,
      message: `${buyerName} a commandé ${itemsWithPrices.length} article(s) pour ${totalAmount} FCFA`,
      clientName: buyerName,
      shopName: site.name,
      userId: site.userId,
      siteId: site.id,
      metadata: { orderId: order.id, reference: order.reference || order.id, totalAmount },
    })
  }

  if (req.app.locals.notifyAdmins) {
    req.app.locals.notifyAdmins({
      type: 'buyer_order_created',
      event: 'Nouvelle commande acheteur',
      order,
      timestamp: new Date().toISOString(),
    })
  }

  return res.status(201).json({
    success: true,
    message: 'Commande creee. En attente de paiement acheteur.',
    order: publicOrder(order),
    paymentUrl: `/payment.html?type=buyer&orderId=${encodeURIComponent(order.id)}&amount=${order.totalAmount}`,
    statusUrl: `/api/orders/public/${encodeURIComponent(order.id)}`,
  })
})

router.get('/public/:id', async (req, res) => {
  const order = await repo().findOrderById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' })
  return res.json({ success: true, order: publicOrder(order) })
})

router.patch('/public/:id/cancel', async (req, res) => {
  const order = await repo().findOrderById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' })

  if (['confirmed', 'delivered', 'cancelled'].includes(order.status)) {
    return res.status(400).json({
      success: false,
      message: 'Cette commande ne peut plus etre annulee depuis le site public',
    })
  }

  const updated = await repo().updateOrder(req.params.id, {
    status: 'cancelled',
    paymentStatus: order.paymentStatus === 'submitted' ? 'submitted' : 'cancelled',
    cancelledAt: new Date().toISOString(),
    cancellationSource: 'buyer_public_site',
  })

  if (repo().createClientEvent) {
    await repo().createClientEvent({
      type: 'buyer_order_cancelled',
      title: `Commande annulee - ${order.siteName}`,
      message: `${order.buyerName} a annule la commande ${order.reference || order.id}`,
      clientName: order.buyerName,
      shopName: order.siteName,
      userId: order.sellerUserId,
      siteId: order.siteId,
      metadata: { orderId: order.id, reference: order.reference || order.id },
    })
  }

  return res.json({
    success: true,
    message: 'Commande annulee',
    order: publicOrder(updated),
  })
})

router.post('/public/:id/payment-submitted', async (req, res) => {
  const order = await repo().findOrderById(req.params.id)
  if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' })

  const { payerName, payerPhone, method, transactionReference } = req.body || {}
  const updated = await repo().updateOrder(req.params.id, {
    paymentStatus: 'submitted',
    status: 'payment_submitted',
    paymentMethod: method || 'mobile_money',
    payerName: payerName || order.buyerName,
    payerPhone: normalizePhone(payerPhone || order.buyerPhone),
    transactionReference: transactionReference || '',
    paymentSubmittedAt: new Date().toISOString(),
  })

  if (repo().createClientEvent) {
    await repo().createClientEvent({
      type: 'buyer_payment_submitted',
      title: `Paiement acheteur soumis - ${order.siteName}`,
      message: `${order.buyerName} a soumis le paiement de la commande ${order.reference || order.id}`,
      clientName: order.buyerName,
      shopName: order.siteName,
      userId: order.sellerUserId,
      siteId: order.siteId,
      metadata: { orderId: order.id, reference: order.reference || order.id, totalAmount: order.totalAmount },
    })
  }

  if (req.app.locals.notifyAdmins) {
    req.app.locals.notifyAdmins({
      type: 'buyer_payment_submitted',
      event: 'Paiement acheteur soumis',
      order: updated,
      timestamp: new Date().toISOString(),
    })
  }

  return res.json({
    success: true,
    message: 'Paiement soumis. Le vendeur confirmera la commande.',
    order: publicOrder(updated),
  })
})

router.get('/site/:siteId', requireAuth, async (req, res) => {
  const site = await repo().findSiteById(req.params.siteId)
  if (!site) return res.status(404).json({ success: false, message: 'Site introuvable' })
  if (req.user.role !== 'admin' && req.user.id !== site.userId) {
    return res.status(403).json({ success: false, message: 'Acces refuse' })
  }
  const orders = await repo().listOrdersBySiteId(site.id)
  return res.json({ success: true, orders })
})

router.patch('/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const { status, paymentStatus } = req.body || {}
  const order = await repo().updateOrder(req.params.id, { status, paymentStatus })
  if (!order) return res.status(404).json({ success: false, message: 'Commande introuvable' })
  return res.json({ success: true, order })
})

module.exports = router
