function normalizeActivityType(value) {
  const activity = String(value || 'boutique')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (/fast\s*-?\s*food|fastfood|burger|snack|sandwich|pizza|frites|tacos|shawarma/.test(activity)) return 'fast-food'
  if (/restaurant|repas|plat|menu|boisson|grillade|poulet|riz|food/.test(activity)) return 'restaurant'
  if (/boutique|mode|robe|pagne|sac|chaussure|vetement|vêtement|fashion/.test(activity)) return 'boutique'
  if (/cosm|beaut|beaute|beauté|maquillage|parfum|creme|crème|cheveux|soin/.test(activity)) return 'cosmetique'
  if (/commerce|commercant|commerçant|vente|shop|marche|marché/.test(activity)) return 'commerce'

  return 'autre'
}

function getActivityTheme(value) {
  const activityType = normalizeActivityType(value)

  const themes = {
    restaurant: {
      primaryColor: '#9a3f13',
      secondaryColor: '#6f2c0d',
      accentColor: '#f59c1a',
    },
    'fast-food': {
      primaryColor: '#d9480f',
      secondaryColor: '#9a3412',
      accentColor: '#facc15',
    },
    boutique: {
      primaryColor: '#1f4f8f',
      secondaryColor: '#14315d',
      accentColor: '#d7a247',
    },
    cosmetique: {
      primaryColor: '#8b3a62',
      secondaryColor: '#5d2440',
      accentColor: '#eaa6c8',
    },
    commerce: {
      primaryColor: '#176b5b',
      secondaryColor: '#0f493f',
      accentColor: '#f59c1a',
    },
    autre: {
      primaryColor: '#176b5b',
      secondaryColor: '#0f493f',
      accentColor: '#f59c1a',
    },
  }

  return {
    activityType,
    ...(themes[activityType] || themes.autre),
  }
}

module.exports = {
  normalizeActivityType,
  getActivityTheme,
}
