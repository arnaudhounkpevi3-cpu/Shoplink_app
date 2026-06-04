const express = require('express')

const { repo } = require('../data/repository')
const {
  extractSmsAmount,
  extractSmsReference,
  finalizeSmsPayment,
} = require('../services/smsPayments')

const router = express.Router()

function smsContentFromBody(body = {}) {
  return String(
    body.content ||
      body.message ||
      body.text ||
      body.sms ||
      body.body ||
      '',
  )
}

function smsSenderFromBody(body = {}) {
  return String(body.from || body.sender || body.phone || body.address || '')
}

router.get('/', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Webhook actif',
    endpoint: '/api/webhook-sms',
    method: 'POST',
    time: new Date().toISOString(),
  })
})

router.post('/', async (req, res) => {
  const content = smsContentFromBody(req.body)
  const from = smsSenderFromBody(req.body)
  const reference = extractSmsReference(content)
  const matchedAmount = extractSmsAmount(content, reference)

  async function log(status, reason = '') {
    if (!repo().createSmsLog) return
    await repo().createSmsLog({
      from,
      content,
      reference,
      matchedAmount,
      status,
      reason,
      payload: req.body || {},
    })
  }

  console.log('SMS reçu httpSMS:', { from, content })

  if (!reference) {
    await log('ignored', 'Pas de référence SL valide')
    return res.status(200).json({ success: false, reason: 'Pas de référence' })
  }

  const transaction = repo().findSmsTransactionByReference
    ? await repo().findSmsTransactionByReference(reference)
    : null

  if (!transaction) {
    await log('ignored', 'Transaction non trouvée')
    return res.status(200).json({ success: false, reason: 'Transaction non trouvée' })
  }

  if (transaction.status !== 'pending') {
    await log('ignored', 'Transaction déjà utilisée')
    return res.status(200).json({ success: false, reason: 'Référence déjà utilisée' })
  }

  if (!matchedAmount || matchedAmount < Number(transaction.amount || 0)) {
    await log('ignored', 'Montant insuffisant')
    return res.status(200).json({ success: false, reason: 'Montant insuffisant' })
  }

  const payment = transaction.paymentId ? await repo().findPaymentById(transaction.paymentId) : null
  if (!payment || payment.status !== 'pending') {
    await log('ignored', 'Paiement introuvable ou déjà traité')
    return res.status(200).json({ success: false, reason: 'Paiement non payable' })
  }

  const result = await finalizeSmsPayment(payment, {
    reference,
    transactionId: `SMS-${reference}-${Date.now()}`,
    phoneNumber: from,
    provider: transaction.network || 'sms',
  })

  const updatedTransaction = repo().updateSmsTransaction
    ? await repo().updateSmsTransaction(reference, {
        status: 'success',
        matchedAmount,
        smsFrom: from,
        rawSms: content,
      })
    : transaction

  await log('success', 'Paiement validé')

  return res.status(200).json({
    success: true,
    transaction: updatedTransaction,
    payment: result.payment,
    siteSlug: result.newSite?.slug || null,
  })
})

module.exports = router
