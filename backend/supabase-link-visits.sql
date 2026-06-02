-- SHOPLINK — Suivi hebdomadaire du trafic par source
-- À exécuter dans Supabase SQL Editor.
-- Les IDs du projet ShopLink sont en TEXT, donc user_id/site_id sont en TEXT.

CREATE TABLE IF NOT EXISTS public.link_visits (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  site_id TEXT REFERENCES public.sites(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'direct' CHECK (source IN ('whatsapp', 'facebook', 'instagram', 'sms', 'direct')),
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  week_number INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_link_visits_site_week_year
  ON public.link_visits(site_id, year, week_number);

CREATE INDEX IF NOT EXISTS idx_link_visits_user_week_year
  ON public.link_visits(user_id, year, week_number);

CREATE INDEX IF NOT EXISTS idx_link_visits_source
  ON public.link_visits(source);

ALTER TABLE IF EXISTS public.link_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access link_visits" ON public.link_visits;
CREATE POLICY "Service role full access link_visits"
ON public.link_visits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

COMMENT ON TABLE public.link_visits IS 'Visites hebdomadaires des liens publics ShopLink par source de trafic';
