const express = require('express')

const { requireAuth } = require('../middleware/auth')

const router = express.Router()

function parseEmailFrom(value = '') {
  const match = String(value).match(/^\s*"?([^"<]+)"?\s*<([^>]+)>\s*$/)
  if (match) {
    return {
      name: match[1].trim(),
      email: match[2].trim(),
    }
  }

  return {
    name: 'ShopLink',
    email: String(value || 'supportshoplink@gmail.com').trim(),
  }
}

function getFrontendBaseUrl(req) {
  return (
    process.env.APP_URL ||
    process.env.FRONTEND_URL ||
    req.headers.origin ||
    `${req.protocol}://${req.hostname}:5173`
  ).replace(/\/$/, '')
}

function welcomeEmailHtml({ name, dashboardUrl }) {
  const firstName = String(name || 'cher utilisateur').split(' ')[0]

  return `<!DOCTYPE html>
<html lang="fr">
  <body style="margin:0;padding:0;background-color:#f5f0e8;font-family:Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table width="600" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 18px 60px rgba(17,17,17,0.10);border:1px solid rgba(17,17,17,0.08);">
            <tr>
              <td style="background:linear-gradient(135deg,#1a5c38,#0f6e56);padding:38px 28px;text-align:center;">
                <img src="https://cdn-icons-png.flaticon.com/512/17250/17250072.png" width="72" height="72" alt="Bienvenue" style="display:block;margin:0 auto 16px;object-fit:contain;">
                <h1 style="color:#ffffff;margin:0;font-size:28px;letter-spacing:-0.03em;">Bienvenue sur ShopLink</h1>
                <p style="color:rgba(255,255,255,0.78);margin:10px 0 0;font-size:15px;line-height:1.5;">Digitalise ta boutique et commence à vendre plus simplement.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:34px 30px;">
                <p style="font-size:16px;color:#1a1a1a;line-height:1.65;margin:0 0 16px;">Bonjour <strong>${firstName}</strong>,</p>
                <p style="font-size:16px;color:#333333;line-height:1.65;margin:0 0 16px;">Ton compte ShopLink a été créé avec succès. Tu peux maintenant configurer ta boutique, ajouter tes produits et partager ton lien public avec tes clients.</p>
                <p style="font-size:15px;color:#5f6f67;line-height:1.65;margin:0 0 24px;">Depuis ton tableau de bord, tu peux gérer ton catalogue, suivre les vues, préparer ton site public et recevoir des commandes via WhatsApp.</p>
                <div style="text-align:center;margin:30px 0;">
                  <a href="${dashboardUrl}" style="display:inline-block;background:#1a5c38;color:#ffffff;text-decoration:none;padding:14px 30px;border-radius:999px;font-size:15px;font-weight:700;box-shadow:0 12px 28px rgba(26,92,56,0.22);">Voir mon tableau de bord</a>
                </div>
                <div style="background:#eef7f1;border:1px solid rgba(26,92,56,0.12);border-radius:14px;padding:16px 18px;margin-top:22px;">
                  <p style="margin:0;color:#0f6e56;font-size:14px;line-height:1.55;"><strong>Prochaine étape :</strong> ajoute tes premiers produits, vérifie l’aperçu de ton site, puis partage ton lien ShopLink.</p>
                </div>
                <p style="font-size:13px;color:#999999;line-height:1.6;margin:24px 0 0;">Si tu n’es pas à l’origine de cette inscription, ignore simplement cet email.</p>
              </td>
            </tr>
            <tr>
              <td style="background:#faf8f3;padding:20px;text-align:center;border-top:1px solid #eeeeee;">
                <p style="font-size:12px;color:#9a7d5a;margin:0;">© 2026 ShopLink · Digitalise ta boutique</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

router.post('/send-welcome-email', requireAuth, async (req, res) => {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: 'BREVO_API_KEY manquant dans la configuration serveur',
    })
  }

  const from = parseEmailFrom(process.env.EMAIL_FROM || '"ShopLink" <supportshoplink@gmail.com>')
  const replyTo = parseEmailFrom(process.env.EMAIL_REPLY_TO || 'supportshoplink@gmail.com')
  const name = req.body.name || req.user.name || 'Utilisateur ShopLink'
  const dashboardUrl = `${getFrontendBaseUrl(req)}/dashboard-client-shoplink.html`

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': apiKey,
      },
      body: JSON.stringify({
        sender: from,
        to: [{ email: req.user.email, name }],
        replyTo,
        subject: 'Bienvenue sur ShopLink',
        htmlContent: welcomeEmailHtml({ name, dashboardUrl }),
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        message: payload.message || 'Impossible d’envoyer l’email de bienvenue',
      })
    }

    return res.status(200).json({
      success: true,
      message: 'Email de bienvenue envoyé',
      messageId: payload.messageId,
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    })
  }
})

module.exports = router
