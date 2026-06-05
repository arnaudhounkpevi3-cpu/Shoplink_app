const { randomUUID } = require('crypto')

const MTN_BASE_URL = process.env.MTN_BASE_URL || 'https://sandbox.momodeveloper.mtn.com'

function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} manquant dans la configuration serveur`)
  return value
}

function basicAuth() {
  const apiUser = requiredEnv('MTN_API_USER')
  const apiKey = requiredEnv('MTN_API_KEY')
  return Buffer.from(`${apiUser}:${apiKey}`).toString('base64')
}

function subscriptionKey() {
  return requiredEnv('MTN_SUBSCRIPTION_KEY')
}

function targetEnvironment() {
  return process.env.MTN_TARGET_ENVIRONMENT || 'sandbox'
}

function normalizeMtnPhone(phone = '') {
  return String(phone || '').replace(/\D/g, '')
}

async function getAccessToken() {
  const response = await fetch(`${MTN_BASE_URL}/collection/token/`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth()}`,
      'Ocp-Apim-Subscription-Key': subscriptionKey(),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload.access_token) {
    throw new Error(payload.message || 'Impossible de récupérer le token MTN')
  }

  return payload.access_token
}

async function requestToPay({ phone, amount, externalId, payerMessage = 'Paiement ShopLink', payeeNote = 'Abonnement ShopLink' }) {
  const referenceId = randomUUID()
  const token = await getAccessToken()
  const msisdn = normalizeMtnPhone(phone)

  if (!msisdn) throw new Error('Numéro MTN invalide')

  const response = await fetch(`${MTN_BASE_URL}/collection/v1_0/requesttopay`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Reference-Id': referenceId,
      'X-Target-Environment': targetEnvironment(),
      'Ocp-Apim-Subscription-Key': subscriptionKey(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: String(amount),
      currency: process.env.MTN_CURRENCY || 'EUR',
      externalId: externalId || referenceId,
      payer: {
        partyIdType: 'MSISDN',
        partyId: msisdn,
      },
      payerMessage,
      payeeNote,
    }),
  })

  if (!response.ok && response.status !== 202) {
    const text = await response.text().catch(() => '')
    throw new Error(text || `MTN requestToPay rejeté (${response.status})`)
  }

  return { referenceId }
}

async function getPaymentStatus(referenceId) {
  const token = await getAccessToken()
  const response = await fetch(`${MTN_BASE_URL}/collection/v1_0/requesttopay/${encodeURIComponent(referenceId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-Target-Environment': targetEnvironment(),
      'Ocp-Apim-Subscription-Key': subscriptionKey(),
    },
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.message || `Statut MTN indisponible (${response.status})`)
  }

  return payload
}

module.exports = {
  getPaymentStatus,
  normalizeMtnPhone,
  requestToPay,
}
