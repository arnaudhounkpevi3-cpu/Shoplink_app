const { kkiapay } = require('@kkiapay-org/nodejs-sdk')

function publicKey() {
  return process.env.KKIAPAY_PUBLIC_KEY || ''
}

function sandboxEnabled() {
  return String(process.env.KKIAPAY_SANDBOX || 'true').toLowerCase() !== 'false'
}

function client() {
  const privatekey = process.env.KKIAPAY_PRIVATE_KEY
  const secretkey = process.env.KKIAPAY_SECRET_KEY
  const publickey = publicKey()

  if (!privatekey || !secretkey || !publickey) {
    throw new Error('Configuration KKiaPay incomplète')
  }

  return kkiapay({
    privatekey,
    publickey,
    secretkey,
    sandbox: sandboxEnabled(),
  })
}

async function verifyKkiapayTransaction(transactionId) {
  if (!transactionId) throw new Error('transactionId KKiaPay manquant')
  const kkiapayClient = client()
  let lastError = null

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await kkiapayClient.verify(transactionId)
    } catch (error) {
      lastError = error
      const message = String(error.message || '')
      const shouldRetry = /not found|introuvable|transaction/i.test(message)
      if (!shouldRetry || attempt === 4) break
      await new Promise((resolve) => setTimeout(resolve, 1500))
    }
  }

  throw lastError || new Error('Transaction KKiaPay introuvable')
}

module.exports = {
  publicKey,
  sandboxEnabled,
  verifyKkiapayTransaction,
}
