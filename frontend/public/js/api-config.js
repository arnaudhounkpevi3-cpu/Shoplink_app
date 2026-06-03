/**
 * Base URL API ShopLink.
 * - Par défaut : /api (proxy Vite en dev, même origine en prod)
 * - Override possible via window.__SHOPLINK_API_URL__
 */
;(function () {
  var custom = window.__SHOPLINK_API_URL__
  if (custom) {
    window.SHOPLINK_API_BASE = String(custom).replace(/\/$/, '')
    return
  }

  // Choix robuste: utiliser la même origine.
  // - En Vite dev: /api est proxifié vers le backend (vite.config.js)
  // - En backend Express: /api est servi directement
  // - En prod (Vercel): /api pointe vers les fonctions serverless
  if (window.location.protocol === 'http:' || window.location.protocol === 'https:') {
    window.SHOPLINK_API_BASE = '/api'
    return
  }

  // Fallback pour ouverture locale en file://
  window.SHOPLINK_API_BASE = 'http://localhost:5000/api'
})()
