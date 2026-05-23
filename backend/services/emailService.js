const nodemailer = require('nodemailer');

// Configuration du transporteur d'emails
let transporter = null;
let emailProvider = 'smtp'; // 'smtp' ou 'brevo'

function initEmailService() {
  // Vérifier si Brevo est configuré
  if (process.env.BREVO_API_KEY) {
    emailProvider = 'brevo';
    console.log('✅ Service email Brevo configuré');
    return;
  }

  // Sinon, utiliser SMTP standard
  const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true pour 465, false pour les autres ports
    auth: {
      user: process.env.EMAIL_USER || process.env.EMAIL_ADDRESS,
      pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS
    }
  };

  // Si aucune configuration n'est fournie, utiliser le mode test
  if (!emailConfig.auth.user || !emailConfig.auth.pass) {
    console.log('⚠️  Service email non configuré - Mode test activé');
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: {
        user: 'test@ethereal.email',
        pass: 'test'
      }
    });
  } else {
    transporter = nodemailer.createTransport(emailConfig);
    console.log('✅ Service email SMTP configuré avec succès');
  }
}

async function sendPasswordResetEmail(email, resetLink) {
  if (emailProvider === 'brevo') {
    return await sendBrevoEmail(email, resetLink);
  }

  if (!transporter) {
    initEmailService();
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || `"ShopLink" <${process.env.EMAIL_USER || 'noreply@shoplink.bj'}>`,
    to: email,
    subject: 'Réinitialisation de votre mot de passe ShopLink',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Réinitialisation du mot de passe</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .container {
            background: #fff;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #1B3A2D;
          }
          .logo-dot {
            color: #E8A020;
          }
          .content {
            margin-bottom: 30px;
          }
          .button {
            display: inline-block;
            background: #1B3A2D;
            color: #fff;
            text-decoration: none;
            padding: 12px 30px;
            border-radius: 6px;
            font-weight: bold;
            margin: 20px 0;
          }
          .button:hover {
            background: #0f2d20;
          }
          .footer {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffc107;
            border-radius: 4px;
            padding: 10px;
            margin: 20px 0;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">ShopLink<span class="logo-dot">.</span></div>
          </div>
          
          <div class="content">
            <h2>Réinitialisation de votre mot de passe</h2>
            <p>Bonjour,</p>
            <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ShopLink.</p>
            <p>Cliquez sur le bouton ci-dessous pour définir votre nouveau mot de passe :</p>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
            </div>
            
            <p>Ou copiez et collez ce lien dans votre navigateur :</p>
            <p style="word-break: break-all; color: #1B3A2D; font-size: 14px;">${resetLink}</p>
            
            <div class="warning">
              ⚠️ <strong>Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
            </div>
          </div>
          
          <div class="footer">
            <p>Ce message a été envoyé automatiquement par ShopLink.</p>
            <p>Pour toute question, contactez notre support.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email de réinitialisation envoyé :', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email :', error);
    return { success: false, error: error.message };
  }
}

async function sendBrevoEmail(email, resetLink) {
  const SibApiV3Sdk = require('@getbrevo/brevo');
  const defaultClient = SibApiV3Sdk.ApiClient.instance;

  // Configure API key authorization
  const apiKey = defaultClient.authentications['api-key'];
  apiKey.apiKey = process.env.BREVO_API_KEY;

  const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

  const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
  sendSmtpEmail.subject = 'Réinitialisation de votre mot de passe ShopLink';
  sendSmtpEmail.htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation du mot de passe</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .container {
          background: #fff;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          font-size: 24px;
          font-weight: bold;
          color: #1B3A2D;
        }
        .logo-dot {
          color: #E8A020;
        }
        .content {
          margin-bottom: 30px;
        }
        .button {
          display: inline-block;
          background: #1B3A2D;
          color: #fff;
          text-decoration: none;
          padding: 12px 30px;
          border-radius: 6px;
          font-weight: bold;
          margin: 20px 0;
        }
        .button:hover {
          background: #0f2d20;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 4px;
          padding: 10px;
          margin: 20px 0;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">ShopLink<span class="logo-dot">.</span></div>
        </div>
        
        <div class="content">
          <h2>Réinitialisation de votre mot de passe</h2>
          <p>Bonjour,</p>
          <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ShopLink.</p>
          <p>Cliquez sur le bouton ci-dessous pour définir votre nouveau mot de passe :</p>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Réinitialiser mon mot de passe</a>
          </div>
          
          <p>Ou copiez et collez ce lien dans votre navigateur :</p>
          <p style="word-break: break-all; color: #1B3A2D; font-size: 14px;">${resetLink}</p>
          
          <div class="warning">
            ⚠️ <strong>Important :</strong> Ce lien expire dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
          </div>
        </div>
        
        <div class="footer">
          <p>Ce message a été envoyé automatiquement par ShopLink.</p>
          <p>Pour toute question, contactez notre support.</p>
        </div>
      </div>
    </body>
    </html>
  `;
  sendSmtpEmail.sender = { name: 'ShopLink', email: process.env.BREVO_SENDER_EMAIL || 'noreply@shoplink.bj' };
  sendSmtpEmail.to = [{ email: email }];
  sendSmtpEmail.replyTo = { email: process.env.BREVO_REPLY_TO || 'support@shoplink.bj' };

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email de réinitialisation envoyé via Brevo :', data.messageId);
    return { success: true, messageId: data.messageId };
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email via Brevo :', error);
    return { success: false, error: error.message };
  }
}

module.exports = {
  initEmailService,
  sendPasswordResetEmail
};
