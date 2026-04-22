# 🧪 GUIDE DE TEST END-TO-END (E2E)
**ShopLink MVP - Testing Complet**

---

## ✅ CHECKLIST DE TEST

### 1️⃣ ACCÈS & NAVIGATION
- [ ] Accès au portail: `http://localhost:5000/index.html` ✓
- [ ] Tous les liens du portail fonctionnent
  - [ ] → Homepage ShopLink
  - [ ] → Login
  - [ ] → Register
  - [ ] → Dashboard Client
  - [ ] → Dashboard Admin
  - [ ] → Premium form
  - [ ] → Payment
  - [ ] → FAQ
- [ ] Logo cliquable → retour au portail sur chaque page

---

### 2️⃣ AUTHENTIFICATION
**Créer un compte (Register):**
- [ ] Accès page `/register.html`
- [ ] Form fields: nom, email, password, téléphone
- [ ] Validation: email unique, password fort
- [ ] **BUG?** Est-ce que les mots de passe faibles sont rejetés?
- [ ] Après création → redirection vers login automatique?
- [ ] **BUG?** Message de succès clair?

**Login:**
- [ ] Email/password corrects → accès dashboard
- [ ] Email/password incorrects → erreur affichée
- [ ] Token JWT sauvegardé (localStorage: `shoplink_token`)
- [ ] User info sauvegardé (localStorage: `shoplink_user`)
- [ ] **BUG?** Logout fonctionne?

---

### 3️⃣ DASHBOARD CLIENT
- [ ] Affichage du nom de l'utilisateur
- [ ] Navigation tabs: Accueil, Produits, Mon site, Stats, Paramètres
- [ ] Affichage emojis: 🏠 📦 🌐 📈 ⚙️
- [ ] **BUG?** Données persistent après refresh?
- [ ] Lien WhatsApp fonctionnel?

---

### 4️⃣ COMMANDE SERVICE PREMIUM (Étapes 1-5)

**Étape 1 - Infos Entreprise:**
- [ ] Tous les champs se remplissent correctement
- [ ] Validation: champs obligatoires marqués (*) 
- [ ] **BUG?** Messages d'erreur si champs vides?
- [ ] Sélection type activité (6 options avec emojis): 🍽️ 👗 💄 🍟 🛒 ✨
- [ ] Bouton "Continuer → Produits" avance l'étape

**Étape 2 - Produits:**
- [ ] Ajout de produits (nom, prix, catégorie, description)
- [ ] Bouton "+ Ajouter un produit" fonctionne
- [ ] Upload photos produits
- [ ] **BUG?** Images prévisualisées?
- [ ] Suppression produits fonctionne

**Étape 3 - Design:**
- [ ] Upload logo (emoji 🖼️)
- [ ] Sélection couleurs
- [ ] Choix style: Moderne, Simple, Élégant
- [ ] Choix type site: 📋 Catalogue, 🍽️ Menu, 🛍️ Boutique
- [ ] Checkboxes sections: Accueil, Catalogue, Contact, À propos

**Étape 4 - Fonctions:**
- [ ] Toggles actifs/inactifs:
  - [ ] Commander via WhatsApp
  - [ ] Option Livraison
  - [ ] Google Maps
  - [ ] Téléphone secondaire
- [ ] Délai: Normal (3 sem) vs Urgent ⚡ (2 sem)
- [ ] Notes/remarques (textarea)

**Étape 5 - Résumé & Paiement:**
- [ ] Résumé complète affiche toutes les infos
- [ ] Prix total correct
- [ ] Acompte 50% calculé correctement
- [ ] Solde restant correct
- [ ] **BUG?** Checkbox "J'accepte les conditions" obligatoire?
- [ ] Bouton "💳 Payer l'acompte" → redirection payment

---

### 5️⃣ PAYMENT PAGE
- [ ] Page accessible: `http://localhost:5000/payment.html`
- [ ] Affichage "🔒 Paiement sécurisé"
- [ ] Méthodes disponibles: Moov, MTN, Wave
- [ ] **IMPORTANT - BUG?**
  - [ ] Est-ce que les données du formulaire Premium sont passées?
  - [ ] Montant acompte correct affiché?
  - [ ] Numéro WhatsApp client pré-rempli?
- [ ] Saisie numéro téléphone
- [ ] Résumé de la commande visible
- [ ] Bouton "Procéder au paiement"

---

### 6️⃣ SIMULATION PAYMENT (Mode Actuel)
- [ ] **CHECK THIS:** Le mode simulation Moov.bj est actif?
- [ ] Saisir numéro test Moov: `+229 97000000` (ou fourni par Moov pour tests)
- [ ] Simuler confirmation de paiement
- [ ] **BUG?** Message de succès ou d'erreur retourné?
- [ ] **BUG?** Où le client est redirigé après paiement réussi?

---

### 7️⃣ DATA PERSISTENCE
- [ ] Après paiement simulé → données sauvegardées
  - [ ] Commande visible dans dashboard? (S'il y a une section)
  - [ ] Site créé et accessible?
- [ ] Après refresh page → données persistent?
- [ ] **CHECK:** Les données vont où? (JSON state.json ou réelle base?)

---

### 8️⃣ DASHBOARD ADMIN
- [ ] Accès: `/admin-dashboard.html`
- [ ] **BUG?** Admin panel est visible pour qui? (user normal vs admin?)
- [ ] Affichage liste utilisateurs
- [ ] Affichage liste commandes
- [ ] **BUG?** Analytics/stats fonctionnent?

---

### 9️⃣ PAGES STATIQUES
- [ ] FAQ: `/faq.html` - Accordions ouvrent/ferment? ✓
- [ ] Homepage ShopLink: `/homepage-shoplink.html` - CTA "Créer mon site" fonctionne?

---

## 🐛 BUGS CRITIQUES À CHERCHER

| Bug | Impact | Priorité |
|-----|--------|----------|
| Données Premium form pas transmises à Payment page | ❌ Commande incomplète | 🔴 CRITIQUE |
| Pas de redirection après paiement | ❌ Client perdu | 🔴 CRITIQUE |
| Emails non envoyés | ❌ Pas de confirmation | 🟠 HAUTE |
| Données perdues après refresh | ❌ Session perdue | 🟠 HAUTE |
| Admin accessible par user normal | ❌ Faille sécurité | 🟠 HAUTE |
| Emojis non affichés | ⚠️ UX mauvaise | 🟡 MOYENNE |
| Validation champs manquante | ⚠️ Données pourries | 🟡 MOYENNE |

---

## 🎯 COMMENT TESTER

### **Scénario Complet (15-20 min):**
1. Accès http://localhost:5000/index.html
2. Créer compte: `test@example.com` / `Password123!`
3. Login
4. Aller à Premium
5. Remplir formulaire 5 étapes
6. Continuer au paiement
7. Simuler paiement Moov
8. Vérifier redirection/confirmation
9. Vérifier données en localStorage

### **Points de Contrôle:**
```
🟢 Accessible → 🟢 Se créer compte → 🟢 Login → 🟢 Premium form →
🟢 Payment page → 🟢 Paiement OK → 🟢 Redirection → 🟢 Données persistent
```

---

## 📝 RÉSULTATS À DOCUMENTER

Quand tu fais le test, note:
- ✅ Ce qui marche
- ❌ Ce qui ne marche pas
- ⚠️ Les comportements bizarres
- 📊 Les performances (pages rapides/lentes?)
- 🔐 Issues de sécurité

**Format simple:**
```
PAGE: premium.html
✅ Form étapes 1-4 OK
❌ Étape 5: données pas sauvegardées
⚠️ Emojis: 🏢 manquant en Step 1
```

---

## PROCHAINES ÉTAPES
Après testing:
- **B) Email system** - Ajouter nodemailer pour notifications
- **C) Mobile Money réel** - Remplacer simulator par vrai credentials Moov
