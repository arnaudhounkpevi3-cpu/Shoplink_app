const nodemailer = require('nodemailer')

let transporter = null

function initEmailService() {
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true',
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS,
    },
  }

  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.log('⚠️  Service email SMTP non configuré')
    transporter = null
    return
  }

  transporter = nodemailer.createTransport(emailConfig)
  console.log('✅ Service email SMTP configuré')
}

function getSenderEmail() {
  return process.env.EMAIL_FROM || '"ShopLink" <supportshoplink@gmail.com>'
}

function buildPasswordResetEmailHtml(resetLink) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation du mot de passe</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background: #fff; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); border: 1px solid #eef0ea; }
        .header { text-align: center; margin-bottom: 28px; }
        .logo { display: inline-block; font-size: 24px; font-weight: 800; color: #1a5c38; padding: 8px 14px; border-radius: 999px; background: #eef7f1; }
        .button { display: inline-block; background: #1a5c38; color: #fff !important; text-decoration: none; padding: 13px 28px; border-radius: 999px; font-weight: bold; margin: 18px 0; }
        .footer { text-align: center; font-size: 12px; color: #666; margin-top: 28px; padding-top: 18px; border-top: 1px solid #eee; }
        .warning { background: #fff6e0; border: 1px solid #f2c166; border-radius: 8px; padding: 12px; margin: 18px 0; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><div class="logo">ShopLink</div></div>
        <h2>Réinitialisation de votre mot de passe</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ShopLink.</p>
        <p>Cliquez sur le bouton ci-dessous pour définir votre nouveau mot de passe :</p>
        <div style="text-align:center;"><a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a></div>
        <p>Ou copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; color: #1a5c38; font-size: 14px;">${resetLink}</p>
        <div class="warning"><strong>Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</div>
        <div class="footer">
          <p>Ce message a été envoyé automatiquement par ShopLink.</p>
          <p>Digitalise ta boutique</p>
        </div>
      </div>
    </body>
    </html>
  `
}

async function sendPasswordResetEmail(email, resetLink) {
  if (!transporter) initEmailService()

  if (!transporter) {
    return {
      success: false,
      error: 'Service email SMTP non configuré. Configurez EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS et EMAIL_FROM.',
    }
  }

  try {
    const info = await transporter.sendMail({
      from: getSenderEmail(),
      replyTo: process.env.EMAIL_REPLY_TO || 'supportshoplink@gmail.com',
      to: email,
      subject: 'Réinitialisation de votre mot de passe ShopLink',
      html: buildPasswordResetEmailHtml(resetLink),
    })

    console.log('✅ Email de réinitialisation envoyé via SMTP :', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email SMTP :', error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  initEmailService,
  sendPasswordResetEmail,
}
