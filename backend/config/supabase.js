const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('SUPABASE_URL et SUPABASE_SERVICE_KEY sont requis dans les variables d\'environnement')
}

// Use service_role key to bypass RLS for backend operations
const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase
