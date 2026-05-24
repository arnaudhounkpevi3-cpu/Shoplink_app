-- ============================================================
-- MIGRATION SHOPLINK - Nouvelles fonctionnalités de tracking
-- Copiez-collez ce script dans :
-- Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Ajouter les nouvelles colonnes à la table tracking
ALTER TABLE tracking 
ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS visitor_id TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT,
ADD COLUMN IF NOT EXISTS time_spent INTEGER;

-- Mettre à jour le CHECK constraint pour les nouveaux types
ALTER TABLE tracking 
DROP CONSTRAINT IF EXISTS tracking_type_check;
ALTER TABLE tracking 
ADD CONSTRAINT tracking_type_check 
CHECK (type IN ('visit','whatsapp_click','product_view','link_share','time_spent'));

-- Créer les index pour les performances
CREATE INDEX IF NOT EXISTS idx_tracking_visitor ON tracking(visitor_id);
CREATE INDEX IF NOT EXISTS idx_tracking_session ON tracking(session_id);
CREATE INDEX IF NOT EXISTS idx_tracking_type ON tracking(type);
CREATE INDEX IF NOT EXISTS idx_tracking_created ON tracking(created_at);

-- Vérification : afficher les colonnes de la table tracking
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'tracking' 
ORDER BY ordinal_position;
