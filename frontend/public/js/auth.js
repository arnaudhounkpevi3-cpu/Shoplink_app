/**
 * Module d'authentification sécurisé ShopLink
 * Utilise des cookies HttpOnly + SameSite au lieu de localStorage
 * pour protéger les JWT contre le vol via XSS.
 */

const API_BASE = window.SHOPLINK_API_BASE || ''

/**
 * Vérifie si l'utilisateur est authentifié en interrogeant le serveur
 * (le token est dans un cookie HttpOnly, inaccessible au JS)
 */
export async function checkAuth() {
  try {
    const res = await fetch(`${API_BASE}/auth/check`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!res.ok) return { authenticated: false }

    const data = await res.json()
    return {
      authenticated: data.authenticated || false,
      userId: data.userId || null,
      role: data.role || null,
      email: data.email || null,
    }
  } catch (error) {
    console.error('Erreur vérification auth:', error)
    return { authenticated: false }
  }
}

/**
 * Connecte l'utilisateur (les cookies sont définis par le serveur)
 */
export async function login(email, password, remember = false) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, remember }),
  })

  const data = await res.json()

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Erreur de connexion')
  }

  return data
}

/**
 * Déconnecte l'utilisateur (blacklist le token côté serveur + supprime le cookie)
 */
export async function logout() {
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })
  } catch (error) {
    console.error('Erreur logout:', error)
  }

  // Nettoyage local (données non sensibles uniquement)
  clearClientSession()
}

/**
 * Inscrit un nouvel utilisateur (les cookies sont définis par le serveur)
 */
export async function register(userData) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  })

  const data = await res.json()

  if (!res.ok || !data.success) {
    throw new Error(data.message || "Erreur d'inscription")
  }

  return data
}

/**
 * Réinitialise le mot de passe
 */
export async function resetPassword(token, newPassword) {
  const res = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, newPassword }),
  })

  const data = await res.json()

  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Erreur de réinitialisation')
  }

  return data
}

/**
 * Nettoie la session locale (sans toucher aux cookies HttpOnly)
 */
export function clearClientSession() {
  // Supprimer uniquement les données non sensibles du localStorage
  const keysToRemove = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith('shoplink_')) {
      keysToRemove.push(key)
    }
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key))
}

/**
 * Effectue une requête API authentifiée
 * Le token est automatiquement envoyé via le cookie HttpOnly
 */
export async function apiFetch(path, options = {}) {
  const defaultOptions = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  }

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    headers: {
      ...defaultOptions.headers,
      ...(options.headers || {}),
    },
  }

  const res = await fetch(`${API_BASE}${path}`, mergedOptions)

  if (res.status === 401) {
    // Token expiré ou révoqué, nettoyer la session
    clearClientSession()
    window.location.href = '/login.html'
    return null
  }

  return res
}

/**
 * Vérifie si l'utilisateur a un rôle admin
 */
export function isAdmin(role) {
  return role === 'admin'
}
