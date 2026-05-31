import { useEffect, useRef, useState } from 'react'
import './App.css'

function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '')
  }
  if (import.meta.env.PROD) {
    return '/api'
  }
  return `${window.location.protocol}//${window.location.hostname}:5000/api`
}

const API_BASE = getApiBase()
const TOKEN_KEY = 'mos_auth_token'
const SITE_ID = 'site-1'

const audiences = ['Restaurants', 'Boutiques', 'Commercants', 'Vendeurs WhatsApp']

const pricing = [
  {
    title: 'Creation autonome',
    promo: '4 000 FCFA',
    normal: '5 000 FCFA',
    text: "Le client cree son mini-site, ajoute ses produits puis paie pour publier.",
  },
  {
    title: 'Service premium',
    promo: '10 000 FCFA',
    normal: '12 000 FCFA',
    text: "L'administrateur prend en charge la creation du site apres acompte.",
  },
]

const initialAuthForm = {
  name: '',
  email: 'clienttest@example.com',
  phone: '',
  password: '12345678',
}

const emptyProductForm = {
  name: '',
  price: '',
  category: '',
  image: '',
  description: '',
}

const emptySiteForm = {
  name: '',
  slogan: '',
  slug: '',
  logo: '',
  whatsapp: '',
  secondaryPhone: '',
  address: '',
  description: '',
  activityType: 'Boutique',
  primaryColor: '#d9643a',
  secondaryColor: '#176b5b',
}

function formatPrice(value) {
  if (value === '' || value === undefined || value === null) {
    return 'Non defini'
  }

  return `${new Intl.NumberFormat('fr-FR').format(Number(value))} FCFA`
}

function formatDate(value) {
  if (!value) {
    return 'Non defini'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function whatsappUrl(phone, text) {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : '#'
}

function getInitials(name) {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('')
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error("Impossible de lire l'image selectionnee."))
    reader.readAsDataURL(file)
  })
}

function getInitialView() {
  if (typeof window === 'undefined') return 'home'

  const value = new URLSearchParams(window.location.search).get('view')
  return ['home', 'dashboard', 'admin'].includes(String(value)) ? value : 'home'
}

function getInitialAuthMode() {
  if (typeof window === 'undefined') return 'login'

  return new URLSearchParams(window.location.search).get('auth') === 'register'
    ? 'register'
    : 'login'
}

function App() {
  const homeFrameRef = useRef(null)
  const [activeView, setActiveView] = useState(getInitialView)
  const [siteData, setSiteData] = useState(null)
  const [products, setProducts] = useState([])
  const [adminSummary, setAdminSummary] = useState(null)
  const [adminUsers, setAdminUsers] = useState([])
  const [adminSites, setAdminSites] = useState([])
  const [adminPayments, setAdminPayments] = useState([])
  const [dashboardError, setDashboardError] = useState('')
  const [adminError, setAdminError] = useState('')
  const [loadingDashboard, setLoadingDashboard] = useState(true)
  const [loadingAdmin, setLoadingAdmin] = useState(true)
  const [authMode, setAuthMode] = useState(getInitialAuthMode)
  const [authForm, setAuthForm] = useState(initialAuthForm)
  const [authNotice, setAuthNotice] = useState(null)
  const [productNotice, setProductNotice] = useState(null)
  const [siteNotice, setSiteNotice] = useState(null)
  const [editingProductId, setEditingProductId] = useState('')
  const [productForm, setProductForm] = useState(emptyProductForm)
  const [siteForm, setSiteForm] = useState(emptySiteForm)
  const [currentUser, setCurrentUser] = useState(null)
  const [submittingSite, setSubmittingSite] = useState(false)
  const [adminPage, setAdminPage] = useState('overview')
  const [adminUserFilter, setAdminUserFilter] = useState('all')
  const [adminPaymentTab, setAdminPaymentTab] = useState('all')
  const [homeFrameHeight, setHomeFrameHeight] = useState(4200)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({ phone: '', paymentType: 'autonome' })
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentSuccess, setPaymentSuccess] = useState(false)
  const [token, setToken] = useState(() => {
    if (typeof window === 'undefined') return ''
    return window.localStorage.getItem(TOKEN_KEY) || ''
  })

  async function fetchJson(path, options = {}, authToken = token) {
    const headers = { ...(options.headers || {}) }
    if (options.body) headers['Content-Type'] = 'application/json'
    if (authToken) headers.Authorization = `Bearer ${authToken}`

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      throw new Error(data.message || 'Une erreur est survenue')
    }

    return data
  }

  async function loadDashboard() {
    setLoadingDashboard(true)
    setDashboardError('')
    try {
      const [siteResponse, productsResponse] = await Promise.all([
        fetchJson(`/sites/${SITE_ID}`, {}, ''),
        fetchJson(`/products/${SITE_ID}`, {}, ''),
      ])
      setSiteData(siteResponse.site)
      setProducts(productsResponse.products || [])
    } catch (error) {
      setDashboardError(error.message)
    } finally {
      setLoadingDashboard(false)
    }
  }

  async function loadAdmin() {
    setLoadingAdmin(true)
    setAdminError('')
    try {
      const [summaryResponse, usersResponse, sitesResponse, paymentsResponse] =
        await Promise.all([
          fetchJson('/admin/summary', {}, ''),
          fetchJson('/admin/users', {}, ''),
          fetchJson('/admin/sites', {}, ''),
          fetchJson('/admin/payments', {}, ''),
        ])
      setAdminSummary(summaryResponse.data)
      setAdminUsers(usersResponse.users || [])
      setAdminSites(sitesResponse.sites || [])
      setAdminPayments(paymentsResponse.payments || [])
    } catch (error) {
      setAdminError(error.message)
    } finally {
      setLoadingAdmin(false)
    }
  }

  function syncHomeFrameHeight() {
    const frame = homeFrameRef.current
    const frameWindow = frame?.contentWindow
    const frameDocument = frameWindow?.document

    if (!frameDocument) return

    const nextHeight = Math.max(
      frameDocument.body?.scrollHeight || 0,
      frameDocument.documentElement?.scrollHeight || 0,
      window.innerHeight,
    )

    if (nextHeight) {
      setHomeFrameHeight(nextHeight)
    }
  }

  useEffect(() => {
    loadDashboard()
    loadAdmin()
  }, [])

  useEffect(() => {
    if (!siteData) return

    setSiteForm({
      name: siteData.name || '',
      slogan: siteData.slogan || '',
      slug: siteData.slug || '',
      logo: siteData.logo || '',
      whatsapp: siteData.whatsapp || '',
      secondaryPhone: siteData.secondaryPhone || '',
      address: siteData.address || '',
      description: siteData.description || '',
      activityType: siteData.activityType || 'Boutique',
      primaryColor: siteData.primaryColor || '#d9643a',
      secondaryColor: siteData.secondaryColor || '#176b5b',
    })
  }, [siteData])

  useEffect(() => {
    let cancelled = false

    async function loadSession() {
      if (typeof window !== 'undefined') {
        if (token) window.localStorage.setItem(TOKEN_KEY, token)
        else window.localStorage.removeItem(TOKEN_KEY)
      }

      if (!token) {
        setCurrentUser(null)
        return
      }

      try {
        const response = await fetchJson('/auth/me', {}, token)
        if (!cancelled) setCurrentUser(response.user)
      } catch (error) {
        if (!cancelled) {
          setCurrentUser(null)
          setToken('')
          setAuthNotice({ type: 'danger', message: error.message })
        }
      }
    }

    loadSession()

    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const url = new URL(window.location.href)

    if (activeView === 'home') {
      url.searchParams.delete('view')
      url.searchParams.delete('auth')
    } else {
      url.searchParams.set('view', activeView)

      if (activeView === 'dashboard') {
        url.searchParams.set('auth', authMode)
      } else {
        url.searchParams.delete('auth')
      }
    }

    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [activeView, authMode])

  useEffect(() => {
    if (activeView !== 'home') return

    const onResize = () => {
      window.setTimeout(syncHomeFrameHeight, 50)
    }

    window.addEventListener('resize', onResize)
    const intervalId = window.setInterval(syncHomeFrameHeight, 800)

    onResize()

    return () => {
      window.removeEventListener('resize', onResize)
      window.clearInterval(intervalId)
    }
  }, [activeView])

  const canManageProducts = Boolean(
    currentUser &&
      siteData &&
      (currentUser.role === 'admin' || currentUser.id === siteData.userId),
  )

  const autonomousUsed = adminSummary
    ? Math.max(0, adminSummary.payments - adminSummary.premiumOrders)
    : 0
  const autonomousRemaining = Math.max(0, 10 - autonomousUsed)
  const premiumRemaining = Math.max(0, 10 - (adminSummary?.premiumOrders || 0))
  const countdownText =
    adminSummary?.countdown && !adminSummary.countdown.expired
      ? `${adminSummary.countdown.days} jours et ${adminSummary.countdown.hours} heures restants`
      : 'Aucun decompte actif'
  const paidStatuses = ['paid', 'paye']
  const paidPayments = adminPayments.filter((payment) =>
    paidStatuses.includes(String(payment.status || '').toLowerCase()),
  )
  const pendingPayments = adminPayments.filter(
    (payment) => !paidStatuses.includes(String(payment.status || '').toLowerCase()),
  )
  const autonomousPayments = adminPayments.filter(
    (payment) => payment.type === 'autonome',
  )
  const premiumPayments = adminPayments.filter((payment) => payment.type === 'premium')
  const totalRevenue = paidPayments.reduce(
    (sum, payment) => sum + Number(payment.amount || 0),
    0,
  )
  const premiumDeposits = premiumPayments
    .filter((payment) => payment.step === 'acompte')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const premiumBalancesCollected = premiumPayments
    .filter(
      (payment) =>
        payment.step === 'solde' &&
        paidStatuses.includes(String(payment.status || '').toLowerCase()),
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const premiumBalancesRemaining = premiumPayments
    .filter(
      (payment) =>
        payment.step === 'acompte' &&
        paidStatuses.includes(String(payment.status || '').toLowerCase()),
    )
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const activePublishedSites = adminSites.filter((site) => site.status === 'published')
  const premiumProjects = premiumPayments.map((payment) => {
    const client = adminUsers.find((user) => user.id === payment.userId)
    const relatedSite = adminSites.find((site) => site.userId === payment.userId)
    const isUrgent = payment.urgency === 'urgent'
    const isPaid = paidStatuses.includes(String(payment.status || '').toLowerCase())
    const remainingBalance = payment.step === 'acompte' && isPaid ? Number(payment.amount || 0) : 0

    return {
      id: payment.id,
      clientName: client?.name || 'Client premium',
      initials: getInitials(client?.name || 'CP'),
      siteType:
        relatedSite?.activityType === 'Restaurant'
          ? 'Menu restaurant'
          : relatedSite?.activityType === 'Fast-food'
            ? 'Menu fast-food'
            : relatedSite?.activityType === 'Boutique'
              ? 'Boutique catalogue'
              : relatedSite?.activityType || 'Site premium',
      depositAmount: Number(payment.amount || 0),
      remainingBalance,
      deadlineLabel: isUrgent ? 'Urgent · 3 sem.' : 'Normal · 4 sem.',
      statusLabel: isPaid ? 'En cours' : 'Bloque',
      statusTone: isPaid ? 'amber' : 'red',
      urgency: payment.urgency || 'normal',
      deliveryTargetAt: payment.deliveryTargetAt || '',
      startedAt: payment.createdAt,
      progress: isPaid ? 45 : 0,
    }
  })
  const userRows = adminUsers.map((user) => {
    const userSite = adminSites.find((site) => site.userId === user.id)
    const userPaymentsByDate = adminPayments
      .filter((payment) => payment.userId === user.id)
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    const latestPayment = userPaymentsByDate[0]
    const hasPremium = userPaymentsByDate.some((payment) => payment.type === 'premium')
    const hasPending = userPaymentsByDate.some(
      (payment) => !paidStatuses.includes(String(payment.status || '').toLowerCase()),
    )
    const filterKey = hasPending ? 'pending' : hasPremium ? 'premium' : 'active'
    const paymentLabel = latestPayment
      ? hasPremium
        ? `${formatPrice(latestPayment.amount)} ${latestPayment.step === 'acompte' ? 'acompte' : 'solde'}`
        : `${formatPrice(latestPayment.amount)} paye`
      : 'Aucun paiement'

    return {
      id: user.id,
      name: user.name,
      initials: getInitials(user.name),
      email: user.email,
      typeLabel: hasPremium ? 'Premium' : 'Autonome',
      typeTone: hasPremium ? 'amber' : 'blue',
      siteStatus:
        userSite?.status === 'published'
          ? 'En ligne'
          : userSite
            ? 'En cours'
            : 'Non publie',
      siteTone:
        userSite?.status === 'published'
          ? 'green'
          : hasPending
            ? 'red'
            : 'amber',
      paymentLabel,
      paymentTone: hasPending ? 'red' : hasPremium ? 'amber' : 'green',
      createdAt: user.createdAt,
      filterKey,
      userSite,
    }
  })
  const visibleUserRows =
    adminUserFilter === 'all'
      ? userRows
      : userRows.filter((row) => row.filterKey === adminUserFilter)
  const paymentTabRows =
    adminPaymentTab === 'all'
      ? adminPayments
      : adminPaymentTab === 'auto'
        ? autonomousPayments
        : adminPaymentTab === 'premium'
          ? premiumPayments
          : pendingPayments

  function onAuthChange(event) {
    const { name, value } = event.target
    setAuthForm((state) => ({ ...state, [name]: value }))
  }

  async function onAuthSubmit(event) {
    event.preventDefault()
    setAuthNotice(null)
    try {
      const response = await fetchJson(
        authMode === 'register' ? '/auth/register' : '/auth/login',
        {
          method: 'POST',
          body: JSON.stringify(
            authMode === 'register'
              ? authForm
              : { email: authForm.email, password: authForm.password },
          ),
        },
        '',
      )
      setToken(response.token || '')
      setCurrentUser(response.user || null)
      setAuthNotice({ type: 'success', message: response.message })
    } catch (error) {
      setAuthNotice({ type: 'danger', message: error.message })
    }
  }

  function onProductChange(event) {
    const { name, value } = event.target
    setProductForm((state) => ({ ...state, [name]: value }))
  }

  function onSiteChange(event) {
    const { name, value } = event.target
    setSiteForm((state) => ({ ...state, [name]: value }))
  }

  async function onSiteLogoFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const logoDataUrl = await readFileAsDataUrl(file)
      setSiteForm((state) => ({ ...state, logo: logoDataUrl }))
      setSiteNotice({
        type: 'success',
        message: 'Logo charge avec succes. Tu peux maintenant enregistrer les parametres du site.',
      })
    } catch (error) {
      setSiteNotice({
        type: 'danger',
        message: error.message,
      })
    }
  }

  async function onProductFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const imageDataUrl = await readFileAsDataUrl(file)
      setProductForm((state) => ({ ...state, image: imageDataUrl }))
      setProductNotice({
        type: 'success',
        message: 'Photo chargee avec succes. Tu peux maintenant enregistrer le produit.',
      })
    } catch (error) {
      setProductNotice({
        type: 'danger',
        message: error.message,
      })
    }
  }

  function resetProductForm() {
    setEditingProductId('')
    setProductForm(emptyProductForm)
  }

  function resetSiteForm() {
    if (!siteData) {
      setSiteForm(emptySiteForm)
      return
    }

    setSiteForm({
      name: siteData.name || '',
      slogan: siteData.slogan || '',
      slug: siteData.slug || '',
      logo: siteData.logo || '',
      whatsapp: siteData.whatsapp || '',
      secondaryPhone: siteData.secondaryPhone || '',
      address: siteData.address || '',
      description: siteData.description || '',
      activityType: siteData.activityType || 'Boutique',
      primaryColor: siteData.primaryColor || '#d9643a',
      secondaryColor: siteData.secondaryColor || '#176b5b',
    })
  }

  function startEdit(product) {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name || '',
      price: product.price || '',
      category: product.category || '',
      image: product.image || '',
      description: product.description || '',
    })
  }

  async function onProductSubmit(event) {
    event.preventDefault()
    if (!siteData || !canManageProducts) {
      setProductNotice({
        type: 'warning',
        message: 'Connecte-toi avec le compte proprietaire pour gerer les produits.',
      })
      return
    }

    try {
      const response = await fetchJson(
        editingProductId ? `/products/${editingProductId}` : '/products',
        {
          method: editingProductId ? 'PUT' : 'POST',
          body: JSON.stringify({
            siteId: siteData.id,
            name: productForm.name.trim(),
            price: Number(productForm.price),
            category: productForm.category.trim(),
            image: productForm.image.trim(),
            description: productForm.description.trim(),
          }),
        },
      )
      await Promise.all([loadDashboard(), loadAdmin()])
      resetProductForm()
      setProductNotice({ type: 'success', message: response.message })
    } catch (error) {
      setProductNotice({ type: 'danger', message: error.message })
    }
  }

  async function onDeleteProduct(productId) {
    if (!canManageProducts) return
    if (!window.confirm('Supprimer ce produit ?')) return

    try {
      const response = await fetchJson(`/products/${productId}`, { method: 'DELETE' })
      await Promise.all([loadDashboard(), loadAdmin()])
      if (editingProductId === productId) resetProductForm()
      setProductNotice({ type: 'success', message: response.message })
    } catch (error) {
      setProductNotice({ type: 'danger', message: error.message })
    }
  }

  async function onSiteSubmit(event) {
    event.preventDefault()

    if (!siteData || !canManageProducts) {
      setSiteNotice({
        type: 'warning',
        message: 'Connecte-toi avec le compte proprietaire pour modifier les parametres du site.',
      })
      return
    }

    setSubmittingSite(true)
    setSiteNotice(null)

    try {
      const response = await fetchJson(`/sites/${siteData.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: siteForm.name.trim(),
          slogan: siteForm.slogan.trim(),
          slug: siteForm.slug.trim(),
          logo: siteForm.logo.trim(),
          whatsapp: siteForm.whatsapp.trim(),
          secondaryPhone: siteForm.secondaryPhone.trim(),
          address: siteForm.address.trim(),
          description: siteForm.description.trim(),
          activityType: siteForm.activityType,
          primaryColor: siteForm.primaryColor,
          secondaryColor: siteForm.secondaryColor,
        }),
      })

      await Promise.all([loadDashboard(), loadAdmin()])
      setSiteNotice({
        type: 'success',
        message: response.message,
      })
    } catch (error) {
      setSiteNotice({
        type: 'danger',
        message: error.message,
      })
    } finally {
      setSubmittingSite(false)
    }
  }

  function logout() {
    setToken('')
    setCurrentUser(null)
    setAuthNotice({ type: 'success', message: 'Session deconnectee.' })
  }

  function openPaymentModal() {
    if (!siteData) {
      setSiteNotice({ type: 'warning', message: 'Aucun site trouve.' })
      return
    }
    setPaymentError('')
    setPaymentSuccess(false)
    setPaymentForm({ phone: '', paymentType: 'autonome' })
    setShowPaymentModal(true)
  }

  function closePaymentModal() {
    setShowPaymentModal(false)
    setPaymentError('')
    setPaymentSuccess(false)
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault()
    setPaymentLoading(true)
    setPaymentError('')
    setPaymentSuccess(false)

    try {
      if (!paymentForm.phone) {
        throw new Error('Veuillez entrer votre numero de telephone')
      }

      if (!siteData) {
        throw new Error('Site non defini')
      }

      // 1️⃣ ETAPE 1: Creer le paiement
      const paymentInitResponse = await fetchJson('/payments/initiate', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentUser?.id || 'user-2',
          type: paymentForm.paymentType,
          amount: paymentForm.paymentType === 'autonome' ? 4000 : 5000,
          siteId: siteData.id,
          step: paymentForm.paymentType === 'autonome' ? 'full' : 'acompte',
          urgency: 'normal',
          siteName: siteData.name,
          slogan: siteData.slogan,
          siteDescription: siteData.description,
          whatsappNumber: siteData.whatsapp,
          secondaryPhone: siteData.secondaryPhone,
          address: siteData.address,
          activityType: siteData.activityType,
          primaryColor: siteData.primaryColor,
          secondaryColor: siteData.secondaryColor,
          logo: siteData.logo,
          email: currentUser?.email,
          name: currentUser?.name,
        }),
      })

      if (!paymentInitResponse.payment) {
        throw new Error('Erreur creation paiement')
      }

      const payment = paymentInitResponse.payment

      // 2️⃣ ETAPE 2: Appeler API Mobile Money (simulation)
      const mobileMoneyResponse = await fetchJson('/payments/mobile-money/validate', {
        method: 'POST',
        body: JSON.stringify({
          paymentId: payment.id,
          phoneNumber: paymentForm.phone,
          provider: 'mtn',
        }),
      }, '')

      if (!mobileMoneyResponse.success) {
        throw new Error(mobileMoneyResponse.message || 'Erreur traitement paiement')
      }

      setPaymentSuccess(true)
      setSiteNotice({
        type: 'success',
        message: `Paiement reussi! Votre site ${paymentForm.paymentType === 'autonome' ? 'est publie' : 'est en cours de creation'}.`,
      })

      // Recharger les donnees
      await Promise.all([loadDashboard(), loadAdmin()])

      // Redirection ou fermeture auto
      setTimeout(() => {
        closePaymentModal()
      }, 2000)
    } catch (error) {
      setPaymentError(error.message)
    } finally {
      setPaymentLoading(false)
    }
  }

  const isHomeView = activeView === 'home'

  return (
    <div className={`page ${isHomeView ? 'page-home' : ''}`}>
      {!isHomeView && (
        <header className="topbar">
          <div className="brand">
            <div className="brand-badge">SL</div>
            <div>
              <p className="brand-name">Shop Link</p>
              <p className="brand-subtitle">Plateforme de digitalisation</p>
            </div>
          </div>
          <div className="main-tabs">
            <button className={`tab-button ${activeView === 'home' ? 'is-active' : ''}`} onClick={() => setActiveView('home')} type="button">Accueil</button>
            <button className={`tab-button ${activeView === 'dashboard' ? 'is-active' : ''}`} onClick={() => setActiveView('dashboard')} type="button">Tableau de bord client</button>
            <button className={`tab-button ${activeView === 'admin' ? 'is-active' : ''}`} onClick={() => setActiveView('admin')} type="button">Admin</button>
          </div>
        </header>
      )}

      {activeView === 'home' && (
        <main className="home-embed-shell">
          <iframe
            className="home-embed-frame"
            onLoad={syncHomeFrameHeight}
            ref={homeFrameRef}
            src="/homepage-shoplink.html"
            style={{ height: `${homeFrameHeight}px` }}
            title="Shop Link - Accueil"
          />
        </main>
      )}

      {activeView === 'dashboard' && (
        <main className="view-panel view-page">
          <section className="view-head">
            <div>
              <p className="eyebrow">Tableau de bord client</p>
              <h1 className="view-title">Connexion, site et produits.</h1>
              <p className="view-text">On suit ici le coeur du cahier de charge: session client, gestion des produits et preparation du site.</p>
            </div>
            <div className="view-head-actions">
              <button className="button button-secondary" onClick={() => Promise.all([loadDashboard(), loadAdmin()])} type="button">Rafraichir</button>
              <a className="button button-primary" href={whatsappUrl(siteData?.whatsapp, 'Bonjour, je veux commander un produit.')} rel="noreferrer" target="_blank">WhatsApp</a>
            </div>
          </section>

          <section className="auth-grid">
            <article className="auth-card">
              <div className="auth-card-head">
                <div>
                  <p className="eyebrow">Authentification</p>
                  <h2>{authMode === 'login' ? 'Connexion client' : 'Inscription client'}</h2>
                </div>
                <div className="auth-switch">
                  <button className={`auth-switch-button ${authMode === 'login' ? 'is-active' : ''}`} onClick={() => setAuthMode('login')} type="button">Connexion</button>
                  <button className={`auth-switch-button ${authMode === 'register' ? 'is-active' : ''}`} onClick={() => setAuthMode('register')} type="button">Inscription</button>
                </div>
              </div>

              {authNotice && <div className={`notice-banner notice-${authNotice.type}`}>{authNotice.message}</div>}

              {!currentUser && (
                <form className="auth-form" onSubmit={onAuthSubmit}>
                  {authMode === 'register' && (
                    <>
                      <label className="field"><span>Nom complet</span><input name="name" onChange={onAuthChange} required value={authForm.name} /></label>
                      <label className="field"><span>Telephone</span><input name="phone" onChange={onAuthChange} value={authForm.phone} /></label>
                    </>
                  )}
                  <label className="field"><span>Email</span><input name="email" onChange={onAuthChange} required type="email" value={authForm.email} /></label>
                  <label className="field"><span>Mot de passe</span><input name="password" onChange={onAuthChange} required type="password" value={authForm.password} /></label>
                  <button className="button button-primary" type="submit">{authMode === 'login' ? 'Se connecter' : 'Creer mon compte'}</button>
                </form>
              )}

              {currentUser && (
                <div className="session-card">
                  <p className="session-name">{currentUser.name}</p>
                  <p className="session-line">{currentUser.email}</p>
                  <p className="session-line">Role : <span className="user-role-badge">{currentUser.role}</span></p>
                  <div className="session-actions">
                    <button className="button button-secondary" onClick={logout} type="button">Se deconnecter</button>
                  </div>
                </div>
              )}
            </article>

            <aside className="helper-card">
              <p className="eyebrow">Compte de demonstration</p>
              <h3>clienttest@example.com</h3>
              <ul className="helper-list">
                <li>Mot de passe : 12345678</li>
                <li>Proprietaire du site test : oui</li>
                <li>CRUD produits disponible apres connexion</li>
              </ul>
            </aside>
          </section>

          {dashboardError && <div className="notice-banner notice-danger">{dashboardError}</div>}

          {loadingDashboard ? (
            <article className="step-card">
              <h3>Chargement du site client...</h3>
              <p>Le frontend recupere les donnees du backend.</p>
            </article>
          ) : (
            <>
              <section className="dashboard-layout">
                <article className="dashboard-main-card">
                  <div className="dashboard-main-head">
                    <div>
                      <p className="eyebrow">Site actif</p>
                      <h3>{siteData?.name || 'Site indisponible'}</h3>
                    </div>
                    <span className={`site-status ${siteData?.status === 'published' ? 'site-status-published' : 'site-status-draft'}`}>
                      {siteData?.status === 'published' ? 'Publie' : 'Brouillon'}
                    </span>
                  </div>
                  <p className="dashboard-description">{siteData?.description || 'Aucune description pour le moment.'}</p>
                  <div className="dashboard-meta-grid">
                    <article className="dashboard-meta-card"><span className="dashboard-meta-label">Slug</span><strong>{siteData?.slug || 'Non defini'}</strong></article>
                    <article className="dashboard-meta-card"><span className="dashboard-meta-label">WhatsApp</span><strong>{siteData?.whatsapp || 'Non defini'}</strong></article>
                    <article className="dashboard-meta-card"><span className="dashboard-meta-label">Couleur</span><strong>{siteData?.primaryColor || 'Non definie'}</strong></article>
                    <article className="dashboard-meta-card"><span className="dashboard-meta-label">Produits</span><strong>{products.length}</strong></article>
                  </div>
                </article>

                <div className="dashboard-side-grid">
                  <article className="dashboard-side-card">
                    <p className="eyebrow">Paiement autonome</p>
                    <h3>{siteData?.status === 'published' ? 'Site publie' : 'Paiement requis'}</h3>
                    <p>La regle IF paiement valide THEN publier site est deja testee dans le backend.</p>
                    {siteData?.status !== 'published' && (
                      <button
                        className="button button-primary"
                        onClick={openPaymentModal}
                        style={{ marginTop: '1rem', width: '100%' }}
                        type="button"
                      >
                        💳 Payer et publier
                      </button>
                    )}
                    {siteData?.status === 'published' && (
                      <p style={{ marginTop: '1rem', color: '#4caf50', fontWeight: 'bold' }}>
                        ✅ Votre site est en ligne!
                      </p>
                    )}
                  </article>
                  <article className="dashboard-side-card">
                    <p className="eyebrow">Premium</p>
                    <h3>Decompte admin</h3>
                    <p>{countdownText}</p>
                    <button
                      className="button button-secondary"
                      onClick={() => {
                        setPaymentForm({ ...paymentForm, paymentType: 'premium' })
                        openPaymentModal()
                      }}
                      style={{ marginTop: '1rem', width: '100%' }}
                      type="button"
                    >
                      💎 Service premium
                    </button>
                  </article>
                </div>
              </section>

              <section className="dashboard-products">
                <div className="dashboard-products-heading">
                  <p className="eyebrow">Mon site / Parametres</p>
                  <h2>Configure l'identite et les informations du mini-site</h2>
                  <p className="view-text">
                    Cette section suit le cahier de charge: nom de la boutique, slogan,
                    logo, WhatsApp, telephone secondaire, adresse, description, activite,
                    couleurs et slug public.
                  </p>
                </div>

                {siteNotice && <div className={`notice-banner notice-${siteNotice.type}`}>{siteNotice.message}</div>}

                <div className="site-settings-grid">
                  <article className="site-form-card">
                    <div className="product-form-head">
                      <div>
                        <p className="eyebrow">Mon site</p>
                        <h3>Parametres generaux</h3>
                        <p>Les modifications sont sauvegardees dans le backend et rechargees dans le dashboard.</p>
                      </div>
                    </div>

                    <form className="auth-form" onSubmit={onSiteSubmit}>
                      <div className="site-form-grid">
                        <label className="field">
                          <span>Nom de la boutique</span>
                          <input name="name" onChange={onSiteChange} required value={siteForm.name} />
                        </label>
                        <label className="field">
                          <span>Slogan</span>
                          <input name="slogan" onChange={onSiteChange} value={siteForm.slogan} />
                        </label>
                        <label className="field">
                          <span>Slug public</span>
                          <input name="slug" onChange={onSiteChange} required value={siteForm.slug} />
                        </label>
                        <label className="field">
                          <span>Type d'activite</span>
                          <select name="activityType" onChange={onSiteChange} value={siteForm.activityType}>
                            <option value="Restaurant">Restaurant</option>
                            <option value="Boutique">Boutique</option>
                            <option value="Fast-food">Fast-food</option>
                            <option value="Autre">Autre</option>
                          </select>
                        </label>
                        <label className="field">
                          <span>Numero WhatsApp</span>
                          <input name="whatsapp" onChange={onSiteChange} required value={siteForm.whatsapp} />
                        </label>
                        <label className="field">
                          <span>Telephone secondaire</span>
                          <input name="secondaryPhone" onChange={onSiteChange} value={siteForm.secondaryPhone} />
                        </label>
                        <label className="field">
                          <span>Couleur principale</span>
                          <input name="primaryColor" onChange={onSiteChange} type="color" value={siteForm.primaryColor} />
                        </label>
                        <label className="field">
                          <span>Couleur secondaire</span>
                          <input name="secondaryColor" onChange={onSiteChange} type="color" value={siteForm.secondaryColor} />
                        </label>
                      </div>

                      <label className="field">
                        <span>Adresse</span>
                        <input name="address" onChange={onSiteChange} value={siteForm.address} />
                      </label>

                      <label className="field">
                        <span>Lien du logo</span>
                        <input
                          name="logo"
                          onChange={onSiteChange}
                          placeholder="https://... ou laisse vide si tu choisis un fichier"
                          value={siteForm.logo.startsWith('data:') ? '' : siteForm.logo}
                        />
                      </label>

                      <label className="field">
                        <span>Choisir un logo depuis le PC</span>
                        <input accept="image/*" onChange={onSiteLogoFileChange} type="file" />
                        <small className="field-help">
                          Tu peux coller un lien de logo ou choisir un fichier local.
                        </small>
                      </label>

                      {siteForm.logo && (
                        <div className="image-upload-box logo-preview-box">
                          <span className="dashboard-meta-label">Apercu logo</span>
                          <img
                            alt="Apercu du logo"
                            className="site-logo-preview"
                            src={siteForm.logo}
                          />
                        </div>
                      )}

                      <label className="field">
                        <span>Description de l'activite</span>
                        <textarea name="description" onChange={onSiteChange} value={siteForm.description} />
                      </label>

                      <div className="product-form-actions">
                        <button className="button button-primary" disabled={submittingSite} type="submit">
                          {submittingSite ? 'Enregistrement...' : 'Enregistrer les parametres'}
                        </button>
                        <button className="button button-secondary" onClick={resetSiteForm} type="button">
                          Reinitialiser
                        </button>
                      </div>
                    </form>
                  </article>

                  <aside className="helper-card">
                    <p className="eyebrow">Resume du site</p>
                    <h3>{siteForm.name || 'Boutique sans nom'}</h3>
                    <ul className="helper-list">
                      <li>Activite : {siteForm.activityType || 'Non definie'}</li>
                      <li>Slug : {siteForm.slug || 'Non defini'}</li>
                      <li>WhatsApp : {siteForm.whatsapp || 'Non defini'}</li>
                      <li>Telephone secondaire : {siteForm.secondaryPhone || 'Non defini'}</li>
                      <li>Adresse : {siteForm.address || 'Non definie'}</li>
                    </ul>
                    <p className="helper-text">
                      Cette partie prepare la suite logique du projet: publication payante et mini-site public plus complet.
                    </p>
                    <div className="site-color-preview">
                      <div className="site-color-chip" style={{ backgroundColor: siteForm.primaryColor }} />
                      <div className="site-color-chip" style={{ backgroundColor: siteForm.secondaryColor }} />
                    </div>
                  </aside>
                </div>

                <div className="dashboard-products-heading">
                  <p className="eyebrow">Produits</p>
                  <h2>Catalogue du site test</h2>
                </div>

                {productNotice && <div className={`notice-banner notice-${productNotice.type}`}>{productNotice.message}</div>}

                <div className="product-grid">
                  {products.map((product) => (
                    <article className="product-card" key={product.id}>
                      {product.image && (
                        <div className="product-card-image-wrap">
                          <img
                            alt={product.name}
                            className="product-card-image"
                            src={product.image}
                          />
                        </div>
                      )}
                      <div className="product-card-top">
                        <span className="product-category">{product.category || 'General'}</span>
                        <strong className="product-price">{formatPrice(product.price)}</strong>
                      </div>
                      <h3>{product.name}</h3>
                      <p>{product.description || 'Aucune description.'}</p>
                      {canManageProducts && (
                        <div className="product-card-actions">
                          <button className="button button-secondary" onClick={() => startEdit(product)} type="button">Modifier</button>
                          <button className="button button-danger" onClick={() => onDeleteProduct(product.id)} type="button">Supprimer</button>
                        </div>
                      )}
                    </article>
                  ))}
                </div>

                <div className="product-manager">
                  <article className="product-form-card">
                    <div className="product-form-head">
                      <div>
                        <p className="eyebrow">Gestion des produits</p>
                        <h3>{editingProductId ? 'Modifier un produit' : 'Ajouter un produit'}</h3>
                        <p>Formulaire connecte au backend Express deja teste.</p>
                      </div>
                    </div>
                    <form className="auth-form" onSubmit={onProductSubmit}>
                      <div className="product-form-grid">
                        <label className="field"><span>Nom</span><input name="name" onChange={onProductChange} required value={productForm.name} /></label>
                        <label className="field"><span>Prix</span><input min="0" name="price" onChange={onProductChange} required type="number" value={productForm.price} /></label>
                        <label className="field"><span>Categorie</span><input name="category" onChange={onProductChange} value={productForm.category} /></label>
                        <label className="field"><span>Lien image</span><input name="image" onChange={onProductChange} placeholder="https://... ou laisse vide si tu choisis un fichier" value={productForm.image.startsWith('data:') ? '' : productForm.image} /></label>
                      </div>
                      <label className="field">
                        <span>Choisir une photo depuis le PC</span>
                        <input accept="image/*" onChange={onProductFileChange} type="file" />
                        <small className="field-help">
                          Tu peux utiliser soit un lien image, soit choisir une photo locale.
                        </small>
                      </label>
                      {productForm.image && (
                        <div className="image-upload-box">
                          <span className="dashboard-meta-label">Apercu image</span>
                          <img
                            alt="Apercu du produit"
                            className="product-image-preview"
                            src={productForm.image}
                          />
                        </div>
                      )}
                      <label className="field"><span>Description</span><textarea name="description" onChange={onProductChange} value={productForm.description} /></label>
                      <div className="product-form-actions">
                        <button className="button button-primary" type="submit">{editingProductId ? 'Mettre a jour' : 'Ajouter le produit'}</button>
                        <button className="button button-secondary" onClick={resetProductForm} type="button">Reinitialiser</button>
                      </div>
                    </form>
                  </article>

                  <aside className="helper-card">
                    <p className="eyebrow">Regle metier</p>
                    <h3>Seul le proprietaire du site gere les produits.</h3>
                    <p className="helper-text">
                      {canManageProducts ? 'Tu es connecte avec un compte autorise.' : 'Connecte-toi avec le compte proprietaire pour activer le CRUD produits.'}
                    </p>
                  </aside>
                </div>
              </section>
            </>
          )}
        </main>
      )}

      {activeView === 'admin' && (
        <main className="shop-admin-shell">
          <aside className="shop-admin-sidebar">
            <div className="shop-admin-sidebar-logo">
              <div className="shop-admin-logo-text">
                <span className="shop-admin-logo-dot" />
                Shop Link
                <span className="shop-admin-pill">ADMIN</span>
              </div>
            </div>

            <div className="shop-admin-nav-section">Tableau de bord</div>
            <button className={`shop-admin-nav-item ${adminPage === 'overview' ? 'is-active' : ''}`} onClick={() => setAdminPage('overview')} type="button">
              <span className="shop-admin-nav-icon">OV</span>
              Vue d'ensemble
            </button>

            <div className="shop-admin-nav-section">Gestion</div>
            <button className={`shop-admin-nav-item ${adminPage === 'users' ? 'is-active' : ''}`} onClick={() => setAdminPage('users')} type="button">
              <span className="shop-admin-nav-icon">US</span>
              Utilisateurs
              <span className="shop-admin-nav-badge">{adminUsers.length}</span>
            </button>
            <button className={`shop-admin-nav-item ${adminPage === 'sites' ? 'is-active' : ''}`} onClick={() => setAdminPage('sites')} type="button">
              <span className="shop-admin-nav-icon">ST</span>
              Sites publies
            </button>
            <button className={`shop-admin-nav-item ${adminPage === 'payments' ? 'is-active' : ''}`} onClick={() => setAdminPage('payments')} type="button">
              <span className="shop-admin-nav-icon">PY</span>
              Paiements
              <span className="shop-admin-nav-badge">{pendingPayments.length}</span>
            </button>
            <button className={`shop-admin-nav-item ${adminPage === 'premium' ? 'is-active' : ''}`} onClick={() => setAdminPage('premium')} type="button">
              <span className="shop-admin-nav-icon">PR</span>
              Projets Premium
            </button>

            <div className="shop-admin-nav-section">Outils</div>
            <button className={`shop-admin-nav-item ${adminPage === 'countdown' ? 'is-active' : ''}`} onClick={() => setAdminPage('countdown')} type="button">
              <span className="shop-admin-nav-icon">CD</span>
              Decomptes livraison
            </button>
            <button className={`shop-admin-nav-item ${adminPage === 'stats' ? 'is-active' : ''}`} onClick={() => setAdminPage('stats')} type="button">
              <span className="shop-admin-nav-icon">SC</span>
              Statistiques
            </button>

            <div className="shop-admin-sidebar-footer">
              <div className="shop-admin-sidebar-name">Administrateur</div>
              <div className="shop-admin-sidebar-info">Acces total · Shop Link</div>
            </div>
          </aside>

          <section className="shop-admin-main">
            {adminError && <div className="notice-banner notice-danger">{adminError}</div>}

            {loadingAdmin ? (
              <article className="step-card">
                <h3>Chargement de l'admin...</h3>
                <p>Le frontend attend la reponse du backend.</p>
              </article>
            ) : (
              <>
                {adminPage === 'overview' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Vue d'ensemble</div>
                        <div className="shop-admin-page-sub">Activite globale de la plateforme</div>
                      </div>
                      <div className="shop-admin-topbar-actions">
                        <button className="shop-admin-btn" onClick={loadAdmin} type="button">Exporter</button>
                        <button className="shop-admin-btn shop-admin-btn-green" type="button">+ Nouveau site premium</button>
                      </div>
                    </div>

                    <div className="shop-admin-metrics">
                      <article className="shop-admin-metric-card">
                        <div className="shop-admin-metric-label">Utilisateurs inscrits</div>
                        <div className="shop-admin-metric-value">{adminUsers.length}</div>
                        <div className="shop-admin-metric-sub">Total de la plateforme</div>
                        <div className="shop-admin-badge shop-admin-badge-green">{activePublishedSites.length} avec site actif</div>
                      </article>
                      <article className="shop-admin-metric-card">
                        <div className="shop-admin-metric-label">Sites actifs</div>
                        <div className="shop-admin-metric-value">{activePublishedSites.length}</div>
                        <div className="shop-admin-metric-sub">{adminSites.length - activePublishedSites.length} en cours de creation</div>
                        <div className="shop-admin-badge shop-admin-badge-blue">{adminSites.length} sites au total</div>
                      </article>
                      <article className="shop-admin-metric-card">
                        <div className="shop-admin-metric-label">Revenus totaux</div>
                        <div className="shop-admin-metric-value">{new Intl.NumberFormat('fr-FR').format(totalRevenue)}</div>
                        <div className="shop-admin-metric-sub">FCFA encaisses</div>
                        <div className="shop-admin-badge shop-admin-badge-amber">{new Intl.NumberFormat('fr-FR').format(premiumDeposits)} FCFA d'acomptes</div>
                      </article>
                      <article className="shop-admin-metric-card">
                        <div className="shop-admin-metric-label">Paiements en attente</div>
                        <div className="shop-admin-metric-value">{pendingPayments.length}</div>
                        <div className="shop-admin-metric-sub">A valider manuellement</div>
                        <div className="shop-admin-badge shop-admin-badge-red">Action requise</div>
                      </article>
                    </div>

                    <div className="shop-admin-two-col">
                      <article className="shop-admin-card">
                        <div className="shop-admin-card-header">
                          <span className="shop-admin-card-title">Derniers paiements</span>
                          <span className="shop-admin-badge shop-admin-badge-green">Mis a jour</span>
                        </div>
                        <div className="shop-admin-card-body">
                          {adminPayments.slice(0, 5).map((payment) => {
                            const client = adminUsers.find((user) => user.id === payment.userId)
                            const isPremium = payment.type === 'premium'
                            const isPaid = paidStatuses.includes(String(payment.status || '').toLowerCase())

                            return (
                              <div className="shop-admin-revenue-row" key={payment.id}>
                                <div className="shop-admin-revenue-left">
                                  <div className={`shop-admin-revenue-icon ${isPremium ? 'is-premium' : 'is-auto'}`}>{isPremium ? 'PR' : 'AU'}</div>
                                  <div>
                                    <div className="shop-admin-user-name">{client?.name || 'Client'}</div>
                                    <div className="shop-admin-revenue-date">{isPremium ? 'Premium' : 'Autonome'} · {formatDate(payment.createdAt)}</div>
                                  </div>
                                </div>
                                <div className="shop-admin-revenue-right">
                                  <div className="shop-admin-revenue-amount">{formatPrice(payment.amount)}</div>
                                  <div className={`shop-admin-badge ${isPaid ? 'shop-admin-badge-green' : 'shop-admin-badge-red'}`}>{isPaid ? 'Paye' : 'En attente'}</div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </article>

                      <article className="shop-admin-card">
                        <div className="shop-admin-card-header">
                          <span className="shop-admin-card-title">Offre de lancement - compteur</span>
                        </div>
                        <div className="shop-admin-offer-panel">
                          <div>
                            <div className="shop-admin-progress-head">
                              <span>Autonome · places promo</span>
                              <span>{autonomousUsed} / 10</span>
                            </div>
                            <div className="shop-admin-progress-wrap">
                              <div className="shop-admin-progress-fill" style={{ width: `${Math.min(100, autonomousUsed * 10)}%` }} />
                            </div>
                            <div className="shop-admin-progress-note">Prix actuel : {autonomousRemaining > 0 ? '4 000 FCFA' : '5 000 FCFA'} · {autonomousRemaining} places restantes</div>
                          </div>
                          <div>
                            <div className="shop-admin-progress-head">
                              <span>Premium · places promo</span>
                              <span>{adminSummary?.premiumOrders || 0} / 10</span>
                            </div>
                            <div className="shop-admin-progress-wrap">
                              <div className="shop-admin-progress-fill is-amber" style={{ width: `${Math.min(100, (adminSummary?.premiumOrders || 0) * 10)}%` }} />
                            </div>
                            <div className="shop-admin-progress-note">Prix actuel : {premiumRemaining > 0 ? '10 000 FCFA' : '12 000 FCFA'} · {premiumRemaining} places restantes</div>
                          </div>
                          <div className="shop-admin-offer-note">Apres 10 clients : prix autonome → 5 000 FCFA · prix premium → 12 000 FCFA</div>
                        </div>
                      </article>
                    </div>
                  </div>
                )}

                {adminPage === 'users' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Utilisateurs</div>
                        <div className="shop-admin-page-sub">{adminUsers.length} comptes inscrits sur la plateforme</div>
                      </div>
                      <button className="shop-admin-btn" type="button">Exporter CSV</button>
                    </div>
                    <article className="shop-admin-card">
                      <div className="shop-admin-filter-bar">
                        {[
                          ['all', `Tous (${userRows.length})`],
                          ['active', `Actifs (${userRows.filter((row) => row.filterKey === 'active').length})`],
                          ['premium', `Premium (${userRows.filter((row) => row.filterKey === 'premium').length})`],
                          ['pending', `En attente (${userRows.filter((row) => row.filterKey === 'pending').length})`],
                        ].map(([key, label]) => (
                          <button className={`shop-admin-filter-pill ${adminUserFilter === key ? 'is-active' : ''}`} key={key} onClick={() => setAdminUserFilter(key)} type="button">
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="shop-admin-table-wrap">
                        <table className="shop-admin-table">
                          <thead>
                            <tr><th>Utilisateur</th><th>Type</th><th>Statut site</th><th>Paiement</th><th>Inscrit le</th><th>Actions</th></tr>
                          </thead>
                          <tbody>
                            {visibleUserRows.map((row) => (
                              <tr key={row.id}>
                                <td>
                                  <div className="shop-admin-user-cell">
                                    <div className={`shop-admin-avatar ${row.typeTone === 'amber' ? 'is-premium' : ''}`}>{row.initials}</div>
                                    <div>
                                      <div className="shop-admin-user-name">{row.name}</div>
                                      <div className="shop-admin-user-sub">{row.email}</div>
                                    </div>
                                  </div>
                                </td>
                                <td><span className={`shop-admin-badge shop-admin-badge-${row.typeTone}`}>{row.typeLabel}</span></td>
                                <td><span className={`shop-admin-status-dot is-${row.siteTone}`} />{row.siteStatus}</td>
                                <td><span className={`shop-admin-badge shop-admin-badge-${row.paymentTone}`}>{row.paymentLabel}</span></td>
                                <td>{formatDate(row.createdAt)}</td>
                                <td>
                                  <div className="shop-admin-action-btns">
                                    <button className="shop-admin-icon-btn" type="button">Voir</button>
                                    <button className="shop-admin-icon-btn" type="button">Edit</button>
                                    <button className="shop-admin-icon-btn" type="button">Msg</button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                )}

                {adminPage === 'payments' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Paiements</div>
                        <div className="shop-admin-page-sub">Historique complet · acomptes · soldes</div>
                      </div>
                      <button className="shop-admin-btn" type="button">Exporter</button>
                    </div>
                    <div className="shop-admin-metrics">
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Total encaisse</div><div className="shop-admin-metric-value">{new Intl.NumberFormat('fr-FR').format(totalRevenue)}</div><div className="shop-admin-metric-sub">FCFA</div></article>
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Acomptes recus</div><div className="shop-admin-metric-value">{new Intl.NumberFormat('fr-FR').format(premiumDeposits)}</div><div className="shop-admin-metric-sub">FCFA · {premiumPayments.filter((p) => p.step === 'acompte').length} projets</div></article>
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Soldes restants</div><div className="shop-admin-metric-value">{new Intl.NumberFormat('fr-FR').format(premiumBalancesRemaining)}</div><div className="shop-admin-metric-sub">FCFA a encaisser</div></article>
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">En attente</div><div className="shop-admin-metric-value">{pendingPayments.length}</div><div className="shop-admin-metric-sub">paiements a valider</div></article>
                    </div>
                    <article className="shop-admin-card">
                      <div className="shop-admin-tab-bar">
                        {[
                          ['all', 'Tous les paiements'],
                          ['auto', 'Creation autonome'],
                          ['premium', 'Service premium'],
                          ['pending', `En attente (${pendingPayments.length})`],
                        ].map(([key, label]) => (
                          <button className={`shop-admin-tab ${adminPaymentTab === key ? 'is-active' : ''}`} key={key} onClick={() => setAdminPaymentTab(key)} type="button">
                            {label}
                          </button>
                        ))}
                      </div>
                      <div className="shop-admin-table-wrap">
                        <table className="shop-admin-table">
                          <thead>
                            <tr><th>Client</th><th>Type</th><th>Montant</th><th>Etape</th><th>Statut</th><th>Date</th><th>Action</th></tr>
                          </thead>
                          <tbody>
                            {paymentTabRows.map((payment) => {
                              const client = adminUsers.find((user) => user.id === payment.userId)
                              const statusTone = paidStatuses.includes(String(payment.status || '').toLowerCase()) ? (payment.type === 'premium' ? 'amber' : 'green') : 'red'
                              return (
                                <tr key={payment.id}>
                                  <td>
                                    <div className="shop-admin-user-cell">
                                      <div className={`shop-admin-avatar ${payment.type === 'premium' ? 'is-premium' : ''}`}>{getInitials(client?.name || 'CL')}</div>
                                      <div className="shop-admin-user-name">{client?.name || 'Client'}</div>
                                    </div>
                                  </td>
                                  <td>{payment.type === 'premium' ? 'Premium' : 'Autonome'}</td>
                                  <td className="shop-admin-money-cell">{formatPrice(payment.amount)}</td>
                                  <td>{payment.step || '-'}</td>
                                  <td><span className={`shop-admin-badge shop-admin-badge-${statusTone}`}>{payment.status}</span></td>
                                  <td>{formatDate(payment.createdAt)}</td>
                                  <td><div className="shop-admin-action-btns"><button className="shop-admin-icon-btn" type="button">Voir</button><button className="shop-admin-icon-btn" type="button">Valider</button></div></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                )}

                {adminPage === 'premium' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Projets Premium</div>
                        <div className="shop-admin-page-sub">Suivi des sites crees manuellement</div>
                      </div>
                      <button className="shop-admin-btn shop-admin-btn-green" type="button">+ Nouveau projet</button>
                    </div>
                    <article className="shop-admin-card">
                      <div className="shop-admin-filter-bar">
                        <button className="shop-admin-filter-pill is-active" type="button">Tous ({premiumProjects.length})</button>
                        <button className="shop-admin-filter-pill" type="button">En cours ({premiumProjects.filter((item) => item.statusTone === 'amber').length})</button>
                        <button className="shop-admin-filter-pill" type="button">Bloques ({premiumProjects.filter((item) => item.statusTone === 'red').length})</button>
                      </div>
                      <div className="shop-admin-table-wrap">
                        <table className="shop-admin-table">
                          <thead>
                            <tr><th>Client</th><th>Type site</th><th>Acompte</th><th>Solde</th><th>Delai</th><th>Statut</th><th>Actions</th></tr>
                          </thead>
                          <tbody>
                            {premiumProjects.map((project) => (
                              <tr key={project.id}>
                                <td><div className="shop-admin-user-cell"><div className="shop-admin-avatar is-premium">{project.initials}</div><div><div className="shop-admin-user-name">{project.clientName}</div><div className="shop-admin-user-sub">{project.siteType}</div></div></div></td>
                                <td>{project.siteType}</td>
                                <td><span className="shop-admin-badge shop-admin-badge-green">{formatPrice(project.depositAmount)}</span></td>
                                <td className="shop-admin-money-cell is-danger">{project.remainingBalance > 0 ? formatPrice(project.remainingBalance) : '-'}</td>
                                <td><span className={`shop-admin-badge ${project.urgency === 'urgent' ? 'shop-admin-badge-red' : 'shop-admin-badge-amber'}`}>{project.deadlineLabel}</span></td>
                                <td><span className={`shop-admin-status-dot is-${project.statusTone}`} />{project.statusLabel}</td>
                                <td><div className="shop-admin-action-btns"><button className="shop-admin-icon-btn" type="button">Edit</button><button className="shop-admin-icon-btn" type="button">Msg</button><button className="shop-admin-icon-btn" type="button">Livrer</button></div></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                )}

                {adminPage === 'countdown' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Decomptes de livraison</div>
                        <div className="shop-admin-page-sub">Temps restant depuis le premier acompte</div>
                      </div>
                    </div>
                    <div className="shop-admin-two-col">
                      <div>
                        <div className="shop-admin-mini-heading">VUE ADMINISTRATEUR</div>
                        <article className="shop-admin-countdown-card">
                          <div className="shop-admin-mini-title">Projets en cours</div>
                          {premiumProjects.length === 0 ? (
                            <div className="shop-admin-countdown-note">Aucun projet premium actif.</div>
                          ) : (
                            premiumProjects.map((project) => (
                              <div className={`shop-admin-countdown-project ${project.urgency === 'urgent' ? 'is-urgent' : ''}`} key={project.id}>
                                <div>
                                  <div className="shop-admin-cdown-client">{project.clientName}</div>
                                  <div className="shop-admin-cdown-type">{project.siteType} · {project.deadlineLabel} · Demarre le {formatDate(project.startedAt)}</div>
                                </div>
                                <div className="shop-admin-cdown-timer">
                                  <div className={`shop-admin-cdown-days ${project.urgency === 'urgent' ? 'is-urgent' : ''}`}>{project.deliveryTargetAt ? countdownText : '0j 0h'}</div>
                                  <div className="shop-admin-cdown-label">restants</div>
                                </div>
                              </div>
                            ))
                          )}
                          <div className="shop-admin-countdown-note">Le decompte demarre automatiquement des la reception de l'acompte.</div>
                        </article>
                      </div>
                      <div>
                        <div className="shop-admin-mini-heading">VUE CLIENT</div>
                        <article className="shop-admin-countdown-card">
                          <div className="shop-admin-mini-title">Votre site est en cours de creation</div>
                          <div className="shop-admin-client-timer-box">
                            <div className="shop-admin-client-timer-label">Livraison estimee dans</div>
                            <div className="shop-admin-client-timer-value">{countdownText}</div>
                            <div className="shop-admin-client-timer-sub">Projet premium en cours</div>
                          </div>
                          <div className="shop-admin-client-success">Acompte recu · Le decompte apparaitra aussi cote client</div>
                          <div className="shop-admin-client-progress-box">
                            <div className="shop-admin-progress-head"><span>Avancement estime</span><span>45%</span></div>
                            <div className="shop-admin-progress-wrap is-tall"><div className="shop-admin-progress-fill" style={{ width: '45%' }} /></div>
                            <div className="shop-admin-progress-note">Etape : Design en cours · ~45%</div>
                          </div>
                        </article>
                      </div>
                    </div>
                  </div>
                )}

                {adminPage === 'stats' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Statistiques globales</div>
                        <div className="shop-admin-page-sub">Performance de la plateforme</div>
                      </div>
                    </div>
                    <div className="shop-admin-metrics">
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Taux de conversion</div><div className="shop-admin-metric-value">{adminUsers.length > 0 ? `${Math.round((paidPayments.length / adminUsers.length) * 100)}%` : '0%'}</div><div className="shop-admin-metric-sub">Inscrits vers payants</div></article>
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Clics WhatsApp totaux</div><div className="shop-admin-metric-value">{products.length * 12}</div><div className="shop-admin-metric-sub">Approximation prototype</div></article>
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Sites autonomes</div><div className="shop-admin-metric-value">{autonomousPayments.length}</div><div className="shop-admin-metric-sub">transactions autonomes</div></article>
                      <article className="shop-admin-metric-card"><div className="shop-admin-metric-label">Sites premium</div><div className="shop-admin-metric-value">{premiumPayments.length}</div><div className="shop-admin-metric-sub">commandes premium</div></article>
                    </div>
                    <article className="shop-admin-card">
                      <div className="shop-admin-card-header"><span className="shop-admin-card-title">Revenus par type de service</span></div>
                      <div className="shop-admin-offer-panel">
                        <div>
                          <div className="shop-admin-progress-head"><span>Creation autonome</span><span className="shop-admin-money-inline">{new Intl.NumberFormat('fr-FR').format(autonomousPayments.filter((payment) => paidStatuses.includes(String(payment.status || '').toLowerCase())).reduce((sum, payment) => sum + Number(payment.amount || 0), 0))} FCFA</span></div>
                          <div className="shop-admin-progress-wrap is-tall"><div className="shop-admin-progress-fill" style={{ width: `${totalRevenue ? Math.round((autonomousPayments.filter((payment) => paidStatuses.includes(String(payment.status || '').toLowerCase())).reduce((sum, payment) => sum + Number(payment.amount || 0), 0) / totalRevenue) * 100) : 0}%` }} /></div>
                        </div>
                        <div>
                          <div className="shop-admin-progress-head"><span>Service premium (acomptes)</span><span className="shop-admin-money-inline">{new Intl.NumberFormat('fr-FR').format(premiumDeposits)} FCFA</span></div>
                          <div className="shop-admin-progress-wrap is-tall"><div className="shop-admin-progress-fill is-amber" style={{ width: `${totalRevenue ? Math.round((premiumDeposits / totalRevenue) * 100) : 0}%` }} /></div>
                        </div>
                        <div>
                          <div className="shop-admin-progress-head"><span>Premium soldes encaisses</span><span className="shop-admin-money-inline">{new Intl.NumberFormat('fr-FR').format(premiumBalancesCollected)} FCFA</span></div>
                          <div className="shop-admin-progress-wrap is-tall"><div className="shop-admin-progress-fill" style={{ width: `${totalRevenue ? Math.round((premiumBalancesCollected / totalRevenue) * 100) : 0}%` }} /></div>
                        </div>
                        <div className="shop-admin-total-row"><span>Total encaisse</span><span>{formatPrice(totalRevenue)}</span></div>
                      </div>
                    </article>
                  </div>
                )}

                {adminPage === 'sites' && (
                  <div className="shop-admin-page">
                    <div className="shop-admin-topbar">
                      <div>
                        <div className="shop-admin-page-title">Sites publies</div>
                        <div className="shop-admin-page-sub">{activePublishedSites.length} sites actifs sur la plateforme</div>
                      </div>
                    </div>
                    <article className="shop-admin-card">
                      <div className="shop-admin-table-wrap">
                        <table className="shop-admin-table">
                          <thead>
                            <tr><th>Site</th><th>Proprietaire</th><th>Lien</th><th>Produits</th><th>Vues</th><th>Statut</th><th>Actions</th></tr>
                          </thead>
                          <tbody>
                            {adminSites.map((site) => {
                              const owner = adminUsers.find((user) => user.id === site.userId)
                              const siteProducts = products.filter((product) => product.siteId === site.id)
                              return (
                                <tr key={site.id}>
                                  <td className="shop-admin-site-name">{site.name}</td>
                                  <td>{owner?.name || 'Client'}</td>
                                  <td className="shop-admin-link-cell">{site.status === 'published' ? `shoplink.bj/${site.slug}` : 'non publie'}</td>
                                  <td>{siteProducts.length}</td>
                                  <td>{siteProducts.length * 21}</td>
                                  <td><span className={`shop-admin-badge ${site.status === 'published' ? 'shop-admin-badge-green' : 'shop-admin-badge-red'}`}>{site.status === 'published' ? 'En ligne' : 'Bloque'}</span></td>
                                  <td><div className="shop-admin-action-btns"><button className="shop-admin-icon-btn" type="button">Voir</button><button className="shop-admin-icon-btn" type="button">Edit</button></div></td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  </div>
                )}
              </>
            )}
          </section>
        </main>
      )}

      {/* MODALE DE PAIEMENT */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={closePaymentModal}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h2>Paiement - {paymentSuccess ? '✅ Reussi!' : 'Finaliser le paiement'}</h2>
              <button className="payment-modal-close" onClick={closePaymentModal} type="button">✕</button>
            </div>

            <div className="payment-modal-body">
              {paymentError && <div className="payment-error">{paymentError}</div>}
              {paymentSuccess && <div className="payment-success">Paiement effectue avec succes! Merci.</div>}

              {!paymentSuccess && (
                <form onSubmit={handlePaymentSubmit}>
                  <div className="payment-info">
                    <p className="payment-info-label">Site :</p>
                    <p className="payment-info-value">{siteData?.name}</p>

                    <p className="payment-info-label">Type :</p>
                    <p className="payment-info-value">
                      {paymentForm.paymentType === 'autonome'
                        ? 'Creation autonome (4 000 FCFA)'
                        : 'Service premium (5 000 FCFA acompte)'}
                    </p>
                  </div>

                  <label className="field">
                    <span>Numero de telephone (Mobile Money)</span>
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Ex: +229XXXXXXXX"
                      value={paymentForm.phone}
                      onChange={(e) => setPaymentForm({ ...paymentForm, phone: e.target.value })}
                      required
                    />
                    <small>Orange Money ou MTN Mobile Money</small>
                  </label>

                  <div className="payment-modal-actions">
                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={closePaymentModal}
                      disabled={paymentLoading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={paymentLoading}
                    >
                      {paymentLoading ? 'Traitement...' : 'Payer maintenant'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
