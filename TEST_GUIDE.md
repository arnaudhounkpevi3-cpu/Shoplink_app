# 🧪 GUIDE DE TEST - À TESTER MAINTENANT!

## ⚡ DÉMARRAGE RAPIDE (5 MIN)

### 1️⃣ Lancer le backend
```bash
cd backend
npm install  # Si pas déjà fait
npm start
```
**Attendez:** `Backend pret sur http://localhost:5000`

### 2️⃣ Lancer le frontend (nouvel onglet terminal)
```bash
cd frontend
npm install  # Si pas déjà fait
npm run dev
```
**Attendez:** Voir l'URL (http://localhost:5173 ou autre)

---

## 🧪 TEST COMPLET DU FLUX (15 MIN)

### ✅ TEST 1: Page d'accueil
```
1. Aller à: http://localhost:5173
2. Voir: Hero section "Crée ton site de vente"
3. Voir: Tarifs, exemples, présentation
4. Cliquer: "Créer mon site" ou "Confier mon projet"
   → Scroll vers tableau de bord
```

### ✅ TEST 2: Authentification
```
ONGLET: Tableau de bord client

Se connecter:
Email:    clienttest@example.com
Mot passe: 12345678

Attendre:
✓ Affichage du nom "Client Test"
✓ Role: user
```

### ✅ TEST 3: Voir le site test
```
Après connexion, voir:
- "Boutique Test" (site actif)
- Status: PUBLIE (vert) ou BROUILLON (rouge)
- Slug: "boutique-test"
- 2 produits: Sac + Chaussure

Cliquer: "Rafraichir"
→ Doit recharger les données
```

### ✅ TEST 4: NOUVEAU - Bouton "Payer et publier"
```
Dans "Paiement autonome" (bas du dashboard):

SI SITE EN BROUILLON:
  - Voir: "Bouton: 💳 Payer et publier"
  - Cliquer: Ouvre modale
  
SI SITE PUBLIÉ:
  - Voir: ✅ Status "Votre site est en ligne!"
  - Pas de bouton (site déjà payé)
```

### ✅ TEST 5: MODALE DE PAIEMENT
```
Après cliquer "Payer et publier":

1. Modale s'ouvre
2. Affiche:
   - Site: "Boutique Test"
   - Type: "Creation autonome (4 000 FCFA)"
   
3. Champ téléphone:
   - Entrer: +22997000000 (ou n'importe quel numéro en test)
   
4. Cliquer: "Payer maintenant"
   
RÉSULTAT ATTENDU:
   ✅ "Paiement effectué avec succès!"
   ✅ Status du site → "Publié"
   ✅ Bouton disparaît (site déjà en ligne)
```

### ✅ TEST 6: PAGE PUBLIQUE - NOUVEAU!
```
API Call direct:
GET http://localhost:5000/api/public/boutique-test

Résultat en JSON:
{
  "success": true,
  "site": {...},
  "products": [...]
}

OU via le HTML beautifulé:
http://localhost:5000/api/public/boutique-test
+ frontend/public/site-public.html

Voir:
✓ Logo boutique
✓ Nom + description
✓ Boutons WhatsApp + Appeler
✓ Grille produits responsive
✓ Chaque produit avec "Commande" via WhatsApp
```

### ✅ TEST 7: Commande WhatsApp
```
Sur la page publique:

1. Cliquer "Commande" sur un produit
   → Ouvre WhatsApp avec message pré-rempli:
      "Bonjour je veux commander [Nom Produit]"
      
   OU
   
2. Cliquer "💬 WhatsApp" en haut
   → Ouvre WhatsApp avec message général

IMPORTANT: Vous devez avoir WhatsApp installé
(ou il ouvre le web version)
```

### ✅ TEST 8: Admin - Voir les paiements
```
ONGLET: Admin (bouton "Admin" en haut)

1. Voir: "Tableau de bord admin"
2. Aller à: Tab "Paiements"
3. Voir:
   - État récent du paiement autonome
   - Status: "payé" ou "en attente"
   - Montant: 4000
   - Type: autonome
   
4. Voir aussi:
   - Nombre de sites publiés
   - Nombre clients payants
```

---

## 🐛 CHECKLIST DE VÉRIFICATION

Après chaque test, cocher:

### Backend
- [ ] `npm start` affiche "Backend pret sur http://localhost:5000"
- [ ] GET http://localhost:5000/ retourne {"project": "SHOP LINK API", ...}
- [ ] GET http://localhost:5000/api/health retourne status: true

### Frontend
- [ ] `npm run dev` démarre sans erreur
- [ ] Page accueil charge correctement
- [ ] Connexion clienttest@example.com fonctionne
- [ ] Dashboard affiche les produits

### Paiement - NOUVEAU
- [ ] Bouton "Payer et publier" appraît au démarrage
- [ ] Cliquer le bouton ouvre modale lisse
- [ ] Modale affiche les infos correctes
- [ ] Bouton "Payer maintenant" appelle l'API
- [ ] Après paiement: message "✅ Succès"
- [ ] Status site → "Publié"
- [ ] Bouton disparaît

### Page Publique - NOUVEAU
- [ ] GET /api/public/boutique-test retourne JSON valide
- [ ] site-public.html affiche HTML formaté
- [ ] Responsive: essayer sur mobile (F12)
- [ ] Bouton WhatsApp cliquable
- [ ] Boutons Commande ouvrent WhatsApp

### Admin
- [ ] Voir paiement autonome listée
- [ ] Status affiche "payé"

---

## 🆘 TROUBLESHOOTING

### ❌ Erreur: "Cannot GET /"
**Solution:** Backend pas lancé. Faire `npm start` dans /backend

### ❌ Frontend ne charge pas
**Solution:** Vérifier port (5173, 5174, etc.)
```bash
npm run dev -- --port 5173
```

### ❌ Bouton "Payer" n'apparaît pas
**Vérifier:**
- Connecté avec clienttest@example.com?
- Site en brouillon (pas publié)?
- Console: F12 → Onglet Console → Erreurs?

### ❌ Modale ne s'ouvre pas
```javascript
// Dans console: taper
document.querySelectorAll('.payment-modal')
// Si vide: CSS pas chargé. Rafraichir page.
```

### ❌ Erreur "API": Type error: Cannot read property 'phone'
**Solution:** Le formulaire a un Bug. Regarder:
- Champ input existe?
- État `paymentForm` initialisé?

### ❌ Page publique retourne 404
**Vérifier:**
- Slug exact: "boutique-test" (case-sensitive)
- Site est "published" (status)?
- Backend tourne?

---

## 📊 DONNÉES DE TEST PERMANENTES

Dans `backend/data/state.json` (sauvegardé):

```json
{
  "users": [
    {
      "id": "user-1",
      "name": "Administrateur",
      "email": "admin@myonlinestore.local",
      "role": "admin",
      "password": "admin12345"
    },
    {
      "id": "user-2",
      "name": "Client Test",
      "email": "clienttest@example.com",
      "role": "user",
      "password": "12345678"  ← CELLE-CI POUR TESTS
    }
  ],
  
  "sites": [
    {
      "id": "site-1",
      "userId": "user-2",
      "name": "Boutique Test",
      "slug": "boutique-test",
      "status": "published"  ← Après paiement test
    }
  ],
  
  "products": [
    { "name": "Sac a main", "price": 15000, ... },
    { "name": "Chaussure femme", "price": 22000, ... }
  ],
  
  "payments": [
    {
      "id": "payment-1",
      "userId": "user-2",
      "type": "autonome",
      "amount": 4000,
      "status": "paid",  ← Exemple de paiement réussi
      "reference": "PAY-SEED-AUTO"
    }
  ]
}
```

---

## 📝 NOTES IMPORTANTES

1. **Les paiements SIMULÉS restent sauvegardés** dans state.json
2. **Rafraichir la page** ne reset pas les données (sauvegarde persistante)
3. **Pour RESET complet:** Supprimer `/backend/data/state.json` et redémarrer
4. **En PRODUCTION:** Remplacer simulation par API Moov.bj réelle

---

## 🎬 CAS DE TEST AVANCÉ

### Test: Client crée site + paie
```bash
# 1. Dashboard ouvert, connecté
# 2. Sites → Ajouter produits
# 3. Configurers: Nom, Slug, WhatsApp, Couleurs
# 4. Sauvegarder
# 5. Bouton "Payer" → Modale
# 6. Téléphone + Payer
# 7. SUCCESS → Page publique active
```

### Test: Admin voit les stats
```bash
# 1. Tab "Admin"
# 2. Vue: Summary
#    - Sites publiés
#    - Paiements reçus
#    - Clients
# 3. Tab "Paiements"
#    - Lister tous paiements
#    - Status, montant, type
```

### Test: Responsive (Mobile)
```bash
# F12 (Dev Tools)
# Taper: Ctrl+Shift+M (Device Emulation)
# Tester sur iPhone/Android
# Vérifier:
# - Modale responsive ✓
# - Page publique adapte ✓
# - Boutons cliquables ✓
```

---

## 📈 MÉTRIQUES À OBSERVER

Après les tests, vous devriez voir:
- ✅ 0 erreurs console
- ✅ Tous les boutons fonctionnels
- ✅ Données persistantes après refresh
- ✅ Mobile responsive
- ✅ Page publique accessible

---

## ✅ VALIDATION FINALE

Si tout fonctionne → **PRÊT POUR PRODUCTION**:
- [ ] Tous les tests ✅
- [ ] Pas d'erreurs console
- [ ] Performance acceptable
- [ ] Données sauvegardées
- [ ] API répond vite (<500ms)

**Sinon** → Consulter troubleshooting ci-dessus

---

## 🎉 FÉLICITATIONS!

Vous avez implémenté:
✅ Système de paiement Mobile Money  
✅ Page publique magnifique  
✅ Modale de paiement  
✅ Automatisation publication  
✅ Interface admin complète

**NEXT:** Intégrer API Moov.bj réelle (voir MOBILE_MONEY_INTEGRATION.md)
