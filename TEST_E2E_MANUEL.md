# 🎯 MANUEL DE TEST E2E - À FAIRE DANS LE NAVIGATEUR

## ⚡ QUICK START (10-15 min)

Ouvre le navigateur et suis ces étapes:

---

## ÉTAPE 1️⃣ : ALLER AU PORTAIL
```
URL: http://localhost:5000/index.html
Vérifier: 
  ✅ Page se charge
  ✅ Cards visibles: Client, Admin, Public, Info
  ✅ Emojis affichés correctement
```

---

## ÉTAPE 2️⃣ : CRÉER UN COMPTE (Register)
```
1. Sur le portail, cliquer "Créer mon site" (vert)
   OU aller: http://localhost:5000/register.html

2. Remplir le formulaire:
   - Nom: "Jean Dupont"
   - Email: "jean@test.com"
   - Password: "SecurePass123!"
   - Activité: "Restaurant"
   - Téléphone: "+229 97 00 00 00"

3. Cliquer "S'inscrire"

VÉRIFIER:
  ✅ Pas d'erreur affichée
  ✅ Redirect automatique vers login?
  ✅ Ou affichage message "Compte créé"?
  📝 NOTE: Qu'est-ce qui se passe après?
```

---

## ÉTAPE 3️⃣ : LOGIN
```
1. Si redirect automatique: login page devrait être pré-remplie?
   Sinon: http://localhost:5000/login.html

2. Saisir:
   - Email: jean@test.com
   - Password: SecurePass123!

3. Cliquer "Connexion"

VÉRIFIER:
  ✅ Dashboard client s'affiche?
  ✅ Nom "Jean Dupont" visible?
  ✅ Navigation tabs OK: 🏠📦🌐📈⚙️
  📝 NOTE: Emojis s'affichent?
```

---

## ÉTAPE 4️⃣ : ACCÉDER AU SERVICE PREMIUM
```
1. Sur dashboard client, chercher lien "Service Premium"
   OU: http://localhost:5000/premium.html

2. Vérifier page:
   - Titre
   - Prix: 10 000 FCFA
   - Payment steps: 💳🚀✅
   - Form stepper

VÉRIFIER:
  ✅ Tous les emojis affichés?
  ✅ Stepper marche (1→2→3→4→5)?
```

---

## ÉTAPE 5️⃣ : REMPLIR LE FORMULAIRE PREMIUM (Étapes 1-5)

### Step 1/5 - Infos Entreprise
```
Remplir:
  Nom entreprise: "Chez Jean Restaurant"
  Responsable: "Jean Dupont"
  WhatsApp: "+229 97 00 00 00"
  Email: "jean@test.com"
  Ville: "Cotonou"
  Quartier: "Cadjehoun"
  
  Activité: Sélectionner 🍽️ Restaurant
  Description: "Bon restaurant rapide avec des bons plats"
  Cible: "Familles, jeunes défunts"

Cliquer: "Continuer → Produits"

VÉRIFIER:
  ✅ Champs remplis sans erreur?
  ✅ Les 6 icônes activité affichées? (🍽️👗💄🍟🛒✨)
  ✅ Bouton "Continuer" active l'étape 2?
```

### Step 2/5 - Produits
```
1. Ajouter Produit 1:
   - Nom: "Riz sauce arachide"
   - Prix: "1500"
   - Catégorie: "Plats"
   - Description: "Riz basmati sauce arachide maison"

2. Cliquer "+ Ajouter un produit"

3. Ajouter Produit 2:
   - Nom: "Jus de gingembre"
   - Prix: "500"
   - Catégorie: "Boissons"
   - Description: "Jus frais"

4. PHOTOS (optionnel):
   - Cliquer sur upload zone
   - Sélectionner quelques images (ou skip)

Cliquer: "Continuer → Design"

VÉRIFIER:
  ✅ Produits ajoutés sans erreur?
  ✅ Bouton "+ Ajouter" fonctionne?
  ✅ Emoji 📷 visible?
```

### Step 3/5 - Design
```
1. Logo (optionnel):
   - Cliquer zone upload (emoji 🖼️)
   - Skip ou upload image

2. Couleurs: "Vert et doré"

3. Style: Sélectionner "Moderne"

4. Exemple site: Skip (laisser vide)

5. Type de site: Sélectionner 📋 Catalogue
   (Options: 📋🍽️🛍️)

6. Sections:
   - ✅ Page d'accueil (checked)
   - ✅ Catalogue produits (checked)
   - ✅ Page contact (checked)
   - ☐ À propos (unchecked)

Cliquer: "Continuer → Fonctions"

VÉRIFIER:
  ✅ Upload zone emoji 🖼️ affichée?
  ✅ Tous les emojis: 🎨🖼️📋🍽️🛍️?
  ✅ Radio buttons/checkboxes fonctionnent?
```

### Step 4/5 - Fonctions
```
1. Toggles (4 total):
   - ✅ Commander via WhatsApp (actif)
   - ☐ Livraison (inactif)
   - ☐ Google Maps (inactif)
   - ☐ Téléphone secondaire (inactif)

2. Délai: Sélectionner "Normal" (3 semaines)

3. Notes: "C'est ça!" (ou laisser vide)

Cliquer: "Voir le résumé →"

VÉRIFIER:
  ✅ Toggles s'active/désactive visuellement?
  ✅ Bouton radio "Normal" vs "Urgent ⚡"?
  ✅ Textarea visible pour notes?
```

### Step 5/5 - Résumé & PAIEMENT
```
Vérifier le RÉSUMÉ affiche:
  - Entreprise: "Chez Jean Restaurant"
  - Activité: "Restaurant"
  - Style: "Moderne"
  - Délai: "Normal · 3 semaines"
  - WhatsApp: "+229 97 00 00 00"
  - Prix total: "10 000 FCFA"
  
  Acompte: "5 000 FCFA"
  Solde: "5 000 FCFA"

📝 IMPORTANT:
  ✅ Toutes les infos du formulaire sont là?
  ✅ Prix correctement calculés?
  ✅ Emoji 💳✅ affichés?

Cocher: "J'accepte les conditions"

Cliquer: "💳 Payer l'acompte → 5 000 FCFA"

VÉRIFIER:
  ✅ Pas d'erreur?
  ✅ Redirect vers payment.html?
```

---

## ÉTAPE 6️⃣ : PAGE PAIEMENT (CRITIQUE!)
```
URL: http://localhost:5000/payment.html

VÉRIFIER ABSOLUMENT:
  ❓ MONTANT CORRECT: "5 000 FCFA" (acompte)?
  ❓ DONNÉES PRÉ-REMPLIES:
     - Nom: "Jean Dupont"?
     - Email: "jean@test.com"?
     - Phone: "+229 97 00 00 00"?
     - Entreprise affichée? ("Chez Jean Restaurant")
  
  📝 IMPORTANT: Les infos de premium.html sont-elles là?
     SI OUI ✅ → Bug #1 RÉSOLU
     SI NON ❌ → Bug #1 CONFIRMÉ (données pas transmises)

Formulaire paiement:
  1. Nom: "Jean Dupont" (pré-rempli?)
  2. Phone: "+229 97 00 00 00" (pré-rempli?)
  3. Email: "jean@test.com" (pré-rempli?)

Méthode paiement:
  - Sélectionner "Moov" (radio button)

Reference SMS:
  - Saisir: "123456" (code test)

Cliquer: "Procéder au paiement"

VÉRIFIER:
  ✅ Pas d'erreur?
  ✅ Page change (loading overlay)?
  ✅ Message réussi affiché?
  ❓ Redirection après paiement?
```

---

## ÉTAPE 7️⃣ : APRÈS PAIEMENT (CRITIQUE!)
```
Attendre 3-5 secondes après cliquer "Procéder"

VÉRIFIER:
  ❓ Message "✅ Paiement réussi" affiché?
  ❓ "Votre site sera prêt dans 3 semaines"?
  ❓ Lien vers dashboard ou site?
  ❓ Email de confirmation reçu? (À CHECK)
  
  📝 IMPORTANT: Où est redirigé le client?
     - Vers un page de succès?
     - Vers le dashboard?
     - Nulle part? ❌ BUG #2
```

---

## 📝 CHECKLIST FINALE - À DOCUMENTER

Pendant le test, noter dans ce format:

```
ÉTAPE 1 - Registration:
  ✅ / ❌ Page charge
  ✅ / ❌ Formulaire valide
  ✅ / ❌ Compte créé
  ✅ / ❌ Redirect login automatique
  ⚠️  Notes: ...

ÉTAPE 2 - Premium Form:
  ✅ / ❌ Step 1 OK
  ✅ / ❌ Step 2 OK
  ✅ / ❌ Step 3 OK
  ✅ / ❌ Step 4 OK
  ✅ / ❌ Step 5 affiche résumé complet
  ⚠️  Notes: ...

ÉTAPE 3 - Payment Page:
  ✅ / ❌ Montant correct (5000 FCFA)
  ✅ / ❌ Données pré-remplies (nom, email, phone)
  ✅ / ❌ INFO ENTREPRISE AFFICHÉE? **CRITICAL**
  ⚠️  Notes: ...

ÉTAPE 4 - Après paiement:
  ✅ / ❌ Message succès
  ✅ / ❌ Redirection
  ✅ / ❌ Données en localStorage
  ⚠️  Notes: ...
```

---

## 🎬 COMMENCE QUAND TU VEUX!

Dis-moi quand tu as fini le test, et redonne-moi:
1. **Tes observations** (✅/❌/⚠️)
2. **Screenshots** (si possible)
3. **Messages d'erreur** exact
4. **Comportements bizarres**

Ensuite je corrigerai les bugs! 🔧
