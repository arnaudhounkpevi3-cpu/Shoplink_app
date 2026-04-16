# 🧪 IDENTIFIANTS & GUIDE DE TEST COMPLET

## 📱 Numéro Admin Unique (Tous les Paiements)
```
Numéro:          +229 01 67 16 34 81
Provider:        MTN Mobile Money OU MOOV Money (les deux vont au même numéro)
SMS Validation:  3 secondes (simulation)
```

---

## 👤 Client de Test #1

**Scénario**: Paiement Autonome 4 000 FCFA (MTN)

```
Nom:             Jean Dupont
Email:           jean.dupont@test.com
Téléphone:       +229 01 23 45 67 89  (ou simplement: 01 23 45 67 89)
Montant:         4 000 FCFA
Provider:        MTN Mobile Money ✓
Transaction Ref: 241201ABC123XYZ
```

**URL**: http://localhost:5173/payment.html

**Étapes**:
1. Remplir le nom: "Jean Dupont"
2. Remplir l'email: "jean.dupont@test.com"
3. Remplir le téléphone: "01 23 45 67 89"
4. Sélectionner "MTN Mobile Money" (déjà sélectionné par défaut ✓)
5. Entrer la référence: "241201ABC123XYZ"
6. Cliquer "✅ Confirmer mon paiement — 4 000 FCFA"

**Résultats attendus**:
- ⏳ Attendre 3 secondes
- ✅ Message: "Paiement validé avec succès!"
- 🎉 Site créé automatiquement
- 📊 Redirection vers dashboard client
- 💰 Admin voit +1 paiement (4 000 FCFA)

---

## 👤 Client de Test #2

**Scénario**: Paiement Autonome 10 000 FCFA (MOOV)

```
Nom:             Marie Kévin
Email:           marie.kevin@example.com
Téléphone:       +229 02 98 76 54 32  (ou: 02 98 76 54 32)
Montant:         10 000 FCFA
Provider:        MOOV Money ✓
Transaction Ref: 241202DEF456QWE
```

**URL**: http://localhost:5173/payment.html?amount=10000

**Étapes**:
1. Le montant 10 000 FCFA s'affiche déjà (paramètre URL)
2. Remplir le nom: "Marie Kévin"
3. Remplir l'email: "marie.kevin@example.com"
4. Remplir le téléphone: "02 98 76 54 32"
5. Sélectionner "MOOV Money" (cliquer sur le bouton bleu)
6. Entrer la référence: "241202DEF456QWE"
7. Cliquer "✅ Confirmer mon paiement — 10 000 FCFA"

**Résultats attendus**:
- ⏳ Attendre 3 secondes
- ✅ "Paiement validé avec succès!"
- 🎉 Site créé (slug: "marie-kevin")
- 💰 Admin voit +1 paiement (10 000 FCFA)
- 📊 Montant total: 4 000 + 10 000 = 14 000 FCFA

---

## 👤 Client de Test #3

**Scénario**: Premium Acompte 7 500 FCFA (MTN)

```
Nom:             Jacques Adélaïde
Email:           jacques.adelaide@commerce.bj
Téléphone:       +229 97 54 32 10 98  (ou: 97 54 32 10 98)
Montant:         7 500 FCFA
Provider:        MTN Mobile Money ✓
Transaction Ref: 241203GHI789RST
```

**URL**: http://localhost:5173/payment.html?amount=7500&type=premium

**Étapes**:
1. Remplir le nom: "Jacques Adélaïde"
2. Remplir l'email: "jacques.adelaide@commerce.bj"
3. Remplir le téléphone: "97 54 32 10 98"
4. Sélectionner "MTN Mobile Money"
5. Entrer la référence: "241203GHI789RST"
6. Cliquer "✅ Confirmer mon paiement — 7 500 FCFA"

**Résultats attendus**:
- ✅ Paiement validé
- 📊 Admin montant total: 4 000 + 10 000 + 7 500 = 21 500 FCFA

---

## 📊 Dashboard Admin - Vérifications

**URL**: http://localhost:5173/admin.html

### Après les 3 tests ci-dessus, vous devriez voir:

**Stats Principales**:
```
💳 Paiements Validés:      3
👥 Clients Créés:          3
📊 Montant Total:          21 500 FCFA
```

**Tableau "Paiements Validés"**:
```
| Client           | Type      | Montant  | Provider      | Date        |
|------------------|-----------|----------|---------------|-------------|
| Jean Dupont      | Autonome  | 4000 F   | MTN MoMo      | 2026-04-03  |
| Marie Kévin      | Autonome  | 10000 F  | Moov Money    | 2026-04-03  |
| Jacques Adélaïde | Premium   | 7500 F   | MTN MoMo      | 2026-04-03  |
```

**Tableau "Clients Créés"**:
```
| Nom              | Email                    | Site Créé      | Status |
|------------------|--------------------------|----------------|--------|
| Jean Dupont      | jean.dupont@test.com     | jean-dupont    | ✓      |
| Marie Kévin      | marie.kevin@example.com  | marie-kevin    | ✓      |
| Jacques Adélaïde | jacques.adelaide@...     | jacques-adelaide | ✓    |
```

**Résumé Financier**:
```
├─ Total Encaissé:    21 500 FCFA
├─ Autonome:          14 000 FCFA (2 clients)
└─ Premium:            7 500 FCFA (1 client)
```

---

## 🔄 Actualisation Admin

- **Automatique**: Toutes les 5 secondes
- **Manuelle**: Cliquer les boutons "🔄 Actualiser" dans chaque section
- **Vérification**: F12 → Console pour voir les appels API

---

## 💾 Données Stockées

Après les 3 tests, le fichier `/backend/data/state.json` contiendra:

```json
{
  "payments": [
    {
      "id": "pay-xxx",
      "clientName": "Jean Dupont",
      "amount": 4000,
      "status": "paid",
      "mobileMoneyProvider": "mtn",
      "validatedAt": "2026-04-03T10:30:03Z"
    },
    {
      "id": "pay-yyy",
      "clientName": "Marie Kévin",
      "amount": 10000,
      "status": "paid",
      "mobileMoneyProvider": "moov",
      "validatedAt": "2026-04-03T10:31:03Z"
    },
    {
      "id": "pay-zzz",
      "clientName": "Jacques Adélaïde",
      "amount": 7500,
      "status": "paid",
      "mobileMoneyProvider": "mtn",
      "validatedAt": "2026-04-03T10:32:03Z"
    }
  ],
  "clients": [
    {
      "clientName": "Jean Dupont",
      "email": "jean.dupont@test.com",
      "siteSlug": "jean-dupont",
      "amount": 4000
    },
    {
      "clientName": "Marie Kévin",
      "email": "marie.kevin@example.com",
      "siteSlug": "marie-kevin",
      "amount": 10000
    },
    {
      "clientName": "Jacques Adélaïde",
      "email": "jacques.adelaide@commerce.bj",
      "siteSlug": "jacques-adelaide",
      "amount": 7500
    }
  ]
}
```

---

## ✅ Checklist de Vérification

Après chaque paiement, vérifiez:

- [ ] Le formulaire accepte les données
- [ ] Pas d'erreur dans la console (F12)
- [ ] L'API `/api/payments/initiate` répond (code 200)
- [ ] Après 3 secondes, l'API `/api/payments/validate` répond
- [ ] Le dashboard admin se met à jour dans 5 secondes max
- [ ] Le montant s'ajoute correctement
- [ ] Le client peut être créé avec le même email (test intégrité)

---

## 🐛 Dépannage Rapide

**Erreur "Cannot POST /api/payments/initiate"**
- ❌ Le backend n'est pas sur le port 5000
- ✅ Solution: `cd backend && npm start` dans un terminal

**L'admin ne montre rien**
- ❌ Les paiements ne sont pas créés
- ✅ Solution: Faire au moins un paiement d'abord

**Les téléphones ne s'acceptent pas**
- Format accepté: `01 23 45 67 89` ou `+229 01 23 45 67 89`
- Le formulaire formatte automatiquement
- Minimum 10 chiffres obligatoires

**Le paiement persiste au reload page?**
- ✅ NORMAL! Les données sont dans `/backend/data/state.json`
- Elles restent même si vous relancez les serveurs

---

## 📞 Support

Si vous avez des questions sur:
- **Paiements**: Vérifier la requête POST dans F12 → Network
- **Admin**: Vérifier les appels GET dans F12 → Network  
- **Données**: Vérifier `/backend/data/state.json`
- **Logs**: Consulter le terminal du backend pour les événements

