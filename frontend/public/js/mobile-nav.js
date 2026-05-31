// ============================================================
// SHOPLINK — frontend/js/mobile-nav.js
// Gestion du menu hamburger + bottom navigation mobile
// À inclure dans TOUTES les pages :
// <script src="/js/mobile-nav.js"></script>
// ============================================================

const MobileNav = {

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  },

  setup() {
    this.injectHamburger();
    this.injectMobileMenu();
    this.injectBottomNav();
    this.handleResize();
  },

  // ── Injecter le bouton hamburger dans la nav
  injectHamburger() {
    const nav = document.querySelector('nav, .topnav');
    if (!nav) return;

    // Vérifier si déjà injecté
    if (nav.querySelector('.hamburger-btn')) return;

    const btn = document.createElement('button');
    btn.className = 'hamburger-btn';
    btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = `<img src="https://cdn-icons-png.flaticon.com/512/18249/18249396.png" alt="" aria-hidden="true">`;
    btn.onclick = () => this.openMenu();
    nav.appendChild(btn);
  },

  // ── Injecter le menu mobile coulissant
  injectMobileMenu() {
    if (document.getElementById('mobile-nav-menu')) return;

    // Déterminer les liens selon la page
    const isAdmin     = window.location.pathname.includes('admin');
    const isDashboard = window.location.pathname.includes('dashboard');
    const isPublic    = !isAdmin && !isDashboard;

    let links = '';

    if (isPublic) {
      links = `
        <a href="/index.html" class="mobile-nav-item">🏠 <span data-i18n="nav.home">Accueil</span></a>
        <a href="#fonctionnalites" class="mobile-nav-item" onclick="MobileNav.closeMenu()">✨ <span data-i18n="nav.features">Fonctionnalités</span></a>
        <a href="#tarifs" class="mobile-nav-item" onclick="MobileNav.closeMenu()">💰 <span data-i18n="nav.pricing">Tarifs</span></a>
        <div class="mobile-nav-divider"></div>
        <a href="/login.html" class="mobile-nav-item">🔐 <span data-i18n="nav.login">Connexion</span></a>
        <a href="/register.html" class="mobile-nav-item active">🚀 <span data-i18n="nav.create">Créer mon site</span></a>
      `;
    } else if (isDashboard) {
      links = `
        <button class="mobile-nav-item" onclick="nav('accueil',null);MobileNav.closeMenu()">🏠 <span data-i18n="nav.home">Accueil</span></button>
        <button class="mobile-nav-item" onclick="nav('produits',null);MobileNav.closeMenu()">📦 <span data-i18n="nav.products">Mes produits</span></button>
        <button class="mobile-nav-item" onclick="nav('monsite',null);MobileNav.closeMenu()">🌐 <span data-i18n="nav.mysite">Mon site</span></button>
        <button class="mobile-nav-item" onclick="nav('stats',null);MobileNav.closeMenu()">📈 <span data-i18n="nav.stats">Statistiques</span></button>
        <button class="mobile-nav-item" onclick="nav('parametres',null);MobileNav.closeMenu()">⚙️ <span data-i18n="nav.settings">Paramètres</span></button>
        <div class="mobile-nav-divider"></div>
        <button class="mobile-nav-item" onclick="logout()" style="color:#f09595;">🚪 <span data-i18n="nav.logout">Se déconnecter</span></button>
      `;
    } else if (isAdmin) {
      links = `
        <button class="mobile-nav-item" onclick="showPage('overview',null);MobileNav.closeMenu()">📊 <span data-i18n="admin.overview">Vue d'ensemble</span></button>
        <button class="mobile-nav-item" onclick="showPage('users',null);MobileNav.closeMenu()">👥 <span data-i18n="admin.users">Utilisateurs</span></button>
        <button class="mobile-nav-item" onclick="showPage('payments',null);MobileNav.closeMenu()">💳 <span data-i18n="admin.payments">Paiements</span></button>
        <button class="mobile-nav-item" onclick="showPage('premium',null);MobileNav.closeMenu()">⭐ <span data-i18n="admin.premium">Projets Premium</span></button>
        <button class="mobile-nav-item" onclick="showPage('countdown',null);MobileNav.closeMenu()">⏱ <span data-i18n="admin.countdown">Décomptes</span></button>
        <div class="mobile-nav-divider"></div>
        <button class="mobile-nav-item" onclick="logout()" style="color:#f09595;">🚪 <span data-i18n="nav.logout">Se déconnecter</span></button>
      `;
    }

    // Overlay
    const overlay = document.createElement('div');
    overlay.id = 'mobile-nav-overlay';
    overlay.className = 'mobile-nav-overlay';
    overlay.onclick = () => this.closeMenu();

    // Menu
    const menu = document.createElement('div');
    menu.id = 'mobile-nav-menu';
    menu.className = 'mobile-nav-menu';
    menu.innerHTML = `
      <button class="mobile-nav-close" onclick="MobileNav.closeMenu()">✕</button>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;padding:0 4px;">
        <span style="display:inline-block;width:8px;height:8px;background:#f59c1a;border-radius:50%;"></span>
        <span style="font-size:18px;font-weight:500;color:#fff;">ShopLink</span>
      </div>
      ${links}
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(menu);
  },

  // ── Bottom Navigation (dashboard mobile)
  injectBottomNav() {
    const isDashboard = window.location.pathname.includes('dashboard');
    if (!isDashboard) return;
    if (document.getElementById('bottom-nav')) return;

    const nav = document.createElement('div');
    nav.id = 'bottom-nav';
    nav.className = 'bottom-nav';
    nav.innerHTML = `
      <div class="bottom-nav-items">
        <button class="bottom-nav-item active" id="bn-accueil" onclick="switchBottomNav('accueil',this)">
          <span class="bottom-nav-icon">🏠</span>
          <span class="bottom-nav-label" data-i18n="nav.home">Accueil</span>
        </button>
        <button class="bottom-nav-item" id="bn-produits" onclick="switchBottomNav('produits',this)">
          <span class="bottom-nav-icon">📦</span>
          <span class="bottom-nav-label" data-i18n="nav.products">Produits</span>
        </button>
        <button class="bottom-nav-item" id="bn-monsite" onclick="switchBottomNav('monsite',this)">
          <span class="bottom-nav-icon">🌐</span>
          <span class="bottom-nav-label" data-i18n="nav.mysite">Mon site</span>
        </button>
        <button class="bottom-nav-item" id="bn-stats" onclick="switchBottomNav('stats',this)">
          <span class="bottom-nav-icon">📈</span>
          <span class="bottom-nav-label" data-i18n="nav.stats">Stats</span>
        </button>
        <button class="bottom-nav-item" id="bn-parametres" onclick="switchBottomNav('parametres',this)">
          <span class="bottom-nav-icon">⚙️</span>
          <span class="bottom-nav-label" data-i18n="nav.settings">Compte</span>
        </button>
      </div>
    `;
    document.body.appendChild(nav);
  },

  // ── Ouvrir le menu
  openMenu() {
    document.getElementById('mobile-nav-menu')?.classList.add('open');
    document.getElementById('mobile-nav-overlay')?.classList.add('open');
    document.body.style.overflow = 'hidden';
  },

  // ── Fermer le menu
  closeMenu() {
    document.getElementById('mobile-nav-menu')?.classList.remove('open');
    document.getElementById('mobile-nav-overlay')?.classList.remove('open');
    document.body.style.overflow = '';
  },

  // ── Gérer le resize
  handleResize() {
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) this.closeMenu();
    });
  }
};

// ── Synchroniser la bottom nav avec la nav principale du dashboard
function switchBottomNav(id, btn) {
  // Mapper les IDs aux indices de goToPage
  const pageToIndex = {
    'accueil': 0,
    'produits': 1,
    'monsite': 2,
    'stats': 3,
    'support': 4,
    'parametres': 5
  };

  // Appeler la fonction goToPage() du dashboard si elle existe
  if (typeof goToPage === 'function' && pageToIndex[id] !== undefined) {
    goToPage(pageToIndex[id]);
  } else if (typeof nav === 'function') {
    nav(id, null);
  }

  // Mettre à jour la bottom nav
  document.querySelectorAll('.bottom-nav-item').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Scroll vers le haut
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Démarrer
MobileNav.init();
window.MobileNav = MobileNav;
