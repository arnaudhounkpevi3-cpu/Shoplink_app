-- ============================================================
-- SCRIPT POUR CRÉER UTILISATEUR TEST DANS SUPABASE
-- ============================================================
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- Insérer utilisateur test
INSERT INTO public.users (id, name, email, phone, role, password, is_active, created_at)
VALUES (
  'test-user-001',
  'Test User',
  'test@shoplink.bj',
  '+2290167163481',
  'user',
  '$2b$10$LPMaJyJJ1N93KHPjDJKdEeOCsKPhWLypPXOS1fBQIaQMVRTgRWQNO',
  true,
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Vérifier l'utilisateur
SELECT * FROM public.users WHERE email = 'test@shoplink.bj';
