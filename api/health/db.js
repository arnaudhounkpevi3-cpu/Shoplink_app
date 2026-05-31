async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({
      success: false,
      message: 'Method not allowed',
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  if (!supabaseUrl || !serviceKey) {
    return res.status(500).json({
      success: false,
      message: 'Variables SUPABASE_URL / SUPABASE_SERVICE_KEY manquantes sur Vercel',
      database: 'supabase',
      time: new Date().toISOString(),
    })
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/rest/v1/users?select=id&limit=1`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return res.status(500).json({
        success: false,
        message: 'Supabase inaccessible',
        database: 'supabase',
        status: response.status,
        error: text.slice(0, 500),
        time: new Date().toISOString(),
      })
    }

    const rows = await response.json()
    return res.status(200).json({
      success: true,
      message: 'Base de données accessible',
      database: 'supabase',
      sampleRows: Array.isArray(rows) ? rows.length : 0,
      time: new Date().toISOString(),
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Erreur pendant le ping Supabase',
      database: 'supabase',
      error: error.message,
      time: new Date().toISOString(),
    })
  }
}

module.exports = handler
