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
  return client().verify(transactionId)
}

module.exports = {
  publicKey,
  sandboxEnabled,
  verifyKkiapayTransaction,
}
