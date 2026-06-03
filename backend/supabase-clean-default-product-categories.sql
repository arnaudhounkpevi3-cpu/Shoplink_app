-- SHOPLINK — Nettoyer les anciennes catégories par défaut
-- À exécuter dans Supabase SQL Editor.
-- Objectif : si un produit avait été enregistré automatiquement avec
-- "General" ou "Général" alors que l'utilisateur n'avait rien renseigné,
-- la catégorie redevient vide et ne s'affiche plus sur le site public.

UPDATE public.products
SET category = ''
WHERE lower(coalesce(category, '')) IN ('general', 'général');

ALTER TABLE IF EXISTS public.products
  ALTER COLUMN category SET DEFAULT '';

SELECT category, count(*)
FROM public.products
GROUP BY category
ORDER BY category;
