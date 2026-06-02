-- SHOPLINK — Tracking officiel des vues et ajouts panier
-- À exécuter dans Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.site_visits (
  id TEXT PRIMARY KEY,
  shop_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  site_id TEXT REFERENCES public.sites(id) ON DELETE CASCADE,
  ip_address TEXT,
  visitor_id TEXT,
  source TEXT DEFAULT 'direct',
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  visit_date DATE DEFAULT CURRENT_DATE,
  week_number INT NOT NULL,
  year INT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.product_events (
  id TEXT PRIMARY KEY,
  shop_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  site_id TEXT REFERENCES public.sites(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'add_to_cart')),
  ip_address TEXT,
  visitor_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  event_date DATE DEFAULT CURRENT_DATE,
  week_number INT NOT NULL,
  year INT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_visits_unique_daily
ON public.site_visits(site_id, visitor_id, visit_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_product_events_unique_daily_view
ON public.product_events(site_id, product_id, visitor_id, event_date)
WHERE event_type = 'view';

CREATE INDEX IF NOT EXISTS idx_site_visits_site_week_year
ON public.site_visits(site_id, year, week_number);

CREATE INDEX IF NOT EXISTS idx_product_events_site_week_year
ON public.product_events(site_id, year, week_number);

CREATE INDEX IF NOT EXISTS idx_product_events_product_type
ON public.product_events(product_id, event_type);

ALTER TABLE IF EXISTS public.site_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.product_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access site_visits" ON public.site_visits;
CREATE POLICY "Service role full access site_visits"
ON public.site_visits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access product_events" ON public.product_events;
CREATE POLICY "Service role full access product_events"
ON public.product_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
