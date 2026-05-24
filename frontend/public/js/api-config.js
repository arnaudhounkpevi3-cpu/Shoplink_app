/**
 * Base URL API pour pages HTML servies par le backend (port 5000).
 * Sur mobile : ouvrir http://VOTRE_IP_PC:5000/... — les appels iront vers le même IP.
 */
;(function () {
  var custom = window.__SHOPLINK_API_URL__
  if (custom) {
    window.SHOPLINK_API_BASE = String(custom).replace(/\/$/, '')
    return
  }
  var p = window.location.protocol
  var h = window.location.hostname
  window.SHOPLINK_API_BASE = p + '//' + h + ':5000/api'
})()
