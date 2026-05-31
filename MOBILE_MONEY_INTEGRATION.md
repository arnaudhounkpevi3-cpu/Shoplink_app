# 📱 INTÉGRATION MOBILE MONEY RÉELLE - CODE PRÊT À UTILISER

## 🔄 JSON REMPLACER le code SIMULATION par PRODUCTION

### Fichier: `backend/routes/payments.js`

Actuellement le code est en **SIMULATION** (lignes commentées).  
Pour passer en **PRODUCTION**, remplacez cette section :

```javascript
// ❌ ACTUELLEMENT EN SIMULATION (lignes 70-90 environ)
try {
    // 🔄 EN PRODUCTION: Appeler Moov/Orange Money API
    // const response = await fetch(`${MOBILE_MONEY_CONFIG.baseUrl}/payment/request`, {
    // ...

    // ✅ SIMULATION POUR TEST (à remplacer)
    const transactionId = `TXN-${Date.now()}`
    payment.status = 'paid'
    // ...
}
```

**PAR CECI :**

```javascript
router.post('/mobile-money/pay', async (req, res) => {
  const { paymentId, phoneNumber, amount } = req.body

  if (!paymentId || !phoneNumber || !amount) {
    return res.status(400).json({
      success: false,
      message: 'paymentId, phoneNumber et amount sont obligatoires',
    })
  }

  const payment = state.payments.find((entry) => entry.id === paymentId)

  if (!payment) {
    return res.status(404).json({
      success: false,
      message: 'Paiement introuvable',
    })
  }

  try {
    // ✅ MOOV.BJ API - CODE RÉEL
    const moovPayload = {
      amount: {
        currency: 'XOF', // Monnaie Bénin = XOF
        value: payment.amount, // En centimes: 4000 FCFA = 400000 centimes
      },
      description: `ShopLink - ${payment.type === 'autonome' ? 'Création autonome' : 'Service premium'}`,
      reference: payment.reference,
      metadata: {
        paymentId: payment.id,
        siteId: payment.siteId,
        userId: payment.userId,
        type: payment.type,
      },
    }

    // Appel API Moov.bj
    const moovResponse = await fetch(
      `${MOBILE_MONEY_CONFIG.baseUrl}/payment/request`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${MOBILE_MONEY_CONFIG.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(moovPayload),
      }
    )

    if (!moovResponse.ok) {
      const moovError = await moovResponse.json()
      throw new Error(`Moov API Error: ${moovError.message || moovResponse.statusText}`)
    }

    const moovData = await moovResponse.json()

    // Moov retourne un URL de redirection
    if (!moovData.redirectUrl) {
      throw new Error('Pas d\'URL de redirection reçue de Moov')
    }

    // ✅ Mettre à jour le paiement
    payment.status = 'pending_confirmation'
    payment.mobileMoneyTransaction = moovData.transactionId || moovData.id
    payment.mobileMoneyPhone = phoneNumber
    payment.redirectUrl = moovData.redirectUrl
    payment.updatedAt = new Date().toISOString()

    saveState()

    // 📌 Retourner l'URL de redirection au frontend
    return res.json({
      success: true,
      message: 'Redirection vers Mobile Money',
      redirectUrl: moovData.redirectUrl,
      transactionId: moovData.transactionId || moovData.id,
    })
  } catch (error) {
    console.error('Moov Payment Error:', error)
    payment.status = 'failed'
    payment.errorMessage = error.message
    payment.updatedAt = new Date().toISOString()
    saveState()

    return res.status(500).json({
      success: false,
      message: `Erreur lors du paiement Mobile Money: ${error.message}`,
    })
  }
})

// ✅ CALLBACK - Moov appelle cette route pour confirmer le paiement
router.post('/mobile-money/callback', (req, res) => {
  const { transactionId, status, reference } = req.body

  // Vérifier la signature (important pour sécurité!)
  // TODO: Implémenter la vérification de signature Moov

  const payment = state.payments.find(
    (entry) => entry.reference === reference || entry.id === transactionId
  )

  if (!payment) {
    console.warn(`Callback reçu pour paiement inconnu: ${reference}`)
    return res.status(404).json({ success: false, message: 'Paiement introuvable' })
  }

  // Actualiser le statut
  payment.status = status === 'successful' || status === 'SUCCESSFUL' ? 'paid' : 'failed'
  payment.mobileMoneyTransaction = transactionId
  payment.updatedAt = new Date().toISOString()

  // ✅ Si autonome PAYÉ: publier le site
  if (
    payment.type === 'autonome' &&
    payment.siteId &&
    payment.status === 'paid'
  ) {
    const site = state.sites.find((entry) => entry.id === payment.siteId)
    if (site) {
      site.status = 'published'
      site.publishedAt = new Date().toISOString()
    }
  }

  // ✅ Si premium PAYÉ acompte: déclencher décompte de livraison
  if (
    payment.type === 'premium' &&
    payment.step === 'acompte' &&
    payment.status === 'paid'
  ) {
    const durationDays = payment.urgency === 'urgent' ? 14 : 21
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + durationDays)
    payment.deliveryTargetAt = targetDate.toISOString()
  }

  saveState()

  return res.json({
    success: true,
    message: 'Paiement confirmé',
    payment,
  })
})
```

---

## 🔑 VARIABLES D'ENVIRONNEMENT REQUISES

Ajouter à `backend/.env` :

```env
# Général
JWT_SECRET=your-super-secret-key-here
PORT=5000
NODE_ENV=production

# Mobile Money - Moov.bj
MOBILE_MONEY_API_KEY=your-moov-api-key-here
MOBILE_MONEY_BASE_URL=https://api.moov.bj/v1
MOBILE_MONEY_WEBHOOK_SECRET=your-webhook-secret-for-signature
MOBILE_MONEY_ACCOUNT_ID=your-moov-account-id

# Email (pour confirmations)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## 🔗 ENDPOINTS MOOV À CONNAÎTRE

### Créer un paiement
```
POST https://api.moov.bj/v1/payment/request
Headers:
  - Authorization: Bearer {API_KEY}
  - Content-Type: application/json

Body:
{
  "amount": {
    "currency": "XOF",
    "value": 400000  // 4000 FCFA = 400000 centimes
  },
  "description": "ShopLink - Création de site",
  "reference": "PAY-1234567890",
  "metadata": {
    "userId": "user-123",
    "siteId": "site-456"
  }
}

Response:
{
  "id": "txn-abc123",
  "transactionId": "txn-abc123",
  "redirectUrl": "https://payment.moov.bj/txn-abc123",
  "status": "pending"
}
```

### Vérifier le statut d'un paiement
```
GET https://api.moov.bj/v1/payment/{transactionId}
Headers:
  - Authorization: Bearer {API_KEY}

Response:
{
  "id": "txn-abc123",
  "status": "successful",  // ou "failed", "pending"
  "amount": {
    "currency": "XOF",
    "value": 400000
  }
}
```

---

## 📧 OPTIONNEL - EMAIL DE CONFIRMATION

Ajouter cette fonction après un paiement réussi:

```javascript
// backend/utils/email.js
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

async function sendPaymentConfirmation(user, payment, site) {
  const emailHtml = `
    <h2>Paiement reçu - ${site.name}</h2>
    <p>Bonjour ${user.name},</p>
    <p>Votre paiement de <strong>${payment.amount} FCFA</strong> a été confirmé!</p>
    ${
      payment.type === 'autonome'
        ? `<p>Votre site est maintenant en ligne: <a href="${APP_URL}/boutique/${site.slug}">${site.name}</a></p>`
        : `<p>Notre équipe commence la création de votre site. Vous serez contacté sous peu.</p>`
    }
    <p>Merci d'avoir choisi ShopLink!</p>
  `

  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: user.email,
    subject: `Confirmation de paiement - ${site.name}`,
    html: emailHtml,
  })
}

module.exports = { sendPaymentConfirmation }
```

---

## 🧪 TEST MOOV EN DÉVELOPPEMENT

Moov.bj propose un **mode TEST** :

1. Aller sur: https://sandbox.moov.bj (ou selon Moov)
2. Créer un compte test/développeur
3. Récupérer l'API_KEY en mode test
4. Utiliser `https://sandbox-api.moov.bj/v1` au lieu de production
5. Tester les paiements sans véritables transactions

---

## ✅ CHECKLIST INTÉGRATION PRODUCTION

- [ ] Récupérer API_KEY Moov.bj
- [ ] Ajouter variables `.env`
- [ ] Remplacer code simulation par code réel
- [ ] Tester en mode Sandbox
- [ ] Configurer webhook/callback Moov
- [ ] Implémenter signature verification
- [ ] Ajouter emails de confirmation
- [ ] Logger les erreurs (Sentry/LogRocket)
- [ ] Mettre en HTTPS (obligatoire)
- [ ] Passer en production

---

## 🆘 DÉPANNAGE COURANT

**Erreur: "No API Key"**
→ Vérifier `process.env.MOBILE_MONEY_API_KEY` dans `.env`

**Erreur: "Invalid reference"**
→ `reference` doit être UNIQUE pour chaque paiement

**Pas de redirection après paiement**
→ Vérifier que le frontend traite `redirectUrl`

**Callback ne marche pas**
→ Configurer webhook dans dashboard Moov.bj

---

## 📞 CONTACTS SUPPORT

**Moov.bj:** developers@moov.bj  
**Orange Money:** support@orange.bj  
**MTN:** developer@mtn.bj
