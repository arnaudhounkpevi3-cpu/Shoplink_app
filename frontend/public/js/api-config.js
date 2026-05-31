/**
 * Base URL API ShopLink.
 * - En local/LAN : http://IP_DU_PC:5000/api
 * - Sur Vercel : /api, servi par les fonctions serverless Vercel
 */
;(function () {
  var custom = window.__SHOPLINK_API_URL__
  if (custom) {
    window.SHOPLINK_API_BASE = String(custom).replace(/\/$/, '')
    return
  }

  var p = window.location.protocol
  var h = window.location.hostname
  var isLocalOrLan =
    h === 'localhost' ||
    h === '127.0.0.1' ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(h)

  window.SHOPLINK_API_BASE = p === 'http:' && isLocalOrLan
    ? p + '//' + h + ':5000/api'
    : '/api'
})()
