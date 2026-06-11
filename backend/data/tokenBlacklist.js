// Blacklist de tokens JWT en mémoire
// En production, utilisez Redis pour une persistance partagée entre instances

const blacklist = new Map()

// TTL par défaut : 7 jours (durée de vie du JWT)
const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000

function add(token, ttlMs = DEFAULT_TTL_MS) {
  const expiresAt = Date.now() + ttlMs
  blacklist.set(token, expiresAt)

  // Nettoyage automatique après expiration
  setTimeout(() => {
    const entry = blacklist.get(token)
    if (entry && entry <= Date.now()) {
      blacklist.delete(token)
    }
  }, ttlMs)
}

function has(token) {
  const entry = blacklist.get(token)
  if (!entry) return false
  if (entry <= Date.now()) {
    blacklist.delete(token)
    return false
  }
  return true
}

function size() {
  // Nettoyage préventif des entrées expirées
  for (const [token, expiresAt] of blacklist.entries()) {
    if (expiresAt <= Date.now()) {
      blacklist.delete(token)
    }
  }
  return blacklist.size
}

function clear() {
  blacklist.clear()
}

module.exports = {
  add,
  has,
  size,
  clear,
}
