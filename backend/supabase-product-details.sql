-- SHOPLINK — Champs avancés des produits
-- À exécuter dans Supabase SQL Editor si ces colonnes n'existent pas encore.

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS availability TEXT DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS stock TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS badge TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS old_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS variant_info TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS extra_info TEXT DEFAULT '';

COMMENT ON COLUMN public.products.stock IS 'Stock renseigné depuis le dashboard client';
COMMENT ON COLUMN public.products.availability IS 'Disponibilité renseignée depuis le dashboard client';
COMMENT ON COLUMN public.products.badge IS 'Badge marketing: nouveau, populaire, promo, recommandé';
COMMENT ON COLUMN public.products.old_price IS 'Ancien prix barré affiché sur le site public';
COMMENT ON COLUMN public.products.variant_info IS 'Variantes ou détails courts du produit';
COMMENT ON COLUMN public.products.extra_info IS 'Information complémentaire libre';
