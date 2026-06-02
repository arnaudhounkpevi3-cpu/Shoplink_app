-- SHOPLINK — Normaliser les couleurs des sites existants selon leur activité
-- À exécuter dans Supabase SQL Editor après avoir autorisé l'activité "commerce".

-- Restaurant / alimentaire
UPDATE public.sites
SET primary_color = '#9a3f13'
WHERE activity_type = 'restaurant'
  AND (primary_color IS NULL OR primary_color IN ('#d9643a', '#1a6b4a', '#1a5c38', '#667eea', '#176b5b', '#764ba2'));

-- Fast-food
UPDATE public.sites
SET primary_color = '#d9480f'
WHERE activity_type = 'fast-food'
  AND (primary_color IS NULL OR primary_color IN ('#d9643a', '#1a6b4a', '#1a5c38', '#667eea', '#176b5b', '#764ba2'));

-- Boutique / mode
UPDATE public.sites
SET primary_color = '#1f4f8f'
WHERE activity_type = 'boutique'
  AND (primary_color IS NULL OR primary_color IN ('#d9643a', '#1a6b4a', '#1a5c38', '#667eea', '#176b5b', '#764ba2'));

-- Beauté / cosmétique
UPDATE public.sites
SET primary_color = '#8b3a62'
WHERE activity_type = 'cosmetique'
  AND (primary_color IS NULL OR primary_color IN ('#d9643a', '#1a6b4a', '#1a5c38', '#667eea', '#176b5b', '#764ba2'));

-- Commerce
UPDATE public.sites
SET primary_color = '#176b5b'
WHERE activity_type = 'commerce'
  AND (primary_color IS NULL OR primary_color IN ('#d9643a', '#1a6b4a', '#1a5c38', '#667eea', '#764ba2'));

-- Autre
UPDATE public.sites
SET primary_color = '#4c2f88'
WHERE activity_type = 'autre'
  AND (primary_color IS NULL OR primary_color IN ('#d9643a', '#1a6b4a', '#1a5c38', '#667eea', '#176b5b', '#764ba2'));

-- Vérification rapide
SELECT activity_type, primary_color, count(*)
FROM public.sites
GROUP BY activity_type, primary_color
ORDER BY activity_type, primary_color;
