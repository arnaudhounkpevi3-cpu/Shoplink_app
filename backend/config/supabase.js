const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL || 'https://mokaqzyolbkfnhwerpze.supabase.co'
// Use service_role key to bypass RLS for backend operations
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2FxenlvbGJrZm5od2VycHplIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcyMDMxNywiZXhwIjoyMDkyMjk2MzE3fQ.1SQw20IiDd6r-SJNzKMcDrx9K5fwqfgAdHwznSdyl7c'

const supabase = createClient(supabaseUrl, supabaseKey)

module.exports = supabase
