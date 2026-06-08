const express = require('express')
const supabase = require('../config/supabase')
const { repo } = require('../data/repository')
const { requireAuth } = require('../middleware/auth')
const { activatePayment } = require('../services/paymentActivation')

const router = express.Router()

function normalizeText(value = '') {
  return String(value || '').replace(/\s+/g, ' ').trim()
}

function extractAmount(text = '') {
  const transferMatch = text.match(/(?:transfert|envoy[ée]?|envoi|paiement)\D{0,30}(\d[\d\s.,]*)\s*(?:XOF|FCFA|F\b|F\s*CFA)/i)
  if (transferMatch) return Number(transferMatch[1].replace(/[^\d]/g, '')) || 0

  const match = text.match(/(\d[\d\s.,]*)\s*(?:XOF|FCFA|F\s*CFA|F\b)/i)
  if (match) return Number(match[1].replace(/[^\d]/g, '')) || 0
  const numbers = [...text.matchAll(/\b\d[\d\s.,]{2,}\b/g)].map((m) => Number(m[0].replace(/[^\d]/g, '')) || 0).filter((n) => n > 0 && n < 10000000)
  return numbers.length ? Math.max(...numbers) : 0
}

function extractTransactionCode(text = '') {
  const refMatch = text.match(/(?:REF|R[ÉE]F[ÉE]RENCE|REFERENCE|TRANSACTION|CODE)\s*[:\-]?\s*([A-Z0-9]{6,24})/i)
  if (refMatch) return refMatch[1].toUpperCase()

  const candidates = [...text.matchAll(/\b[A-Z0-9][A-Z0-9-]{7,24}\b/gi)].map((m) => m[0].replace(/-/g, '').toUpperCase())
  return candidates.find((code) => (
    !/^0+$/.test(code)
    && !/^229/.test(code)
    && !/^202\d/.test(code)
    && !['TRANSFERT', 'ENVOYE', 'ENVOYEE', 'RETRAIT', 'SOLDE', 'RAISON'].includes(code)
  )) || ''
}

function detectOperator(text = '') {
  const value = text.toLowerCase()
  if (/229\s*01\s*67\s*16\s*34\s*81|0167163481|2290167163481/.test(value)) return 'MTN'
  if (/229\s*01\s*47\s*00\s*06\s*74|0147000674|2290147000674/.test(value)) return 'CELTIIS'
  if (value.includes('mtn') || value.includes('momo')) return 'MTN'
  if (value.includes('celtiis') || value.includes('celtiis cash')) return 'CELTIIS'
  return ''
}

function hasValidRecipient(text = '') {
  const value = String(text || '').replace(/[\s.\-\/]/g, '')
  return value.includes('2290167163481')
    || value.includes('0167163481')
    || value.includes('2290147000674')
    || value.includes('0147000674')
}

function extractRecentDate(text = '') {
  const now = new Date()
  const ddmmyyyy = text.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})(?:\s+(\d{1,2})[:h](\d{2}))?/)
  if (ddmmyyyy) {
    const day = Number(ddmmyyyy[1])
    const month = Number(ddmmyyyy[2]) - 1
    const year = Number(ddmmyyyy[3].length === 2 ? `20${ddmmyyyy[3]}` : ddmmyyyy[3])
    const hour = Number(ddmmyyyy[4] || 12)
    const minute = Number(ddmmyyyy[5] || 0)
    return new Date(year, month, day, hour, minute)
  }
  if (/aujourd|today/i.test(text)) return now
  return null
}

async function ocrSpaceReadText(base64Image) {
  const apiKey = process.env.OCR_SPACE_API_KEY
  if (!apiKey) throw new Error('OCR.space non configuré')

  const formData = new FormData()
  formData.append('base64Image', `data:image/jpeg;base64,${base64Image}`)
  formData.append('language', 'fre')
  formData.append('isOverlayRequired', 'false')
  formData.append('detectOrientation', 'true')
  formData.append('scale', 'true')
  formData.append('OCREngine', '2')

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: {
      apikey: apiKey,
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.IsErroredOnProcessing) {
    const message = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(' ') : data.ErrorMessage
    throw new Error(message || `OCR.space refusé (${response.status})`)
  }

  const text = (data.ParsedResults || [])
    .map((result) => result.ParsedText || '')
    .join(' ')

  if (!text.trim()) {
    throw new Error('Impossible de lire la capture — essayez une image plus nette')
  }

  return normalizeText(text)
}

async function logAttempt(payload) {
  const { error } = await supabase.from('payment_validation_attempts').insert({
    user_id: payload.userId || null,
    payment_id: payload.paymentId || null,
    amount_expected: payload.amountExpected || 0,
    amount_detected: payload.amountDetected || 0,
    operator_detected: payload.operator || '',
    transaction_code: payload.transactionCode || '',
    extracted_text: payload.text || '',
    status: payload.status || 'received',
    reason: payload.reason || '',
    created_at: new Date().toISOString(),
  })
  if (error) console.warn('Log OCR non sauvegardé:', error.message)
}

router.post('/', requireAuth, async (req, res) => {
  const { image, montantAttendu, paymentId } = req.body
  if (!image) return res.status(400).json({ success: false, reason: 'Capture manquante' })
  const amountExpected = Number(montantAttendu || 0)
  try {
    const text = await ocrSpaceReadText(image)
    const amountDetected = extractAmount(text)
    const operator = detectOperator(text)
    const transactionCode = extractTransactionCode(text)
    const receiptDate = extractRecentDate(text)
    const now = Date.now()

    if (!operator) {
      await logAttempt({ userId: req.user.id, paymentId, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: 'Opérateur non reconnu' })
      return res.json({ success: false, reason: 'Capture non reconnue — MTN ou Celtiis uniquement' })
    }
    if (!hasValidRecipient(text)) {
      await logAttempt({ userId: req.user.id, paymentId, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: 'Numéro destinataire incorrect' })
      return res.json({ success: false, reason: 'Numéro destinataire incorrect — payez au 0167163481 (MTN) ou 0147000674 (Celtiis)' })
    }
    if (amountDetected < amountExpected) {
      await logAttempt({ userId: req.user.id, paymentId, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: 'Montant insuffisant' })
      return res.json({ success: false, reason: `Montant insuffisant — ${amountDetected} XOF reçu, ${amountExpected} XOF attendu` })
    }
    if (!transactionCode) {
      await logAttempt({ userId: req.user.id, paymentId, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: 'Code transaction absent' })
      return res.json({ success: false, reason: 'Code transaction non détecté — capture floue ?' })
    }
    if (receiptDate && now - receiptDate.getTime() > 24 * 60 * 60 * 1000) {
      await logAttempt({ userId: req.user.id, paymentId, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: 'Capture trop ancienne' })
      return res.json({ success: false, reason: 'Capture trop ancienne — utilisez un reçu de moins de 24h' })
    }

    const { data: existing } = await supabase.from('transactions').select('id').eq('code_transaction', transactionCode).limit(1).maybeSingle()
    if (existing) {
      await logAttempt({ userId: req.user.id, paymentId, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: 'Code déjà utilisé' })
      return res.json({ success: false, reason: 'Cette capture a déjà été utilisée' })
    }

    let payment = paymentId ? await repo().findPaymentById(paymentId) : null
    if (!payment) {
      const payments = await repo().listPayments()
      payment = payments.filter((entry) => entry.userId === req.user.id && entry.status === 'pending').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0]
    }
    if (!payment) return res.status(404).json({ success: false, reason: 'Paiement en attente introuvable' })
    if (payment.userId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ success: false, reason: 'Accès refusé' })

    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      user_id: req.user.id,
      payment_id: payment.id,
      montant: amountDetected,
      operateur: operator,
      code_transaction: transactionCode,
      statut: 'success',
      created_at: new Date().toISOString(),
    }).select('id').single()
    if (txError) {
      await logAttempt({ userId: req.user.id, paymentId: payment.id, amountExpected, amountDetected, operator, transactionCode, text, status: 'rejected', reason: txError.message })
      return res.json({ success: false, reason: 'Cette capture a déjà été utilisée ou ne peut pas être enregistrée' })
    }

    await repo().patchPayment(payment.id, {
      status: 'paid',
      validationStatus: 'ocr_validated',
      paymentStatus: 'paid',
      mobileMoneyProvider: operator.toLowerCase(),
      transactionId: transactionCode,
      validatedAt: new Date().toISOString(),
    })
    if (repo().updateUser) await repo().updateUser(req.user.id, { paiement: true })
    await logAttempt({ userId: req.user.id, paymentId: payment.id, amountExpected, amountDetected, operator, transactionCode, text, status: 'success', reason: 'Paiement validé' })

    return res.json({ success: true, transactionId: tx.id, operator, amount: amountDetected })
  } catch (error) {
    await logAttempt({ userId: req.user?.id, paymentId, amountExpected, status: 'error', reason: error.message })
    return res.status(500).json({ success: false, reason: 'Erreur serveur — réessayez' })
  }
})

module.exports = router
