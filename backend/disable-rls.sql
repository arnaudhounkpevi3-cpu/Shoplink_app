-- ============================================================
-- SCRIPT POUR DÉSACTIVER RLS TEMPORAIREMENT (TEST)
-- ============================================================
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- Désactiver RLS sur toutes les tables
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets DISABLE ROW LEVEL SECURITY;

-- Vérification
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
