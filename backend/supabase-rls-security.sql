-- ============================================================
-- SCRIPT DE SÉCURITÉ SUPABASE - ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================================
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- ============================================================
-- 1. TABLE USERS
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Politique pour service role : accès complet pour le backend
DROP POLICY IF EXISTS "Service role full access users" ON public.users;
CREATE POLICY "Service role full access users" 
ON public.users 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Politique pour lecture : seul l'utilisateur peut voir ses propres données
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" 
ON public.users 
FOR SELECT 
USING (auth.uid()::text = id);

-- Politique pour insertion : permettre création de nouveaux utilisateurs
DROP POLICY IF EXISTS "Users can insert" ON public.users;
CREATE POLICY "Users can insert" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Politique pour mise à jour : seul l'utilisateur peut modifier ses données
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" 
ON public.users 
FOR UPDATE 
USING (auth.uid()::text = id);

-- Politique pour suppression : seul l'utilisateur peut supprimer ses données
DROP POLICY IF EXISTS "Users can delete own data" ON public.users;
CREATE POLICY "Users can delete own data" 
ON public.users 
FOR DELETE 
USING (auth.uid()::text = id);

-- ============================================================
-- 2. TABLE SITES
-- ============================================================
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Politique pour service role : accès complet pour le backend
DROP POLICY IF EXISTS "Service role full access sites" ON public.sites;
CREATE POLICY "Service role full access sites" 
ON public.sites 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Politique pour lecture : seul le propriétaire peut voir son site
DROP POLICY IF EXISTS "Sites can view own" ON public.sites;
CREATE POLICY "Sites can view own" 
ON public.sites 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Politique pour insertion : permettre création de sites
DROP POLICY IF EXISTS "Sites can insert" ON public.sites;
CREATE POLICY "Sites can insert" 
ON public.sites 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Politique pour mise à jour : seul le propriétaire peut modifier son site
DROP POLICY IF EXISTS "Sites can update own" ON public.sites;
CREATE POLICY "Sites can update own" 
ON public.sites 
FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Politique pour suppression : seul le propriétaire peut supprimer son site
DROP POLICY IF EXISTS "Sites can delete own" ON public.sites;
CREATE POLICY "Sites can delete own" 
ON public.sites 
FOR DELETE 
USING (auth.uid()::text = user_id);

-- Politique pour lecture publique : tout le monde peut voir les sites publiés
DROP POLICY IF EXISTS "Sites public view" ON public.sites;
CREATE POLICY "Sites public view" 
ON public.sites 
FOR SELECT 
USING (status = 'published');

-- ============================================================
-- 3. TABLE PRODUCTS
-- ============================================================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Politique pour service role : accès complet pour le backend
DROP POLICY IF EXISTS "Service role full access products" ON public.products;
CREATE POLICY "Service role full access products" 
ON public.products 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Politique pour lecture : seul le propriétaire du site peut voir ses produits
DROP POLICY IF EXISTS "Products can view own" ON public.products;
CREATE POLICY "Products can view own" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = products.site_id 
    AND sites.user_id = auth.uid()::text
  )
);

-- Politique pour insertion : permettre création de produits
DROP POLICY IF EXISTS "Products can insert" ON public.products;
CREATE POLICY "Products can insert" 
ON public.products 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = products.site_id 
    AND sites.user_id = auth.uid()::text
  )
);

-- Politique pour mise à jour : seul le propriétaire peut modifier ses produits
DROP POLICY IF EXISTS "Products can update own" ON public.products;
CREATE POLICY "Products can update own" 
ON public.products 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = products.site_id 
    AND sites.user_id = auth.uid()::text
  )
);

-- Politique pour suppression : seul le propriétaire peut supprimer ses produits
DROP POLICY IF EXISTS "Products can delete own" ON public.products;
CREATE POLICY "Products can delete own" 
ON public.products 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = products.site_id 
    AND sites.user_id = auth.uid()::text
  )
);

-- Politique pour lecture publique : tout le monde peut voir les produits des sites publiés
DROP POLICY IF EXISTS "Products public view" ON public.products;
CREATE POLICY "Products public view" 
ON public.products 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = products.site_id 
    AND sites.status = 'published'
  )
);

-- ============================================================
-- 4. TABLE PAYMENTS
-- ============================================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Politique pour service role : accès complet pour le backend
DROP POLICY IF EXISTS "Service role full access payments" ON public.payments;
CREATE POLICY "Service role full access payments" 
ON public.payments 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Politique pour lecture : seul le propriétaire du site peut voir ses paiements
DROP POLICY IF EXISTS "Payments can view own" ON public.payments;
CREATE POLICY "Payments can view own" 
ON public.payments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = payments.site_id 
    AND sites.user_id = auth.uid()::text
  )
);

-- Politique pour insertion : permettre création de paiements
DROP POLICY IF EXISTS "Payments can insert" ON public.payments;
CREATE POLICY "Payments can insert" 
ON public.payments 
FOR INSERT 
WITH CHECK (true);

-- Politique pour mise à jour : seul le propriétaire peut modifier ses paiements
DROP POLICY IF EXISTS "Payments can update own" ON public.payments;
CREATE POLICY "Payments can update own" 
ON public.payments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.sites 
    WHERE sites.id = payments.site_id 
    AND sites.user_id = auth.uid()::text
  )
);

-- ============================================================
-- 5. TABLE TICKETS
-- ============================================================
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Politique pour service role : accès complet pour le backend
DROP POLICY IF EXISTS "Service role full access tickets" ON public.tickets;
CREATE POLICY "Service role full access tickets" 
ON public.tickets 
FOR ALL 
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Politique pour lecture : seul le créateur peut voir ses tickets
DROP POLICY IF EXISTS "Tickets can view own" ON public.tickets;
CREATE POLICY "Tickets can view own" 
ON public.tickets 
FOR SELECT 
USING (auth.uid()::text = user_id);

-- Politique pour insertion : permettre création de tickets
DROP POLICY IF EXISTS "Tickets can insert" ON public.tickets;
CREATE POLICY "Tickets can insert" 
ON public.tickets 
FOR INSERT 
WITH CHECK (auth.uid()::text = user_id);

-- Politique pour mise à jour : seul le créateur peut modifier ses tickets
DROP POLICY IF EXISTS "Tickets can update own" ON public.tickets;
CREATE POLICY "Tickets can update own" 
ON public.tickets 
FOR UPDATE 
USING (auth.uid()::text = user_id);

-- Politique pour suppression : seul le créateur peut supprimer ses tickets
DROP POLICY IF EXISTS "Tickets can delete own" ON public.tickets;
CREATE POLICY "Tickets can delete own" 
ON public.tickets 
FOR DELETE 
USING (auth.uid()::text = user_id);

-- ============================================================
-- 6. VÉRIFICATION
-- ============================================================
-- Vérifier que RLS est activé sur toutes les tables
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Vérifier les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
