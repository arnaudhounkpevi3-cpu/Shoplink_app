-- SHOPLINK — Commandes publiques des boutiques
-- À exécuter dans Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE,
  site_order_number INT,
  site_id TEXT REFERENCES public.sites(id) ON DELETE CASCADE,
  site_slug TEXT,
  site_name TEXT,
  seller_user_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
  buyer_name TEXT NOT NULL,
  buyer_phone TEXT NOT NULL,
  buyer_address TEXT DEFAULT '',
  buyer_note TEXT DEFAULT '',
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'FCFA',
  source TEXT DEFAULT 'direct',
  status TEXT DEFAULT 'pending_payment',
  payment_status TEXT DEFAULT 'pending',
  payment_method TEXT,
  payer_name TEXT,
  payer_phone TEXT,
  transaction_reference TEXT,
  payment_submitted_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  cancellation_source TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES public.products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT DEFAULT '',
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_site_created
ON public.orders(site_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_seller_created
ON public.orders(seller_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order
ON public.order_items(order_id);

ALTER TABLE IF EXISTS public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access orders" ON public.orders;
CREATE POLICY "Service role full access orders"
ON public.orders
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access order_items" ON public.order_items;
CREATE POLICY "Service role full access order_items"
ON public.order_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
