const express = require('express')

const { repo } = require('../data/repository')

const router = express.Router()

const DASHBOARD_URL = 'https://shoplink-app.vercel.app/dashboard-client-shoplink.html'
const HTTPSMS_FROM = process.env.HTTPSMS_FROM || '+2290167163481'

function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('22901')) return `01${digits.slice(5, 13)}`
  if (digits.startsWith('229')) return digits.slice(3)
  if (digits.startsWith('01')) return digits.slice(0, 10)
  if (digits.length === 8) return `01${digits}`
  return digits
}

function contentFromBody(body = {}) {
  return String(body.content || body.message || body.text || body.sms || body.body || '')
}

function senderFromBody(body = {}) {
  return String(body.from || body.sender || body.phone || body.address || '')
}

function extractAmount(content = '') {
  const text = String(content || '')
  const currencyMatch = text.match(/(\d[\d\s.,]*)\s*(?:XOF|FCFA|F\s*CFA|F\b)/i)
  if (currencyMatch) return Number(currencyMatch[1].replace(/[^\d]/g, '')) || 0
  const candidates = [...text.matchAll(/\b\d[\d\s.,]{2,}\b/g)]
    .map((match) => Number(match[0].replace(/[^\d]/g, '')) || 0)
    .filter((amount) => amount > 0 && amount < 10000000)
  return candidates.length ? Math.max(...candidates) : 0
}

async function sendConfirmationSms(to) {
  if (!process.env.HTTPSMS_API_KEY || !to) return { skipped: true }

  const response = await fetch('https://api.httpsms.com/v1/messages/send', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.HTTPSMS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: `✅ Paiement ShopLink confirmé ! Accédez à votre dashboard ici : ${DASHBOARD_URL}`,
      from: HTTPSMS_FROM,
      to,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  return { ok: response.ok, payload }
}

router.get('/', (_req, res) => {
  return res.json({
    success: true,
    message: 'Webhook actif',
    endpoint: '/api/webhook-sms',
    method: 'POST',
    time: new Date().toISOString(),
  })
})

router.post('/', async (req, res) => {
  const from = senderFromBody(req.body)
  const content = contentFromBody(req.body)
  const telephone = normalizePhone(from)
  const matchedAmount = extractAmount(content)

  async function log(status, reason = '', extra = {}) {
    if (!repo().createSmsLog) return
    await repo().createSmsLog({
      from,
      content,
      telephone,
      reference: extra.reference || '',
      matchedAmount,
      status,
      reason,
      payload: req.body || {},
    })
  }

  console.log('SMS reçu de:', from, '→', content)

  if (!matchedAmount) {
    await log('ignored', 'Pas de montant détecté')
    return res.status(200).json({ success: false, reason: 'Pas de montant détecté' })
  }

  const transaction = repo().findPendingSmsTransactionByPhone
    ? await repo().findPendingSmsTransactionByPhone(telephone)
    : null

  if (!transaction) {
    await log('ignored', 'Transaction non trouvée')
    return res.status(200).json({ success: false, reason: 'Transaction non trouvée' })
  }

  if (matchedAmount < Number(transaction.amount || 0)) {
    await log('ignored', 'Montant insuffisant', { reference: transaction.reference })
    return res.status(200).json({ success: false, reason: 'Montant insuffisant' })
  }

  const payment = transaction.paymentId ? await repo().findPaymentById(transaction.paymentId) : null
  if (!payment || payment.status !== 'pending') {
    await log('ignored', 'Paiement introuvable ou déjà traité', { reference: transaction.reference })
    return res.status(200).json({ success: false, reason: 'Paiement non payable' })
  }

  await repo().updateSmsTransaction(transaction.id, {
    status: 'success',
    matchedAmount,
    smsFrom: from,
    rawSms: content,
  })

  await repo().patchPayment(payment.id, {
    status: 'paid',
    validationStatus: 'sms_validated',
    paymentStatus: 'paid',
    mobileMoneyPhone: telephone,
    mobileMoneyProvider: transaction.network || 'sms',
    transactionId: `SMS-${transaction.reference}-${Date.now()}`,
    validatedAt: new Date().toISOString(),
  })

  if (repo().updateUser && payment.userId) {
    await repo().updateUser(payment.userId, { paiement: true })
  }

  await log('success', 'Paiement validé', { reference: transaction.reference })
  sendConfirmationSms(from).catch((error) => console.warn('SMS confirmation non envoyé:', error.message))

  return res.status(200).json({ success: true })
})

module.exports = router
