const fs = require('fs')
const path = require('path')

const webpush = require('web-push')

const supabase = require('../config/supabase')

const devVapidKeys = webpush.generateVAPIDKeys()
const publicKey = process.env.VAPID_PUBLIC_KEY || devVapidKeys.publicKey
const privateKey = process.env.VAPID_PRIVATE_KEY || devVapidKeys.privateKey
const subject = process.env.VAPID_SUBJECT || 'mailto:supportshoplink@gmail.com'
const fallbackPath = path.join(__dirname, '../data/push-subscriptions.json')
let memorySubscriptions = []

webpush.setVapidDetails(subject, publicKey, privateKey)

function safeReadFallback() {
  try {
    if (!fs.existsSync(fallbackPath)) return []
    return JSON.parse(fs.readFileSync(fallbackPath, 'utf8')) || []
  } catch (_error) {
    return []
  }
}

function safeWriteFallback(items) {
  try {
    fs.writeFileSync(fallbackPath, JSON.stringify(items, null, 2))
  } catch (_error) {
    memorySubscriptions = items
  }
}

function endpointOf(subscription) {
  return String(subscription?.endpoint || '').trim()
}

async function listSubscriptions() {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('endpoint,subscription')
    .eq('enabled', true)

  if (!error) return (data || []).map((row) => row.subscription).filter(Boolean)

  const fallback = safeReadFallback()
  return fallback.length ? fallback : memorySubscriptions
}

async function saveSubscription(subscription, user = {}) {
  const endpoint = endpointOf(subscription)
  if (!endpoint) return { ok: false, fallback: false }

  const payload = {
    endpoint,
    user_id: user.id || null,
    user_email: user.email || '',
    subscription,
    enabled: true,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .upsert(payload, { onConflict: 'endpoint' })

  if (!error) return { ok: true, fallback: false }

  const fallback = safeReadFallback()
  const next = fallback.filter((item) => endpointOf(item) !== endpoint)
  next.push(subscription)
  safeWriteFallback(next)
  memorySubscriptions = next
  return { ok: true, fallback: true }
}

async function removeSubscription(endpoint) {
  const cleanEndpoint = String(endpoint || '').trim()
  if (!cleanEndpoint) return

  await supabase.from('push_subscriptions').delete().eq('endpoint', cleanEndpoint)
  const fallback = safeReadFallback().filter((item) => endpointOf(item) !== cleanEndpoint)
  safeWriteFallback(fallback)
  memorySubscriptions = memorySubscriptions.filter((item) => endpointOf(item) !== cleanEndpoint)
}

async function sendAdminPushNotification({ title, body, url = '/admin/admin-dashboard.html', tag = 'shoplink-admin' }) {
  if (!publicKey || !privateKey) return { sent: 0, failed: 0 }

  const subscriptions = await listSubscriptions()
  const payload = JSON.stringify({
    title: title || 'ShopLink Admin',
    body: body || 'Nouvelle activité sur ShopLink.',
    url,
    tag,
    icon: 'https://cdn-icons-png.flaticon.com/512/2645/2645897.png',
  })

  let sent = 0
  let failed = 0
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webpush.sendNotification(subscription, payload)
      sent += 1
    } catch (error) {
      failed += 1
      if (error.statusCode === 404 || error.statusCode === 410) {
        await removeSubscription(endpointOf(subscription))
      } else {
        console.warn('Notification push admin non envoyee:', error.message)
      }
    }
  }))

  return { sent, failed }
}

function getPublicKey() {
  return publicKey
}

module.exports = {
  getPublicKey,
  saveSubscription,
  sendAdminPushNotification,
}
