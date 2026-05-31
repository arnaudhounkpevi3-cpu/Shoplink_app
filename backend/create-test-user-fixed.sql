-- ============================================================
-- SCRIPT POUR CRÉER UTILISATEUR TEST DANS SUPABASE (CORRIGÉ)
-- ============================================================
-- À exécuter dans le SQL Editor de Supabase
-- ============================================================

-- Supprimer l'utilisateur test s'il existe
DELETE FROM public.users WHERE email = 'test@shoplink.bj';

-- Insérer utilisateur test avec hash bcrypt correct pour "test123456"
-- Hash généré avec bcrypt (10 rounds): $2b$10$LPMaJyJJ1N93KHPjDJKdEeOCsKPhWLypPXOS1fBQIaQMVRTgRWQNO
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
);

-- Vérifier l'utilisateur créé
SELECT id, name, email, role, is_active FROM public.users WHERE email = 'test@shoplink.bj';
