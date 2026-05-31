-- ============================================================
-- SHOPLINK — SÉCURITÉ SUPABASE / RLS
-- ============================================================
-- Objectif : corriger les alertes Supabase "RLS disabled" et
-- éviter les policies trop ouvertes "unrestricted".
--
-- À exécuter dans :
-- Supabase Dashboard → SQL Editor → New Query → Run
--
-- IMPORTANT :
-- - L'application ShopLink utilise son propre backend Express.
-- - Le backend utilise SUPABASE_SERVICE_KEY côté serveur.
-- - La clé service_role contourne RLS, donc ces policies ne cassent
--   pas le backend.
-- - Ne jamais exposer SUPABASE_SERVICE_KEY dans le frontend.
-- ============================================================

-- ============================================================
-- 1. ACTIVER RLS SUR TOUTES LES TABLES PUBLIQUES SHOPLINK
-- ============================================================

ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.premium_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. NETTOYER LES ANCIENNES POLICIES POTENTIELLEMENT TROP OUVERTES
-- ============================================================

DROP POLICY IF EXISTS "Users can insert" ON public.users;
DROP POLICY IF EXISTS "Sites can insert" ON public.sites;
DROP POLICY IF EXISTS "Payments can insert" ON public.payments;
DROP POLICY IF EXISTS "Tickets can insert" ON public.tickets;
DROP POLICY IF EXISTS "Products can insert" ON public.products;

DROP POLICY IF EXISTS "Users can view own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can delete own data" ON public.users;

DROP POLICY IF EXISTS "Sites can view own" ON public.sites;
DROP POLICY IF EXISTS "Sites can update own" ON public.sites;
DROP POLICY IF EXISTS "Sites can delete own" ON public.sites;
DROP POLICY IF EXISTS "Sites public view" ON public.sites;

DROP POLICY IF EXISTS "Products can view own" ON public.products;
DROP POLICY IF EXISTS "Products can update own" ON public.products;
DROP POLICY IF EXISTS "Products can delete own" ON public.products;
DROP POLICY IF EXISTS "Products public view" ON public.products;

DROP POLICY IF EXISTS "Payments can view own" ON public.payments;
DROP POLICY IF EXISTS "Payments can update own" ON public.payments;

DROP POLICY IF EXISTS "Tickets can view own" ON public.tickets;
DROP POLICY IF EXISTS "Tickets can update own" ON public.tickets;
DROP POLICY IF EXISTS "Tickets can delete own" ON public.tickets;

-- ============================================================
-- 3. POLICIES SERVICE ROLE — ACCÈS BACKEND COMPLET
-- ============================================================
-- Ces policies sont volontairement limitées au rôle service_role.
-- Elles évitent les policies anonymes trop ouvertes.

DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users"
ON public.users
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access sites" ON public.sites;
CREATE POLICY "Service role full access sites"
ON public.sites
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access products" ON public.products;
CREATE POLICY "Service role full access products"
ON public.products
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access payments" ON public.payments;
CREATE POLICY "Service role full access payments"
ON public.payments
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access premium_orders" ON public.premium_orders;
CREATE POLICY "Service role full access premium_orders"
ON public.premium_orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access tickets" ON public.tickets;
CREATE POLICY "Service role full access tickets"
ON public.tickets
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access tracking" ON public.tracking;
CREATE POLICY "Service role full access tracking"
ON public.tracking
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- 4. LECTURE PUBLIQUE MINIMALE OPTIONNELLE
-- ============================================================
-- À garder seulement si tu veux que des clients Supabase anonymes
-- puissent lire directement les sites/produits publiés.
-- Ton frontend actuel passe surtout par le backend, donc ces policies
-- ne sont pas indispensables, mais elles restent limitées.

DROP POLICY IF EXISTS "Public can read published sites" ON public.sites;
CREATE POLICY "Public can read published sites"
ON public.sites
FOR SELECT
TO anon, authenticated
USING (status = 'published');

DROP POLICY IF EXISTS "Public can read products from published sites" ON public.products;
CREATE POLICY "Public can read products from published sites"
ON public.products
FOR SELECT
TO anon, authenticated
USING (
  is_visible = true
  AND EXISTS (
    SELECT 1
    FROM public.sites
    WHERE sites.id = products.site_id
      AND sites.status = 'published'
  )
);

-- ============================================================
-- 5. VÉRIFICATION
-- ============================================================

SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'sites',
    'products',
    'payments',
    'premium_orders',
    'tickets',
    'tracking'
  )
ORDER BY tablename;

SELECT
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'sites',
    'products',
    'payments',
    'premium_orders',
    'tickets',
    'tracking'
  )
ORDER BY tablename, policyname;
