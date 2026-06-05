const https = require('https')
const { randomUUID } = require('crypto')

const subscriptionKey = process.env.MTN_SUBSCRIPTION_KEY
const callbackHost = process.env.MTN_CALLBACK_HOST || 'https://shoplink-app.vercel.app'
const apiUserId = process.env.MTN_API_USER_ID || randomUUID()

if (!subscriptionKey) {
  console.error('MTN_SUBSCRIPTION_KEY manquant. Exemple: MTN_SUBSCRIPTION_KEY=... node backend/scripts/setup-mtn.js')
  process.exit(1)
}

function requestJson({ path, method = 'GET', headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : ''
    const req = https.request({
      hostname: 'sandbox.momodeveloper.mtn.com',
      path,
      method,
      headers: {
        ...headers,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
      let responseBody = ''
      res.on('data', (chunk) => { responseBody += chunk })
      res.on('end', () => {
        const json = responseBody ? JSON.parse(responseBody) : {}
        if (res.statusCode < 200 || res.statusCode >= 300) {
          reject(new Error(`MTN ${method} ${path} -> ${res.statusCode}: ${responseBody}`))
          return
        }
        resolve(json)
      })
    })
    req.on('error', reject)
    if (payload) req.write(payload)
    req.end()
  })
}

async function main() {
  await requestJson({
    path: '/v1_0/apiuser',
    method: 'POST',
    headers: {
      'X-Reference-Id': apiUserId,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
    body: { providerCallbackHost: callbackHost },
  })

  const { apiKey } = await requestJson({
    path: `/v1_0/apiuser/${apiUserId}/apikey`,
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': subscriptionKey,
    },
  })

  console.log('MTN_API_USER=' + apiUserId)
  console.log('MTN_API_KEY=' + apiKey)
  console.log('MTN_TARGET_ENVIRONMENT=sandbox')
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
