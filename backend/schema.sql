-- ============================================================
-- SHOPLINK — Base de données Supabase
-- Copiez-collez ce script dans :
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- ──────────────────────────────────────
-- TABLE : users (utilisateurs)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  phone       TEXT,
  role        TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- TABLE : sites (boutiques vitrine)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sites (
  id             TEXT PRIMARY KEY,
  user_id        TEXT REFERENCES users(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  slug           TEXT UNIQUE NOT NULL,
  slogan         TEXT,
  description    TEXT,
  activity_type  TEXT DEFAULT 'boutique' CHECK (activity_type IN ('restaurant','boutique','fast-food','cosmetique','autre')),
  whatsapp       TEXT NOT NULL,
  phone2         TEXT,
  address        TEXT,
  city           TEXT,
  logo_url       TEXT,
  primary_color  TEXT DEFAULT '#1a5c38',
  status         TEXT DEFAULT 'draft' CHECK (status IN ('draft','pending','published')),
  type           TEXT DEFAULT 'autonome' CHECK (type IN ('autonome','premium')),
  views          INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  published_at   TIMESTAMP WITH TIME ZONE,
  created_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- TABLE : products (produits)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            TEXT PRIMARY KEY,
  site_id       TEXT REFERENCES sites(id) ON DELETE CASCADE,
  user_id       TEXT REFERENCES users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  price         DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  description   TEXT,
  image_url     TEXT DEFAULT '',
  category      TEXT DEFAULT 'Général',
  is_visible    BOOLEAN DEFAULT true,
  views         INTEGER DEFAULT 0,
  whatsapp_clicks INTEGER DEFAULT 0,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- TABLE : payments (paiements)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  site_id     TEXT REFERENCES sites(id) ON DELETE SET NULL,
  type        TEXT NOT NULL CHECK (type IN ('autonome','premium')),
  step        TEXT DEFAULT 'full' CHECK (step IN ('full','acompte','solde')),
  amount      INTEGER NOT NULL CHECK (amount > 0),
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','failed','refunded')),
  method      TEXT DEFAULT 'fedapay',
  reference   TEXT UNIQUE,
  admin_note  TEXT,
  paid_at     TIMESTAMP WITH TIME ZONE,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- TABLE : premium_orders (commandes premium)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS premium_orders (
  id              TEXT PRIMARY KEY,
  user_id         TEXT REFERENCES users(id) ON DELETE CASCADE,
  site_id         TEXT REFERENCES sites(id) ON DELETE SET NULL,
  company_name    TEXT NOT NULL,
  manager_name    TEXT NOT NULL,
  whatsapp        TEXT NOT NULL,
  email           TEXT,
  city            TEXT,
  activity_type   TEXT,
  description     TEXT,
  target          TEXT,
  style           TEXT DEFAULT 'moderne',
  site_type       TEXT DEFAULT 'catalogue',
  delai           TEXT DEFAULT 'normal' CHECK (delai IN ('normal','urgent')),
  feat_whatsapp   BOOLEAN DEFAULT true,
  feat_delivery   BOOLEAN DEFAULT false,
  feat_maps       BOOLEAN DEFAULT false,
  colors          TEXT,
  notes           TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','in_progress','delivered')),
  acompte_paid_at TIMESTAMP WITH TIME ZONE,
  delivered_at    TIMESTAMP WITH TIME ZONE,
  created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- TABLE : tracking (suivi des visites et clics)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tracking (
  id          TEXT PRIMARY KEY,
  site_id     TEXT REFERENCES sites(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('visit','whatsapp_click','share')),
  ip_address  TEXT,
  user_agent  TEXT,
  referrer    TEXT,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- TABLE : tickets (tickets support)
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS tickets (
  id          TEXT PRIMARY KEY,
  user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  priority    TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','pending','answered','closed')),
  replies     JSONB DEFAULT '[]',
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────
-- INDEX pour les performances
-- ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sites_user_id   ON sites(user_id);
CREATE INDEX IF NOT EXISTS idx_sites_slug      ON sites(slug);
CREATE INDEX IF NOT EXISTS idx_sites_status    ON sites(status);
CREATE INDEX IF NOT EXISTS idx_products_site   ON products(site_id);
CREATE INDEX IF NOT EXISTS idx_payments_user   ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_tracking_site   ON tracking(site_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user    ON tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status  ON tickets(status);

-- ──────────────────────────────────────
-- FONCTION : mise à jour automatique de updated_at
-- ──────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────
-- TRIGGERS pour updated_at automatique
-- ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_users_updated ON users;
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_sites_updated ON sites;
CREATE TRIGGER trg_sites_updated BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_products_updated ON products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_payments_updated ON payments;
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_premium_orders_updated ON premium_orders;
CREATE TRIGGER trg_premium_orders_updated BEFORE UPDATE ON premium_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_tickets_updated ON tickets;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ──────────────────────────────────────
-- POLITIQUES DE SÉCURITÉ (Row Level Security)
-- ──────────────────────────────────────
-- RLS désactivé par défaut pour permettre la migration
-- À activer plus tard si nécessaire pour la sécurité côté client
-- ALTER TABLE users    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sites    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE products ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Le backend utilise la clé SERVICE donc il passe outre le RLS
-- Ces policies s'appliquent aux appels directs côté client

-- Sites publics visibles par tous
-- CREATE POLICY "Sites publiés visibles" ON sites
--   FOR SELECT USING (status = 'published');

-- Produits visibles pour les sites publiés
-- CREATE POLICY "Produits visibles" ON products
--   FOR SELECT USING (is_visible = true);

-- ──────────────────────────────────────
-- STORAGE : Buckets pour les images
-- ──────────────────────────────────────
-- À créer manuellement dans Supabase Dashboard → Storage :
-- 1. Bucket "logos"    → public: true
-- 2. Bucket "products" → public: true

-- ──────────────────────────────────────
-- VÉRIFICATION : voir les tables créées
-- ──────────────────────────────────────
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
