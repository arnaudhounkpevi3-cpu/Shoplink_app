# 🎬 FLUX COMPLET - VISUALISATION

## 🏗️ ARCHITECTURE GLOBALE

```
┌─────────────────────────────────────────────────────────────────┐
│                      FRONTEND (React)                            │
│  http://localhost:5173                                           │
│                                                                   │
│  ✓ Dashboard Client                                              │
│  ✓ Modale de Paiement                                            │
│  ✓ Affichage site + produits                                     │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ API Calls
              │ (fetch)
              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js/Express)                      │
│  http://localhost:5000                                           │
│                                                                   │
│  Routes:                                                          │
│  • POST /api/auth/register, login                                │
│  • POST /api/sites/create                                        │
│  • POST /api/products                                            │
│  • POST /api/payments/initiate       ← État Paiement (EN)        │
│  • POST /api/payments/mobile-money/pay  ← Mobile Money (NEW)     │
│  • POST /api/payments/callback          ← Confirmation (NEW)     │
│  • GET  /api/public/:slug            ← Page Publique (NEW)       │
│                                                                   │
│  Data: JSON (state.json)                                         │
└─────────────┬───────────────────────────────────────────────────┘
              │
              │ Appelle
              │
              ↓
┌─────────────────────────────────────────────────────────────────┐
│           API MOBILE MONEY (Moov.bj/Orange/MTN)                  │
│                                                                   │
│  1. POST /payment/request (Frontend → Backend → Moov)            │
│  2. Redirection vers page paiement                              │
│  3. POST /callback (Moov → Backend) ✅ Confirme paiement         │
│  4. Backend publie site automatiquement                          │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 CAS 1 : PAIEMENT AUTONOME (4000 FCFA)

```mermaid
timeline
    title Flux Autonome - Client crée + paie son site
    
    Client se connecte : 
    : ✓ Authentification
    
    Client configure site :
    : Nom, slug, WhatsApp
    : Produits
    
    Client clique "Payer" :
    : ✓ Modale de paiement
    
    Backend crée payment :
    : POST /api/payments/initiate
    : status: pending
    
    Client entre téléphone :
    : +22997000000
    
    Appel Mobile Money :
    : POST /api/payments/mobile-money/pay
    : Simulation OU API Réelle
    
    Paiement réussi :
    : Backend: payment.status = 'paid'
    : Backend: site.status = 'published'
    
    Affichage page publique :
    : ✅ Site actif
    : ✅ Lien: /api/public/boutique-test
```

---

## 📊 CAS 2 : PAIEMENT PREMIUM (Acompte 5000 FCFA)

```
JOUR 0 - Client remplit formulaire premium
  ├─ ID client
  ├─ Détails boutique
  ├─ Produits/images
  ├─ Type de site souhaité
  └─ Délai (normal 21j / urgent 14j)
  
JOUR 0 - Paiement acompte (50%)
  ├─ Montant: 5000 FCFA
  ├─ Status: PAID
  ├─ Décompte lance
  └─ Admin reçoit notification
  
JOUR 1-21 - Admin crée site
  ├─ Design + intégration
  ├─ Produits formatés
  ├─ Optimisation SEO
  └─ Tests
  
JOUR 21 - Site livré
  ├─ Client reçoit lien
  ├─ Demande solde (50%)
  └─ Site en ligne après paiement final
```

---

## 🔄 FLUX DÉTAILLÉ : ÉTAPES TECHNIQUES

### **ÉTAPE 1: Initier le paiement**
```
Frontend                    Backend                 state.json
   │                          │                         │
   ├─ POST /payments/initiate │                         │
   │──────────────────────────>                         │
   │                          │ Créer objet            │
   │                          │ payment                │
   │                          ├─────────────────────>  │
   │                          │ Sauvegarder          │<─┤
   │                          │ (état: pending)        │
   │                          │                        │
   │            Réponse       │                        │
   │<─ {payment.id} ──────────┤                        │
   │                          │                        │
```

### **ÉTAPE 2: Appeler Mobile Money**
```
Frontend              Backend              Moov.bj API
   │                     │                      │
   │ POST mobile-money/pay│                      │
   ├────────────────────>│                      │
   │                     │                      │
   │                     │ Préparer payload    │
   │                     │ (amount, ref, etc)  │
   │                     │                      │
   │                     │ POST /payment/req..│
   │                     ├─────────────────────>│
   │                     │                      │
   │                     │ Valide + crée txn  │
   │                     │<─{"redirectUrl"}────┤
   │                     │                      │
   │ Réponse redirectUrl │                      │
   │<─────────────────────┤                      │
   │                      │                      │
   ├─ window.open(redirectUrl)                 │
   │          │                                │
   │          └─> Utilisateur paie en ligne   │
   │                      │                      │
   │                   (Confirmation)            │
   │                      │                      │
```

### **ÉTAPE 3: Callback de confirmation**
```
Moov.bj              Backend              state.json
   │                    │                     │
   ├ POST /callback     │                     │
   │ (status: paid)     │                     │
   │──────────────────>│                      │
   │                    │ Vérifier signature│
   │                    │ (sécurité!)        │
   │                    │                     │
   │                    │ payment.status     │
   │                    │ = 'paid'           │
   │                    ├───────────────────>│
   │                    │                     │
   │                    │ site.status        │
   │                    │ = 'published'      │
   │                    ├───────────────────>│
   │                    │                     │
   │ OK 200             │                     │
   │<──────────────────┤                      │
   │                    │                     │
```

---

## 📱 INTERFACE MODALE PAIEMENT

```
┌─────────────────────────────────────────┐
│  ✕ Paiement - Finaliser le paiement    │
├─────────────────────────────────────────┤
│                                         │
│  Site: Boutique Test                    │
│  Type: Creation autonome (4 000 FCFA)   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │ Numéro de téléphone               │   │
│  │ +229XXXXXXXX                      │   │
│  │                                   │   │
│  │ Orange Money ou MTN Mobile Money  │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────┐    ┌──────────────────┐  │
│  │ Annuler  │    │ Payer maintenant │  │
│  └──────────┘    └──────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

---

## 🌐 PAGE PUBLIQUE - AFFICHAGE

```
http://localhost:5000/api/public/boutique-test
│
└─> Frontend reçoit JSON:
    {
      site: {
        name: "Boutique Test",
        slug: "boutique-test",
        logo: "https://...",
        description: "...",
        whatsapp: "+229...",
        primaryColor: "#d9643a",
        secondaryColor: "#176b5b"
      },
      products: [
        { name: "Sac", price: 15000, image: "...", whatsappLink: "..." },
        { name: "Chaussure", price: 22000, ...}
      ]
    }
│
└─> frontend/public/site-public.html affiche:
    
    ┌─────────────────────────────────────┐
    │         🏪 Boutique Test            │
    │    Boutique de demonstration        │
    │                                     │
    │   [💬 WhatsApp] [📞 Appeler]       │
    ├─────────────────────────────────────┤
    │          NOS PRODUITS               │
    ├─────────────────────────────────────┤
    │                                     │
    │  +---------+  +---------+           │
    │  | Sac     |  |Chaussure│           │
    │  | 15K XOF |  | 22K XOF │           │
    │  |[Commnd] |  |[Commnd] │           │
    │  +---------+  +---------+           │
    │                                     │
    └─────────────────────────────────────┘
```

---

## 🗂️ STRUCTURE FICHIERS

```
PROJECT/
│
├── backend/
│   ├── index.js                 [✓ Déjà config]
│   ├── routes/
│   │   ├── auth.js              [✓ Déjà fait]
│   │   ├── sites.js             [✓ Déjà fait]
│   │   ├── products.js          [✓ Déjà fait]
│   │   ├── payments.js          [🆕 MODIFIÉ]
│   │   │                           - Config Mobile Money
│   │   │                           - Route initiate (✓)
│   │   │                           - Route mobile-money/pay (🆕)
│   │   │                           - Route callback (🆕)
│   │   ├── public.js            [✓ Déjà fait]
│   │   └── admin.js             [✓ Déjà fait]
│   └── data/
│       └── state.json           [✓ Stocke payments]
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx              [🆕 MODIFIÉ]
│   │   │                           - États paiement
│   │   │                           - Modale paiement
│   │   │                           - Fonctions paiement
│   │   └── App.css              [🆕 MODIFIÉ]
│   │                               - Styles modale
│   │
│   └── public/
│       └── site-public.html     [🆕 CRÉÉ]
│                                  - Affiche sites publics
│                                  - Responsive design
│                                  - Commande WhatsApp
│
├── GUIDE_PAIEMENT_COMPLET.md       [🆕 CRÉÉ]
├── MOBILE_MONEY_INTEGRATION.md     [🆕 CRÉÉ]
└── FLUX_COMPLET_VISUALISATION.md   [VOUS ÊTES ICI]
```

---

## ✅ STATUTS DE PAIEMENT

```
pending         → Paiement en attente
  ↓
failed          → Paiement échoué
  ↓
paid            → Paiement réussi
  ↓
Site publié     → Si autonome
  ↓
Site accessible → /api/public/slug
```

---

## 🎯 RÉSUMÉ FINAL

| Aspect | Ancien (Avant) | Nouveau (Après) |
|--------|:---:|:---:|
| **Paiement** | Juste route initiate | ✅ Mobile Money intégré |
| **Callback** | Manuel | ✅ Automatique |
| **Publication** | Manuelle | ✅ Après paiement |
| **Page Publique** | Aucune | ✅ HTML responsive |
| **Client Experience** | Incomplète | ✅ Flux complet |

---

## 🚀 PRÊT À TESTER!

1. **Backend:** `cd backend && npm start`
2. **Frontend:** `cd frontend && npm run dev`
3. **Connexion:** clienttest@example.com / 12345678
4. **Paiement:** Cliquer "💳 Payer et publier"
5. **Vérification:** `/api/public/boutique-test`

🎉 **C'EST LIVE!**
