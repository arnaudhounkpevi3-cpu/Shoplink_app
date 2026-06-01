-- SHOPLINK — Autoriser l'activité commerce dans public.sites
-- À exécuter dans Supabase SQL Editor.
-- Cette migration garde les anciennes valeurs et ajoute "commerce" à la contrainte.

ALTER TABLE IF EXISTS public.sites
  DROP CONSTRAINT IF EXISTS sites_activity_type_check;

ALTER TABLE IF EXISTS public.sites
  ADD CONSTRAINT sites_activity_type_check
  CHECK (activity_type IN ('restaurant', 'boutique', 'fast-food', 'cosmetique', 'commerce', 'autre'));

-- Optionnel : si des anciens sites Commerce ont été enregistrés comme "autre",
-- il faut les corriger manuellement selon leur vrai contexte. Exemple :
-- UPDATE public.sites SET activity_type = 'commerce' WHERE id = 'site-id';
