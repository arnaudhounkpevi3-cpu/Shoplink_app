# Audit de Sécurité — ShopLink

**Date:** 2026-06-11
**Statut:** Compromission confirmée (JWT volé) — Correctifs appliqués

---

## Résumé des Vulnérabilités Critiques

| # | Vulnérabilité | Sévérité | Statut |
|---|--------------|----------|--------|
| 1 | CORS ouvert en production | Critique | Corrigé |
| 2 | Clés API Supabase codées en dur | Critique | Corrigé |
| 3 | JWT_SECRET faible par défaut | Critique | Corrigé (blacklist + cookies) |
| 4 | Mot de passe admin en dur | Critique | À corriger manuellement |
| 5 | Routes sensibles sans auth | Élevée | Partiellement corrigé |
| 6 | Absence de rate limiting | Élevée | Corrigé |
| 7 | Absence de validation des entrées | Élevée | Partiellement corrigé |
| 8 | Absence de headers de sécurité | Moyenne | Corrigé |
| 9 | JWT stocké dans localStorage (volé via XSS) | Critique | Corrigé (cookies HttpOnly) |
| 10 | Fichier .env avec secrets exposés | Critique | À vérifier manuellement |

---

## Actions Immédiates Requises

### 1. Changer le JWT_SECRET (URGENT)

Le secret JWT par défaut est `change-me`. Tout attaquant peut forger des tokens.

**Action:** Générez un secret fort et mettez-le dans `backend/.env` :

```bash
# Générer un secret fort (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Puis dans `backend/.env` :
```
JWT_SECRET=<votre_secret_généré_ici>
```

### 2. Changer le mot de passe administrateur (URGENT)

Le mot de passe admin par défaut est `/Shoplink@2007`.

**Action:** Définissez un mot de passe fort dans `backend/.env` :
```
ADMIN_PASSWORD=MotDePasseTresFort123!@#$
ADMIN_EMAIL=votre-email-admin@domaine.com
```

### 3. Vérifier le fichier backend/.env

Le fichier `backend/.env` existe et contient probablement les valeurs par défaut faibles.

**Action:** Ouvrez `backend/.env` et remplacez :
- `JWT_SECRET=change-me` → par un secret fort généré
- `ADMIN_PASSWORD=/Shoplink@2007` → par un mot de passe fort
- `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` → par vos vraies valeurs Supabase

### 4. Configurer CORS_ORIGINS en production

**Action:** Dans `backend/.env`, ajoutez vos domaines autorisés :
```
CORS_ORIGINS=https://votre-domaine.vercel.app,https://votre-domaine.com
```

### 5. Déployer les correctifs de code

```bash
cd backend
npm install
npm install express-rate-limit helmet
```

Puis redémarrez le serveur.

---

## Correctifs Appliqués dans le Code

### backend/index.js
- ✅ CORS restreint en production (rejet des origines inconnues)
- ✅ Ajout de `helmet` pour les headers de sécurité (CSP, X-Frame-Options, etc.)
- ✅ Ajout de `express-rate-limit` sur :
  - `/api/auth/*` — 10 requêtes/15min
  - `/api/tracking` — 30 événements/min
  - `/api` général — 100 requêtes/15min
- ✅ Middleware de validation des entrées (détection XSS/SQL injection basique)

### backend/routes/tracking.js
- ✅ Validation des types pour tous les champs de tracking
- ✅ Protection contre les injections dans les événements

### backend/routes/payments.js
- ✅ Validation du montant sur `/premium-order`
- ✅ Validation du statut sur `/callback` (whitelist des statuts autorisés)

### backend/routes/auth.js
- ✅ Cookies HttpOnly + SameSite + Secure pour les JWT
- ✅ Endpoint `/logout` avec blacklist du token
- ✅ Endpoint `/check` pour vérifier l'authentification via cookie
- ✅ Suppression du token du corps de réponse JSON

### backend/middleware/auth.js
- ✅ Lecture du JWT depuis le cookie HttpOnly en priorité
- ✅ Vérification de la blacklist avant chaque authentification

### backend/data/tokenBlacklist.js
- ✅ Système de blacklist de tokens en mémoire
- ✅ Nettoyage automatique des entrées expirées

### backend/config/supabase.js
- ✅ Suppression des clés Supabase codées en dur
- ✅ Vérification que les variables d'environnement sont présentes

### backend/.env.example
- ✅ Suppression des clés exposées
- ✅ Ajout d'avertissements de sécurité

### frontend/public/js/auth.js
- ✅ Nouveau module d'authentification sécurisé
- ✅ Utilisation de `credentials: 'include'` pour les cookies
- ✅ Plus de stockage de token dans localStorage
- ✅ Nettoyage automatique de la session locale en cas de 401

### package.json / backend/package.json
- ✅ Ajout des dépendances `helmet`, `express-rate-limit`, `cookie-parser`

---

## Recommandations Supplémentaires

### Court terme
1. **Auditer les logs** — Vérifiez les logs du serveur pour détecter des accès suspects
2. **Changer tous les mots de passe** — Admin, base de données, SMTP, etc.
3. **Vérifier les utilisateurs** — Assurez-vous qu'aucun utilisateur admin non autorisé n'a été créé
4. **Sauvegarder la base de données** — Faites un backup avant toute modification

### Moyen terme
1. **Implémenter une authentification à deux facteurs (2FA)** pour l'admin
2. **Ajouter un système de logs de sécurité** (tentatives de connexion échouées, accès admin)
3. **Implémenter une vérification CSRF** sur les formulaires sensibles
4. **Ajouter un WAF** (Cloudflare, etc.) en frontal
5. **Configurer HTTPS obligatoire** (HSTS header)

### Long terme
1. **Migration vers Supabase Auth** pour une gestion plus sécurisée des utilisateurs
2. **Implémenter RBAC complet** (rôles et permissions granulaires)
3. **Ajouter des tests de sécurité automatisés** (OWASP ZAP, etc.)
4. **Mettre en place un monitoring d'intégrité** des fichiers

---

## Vérification Post-Correction

Après avoir appliqué les correctifs, vérifiez :

```bash
# 1. Vérifier que les dépendances sont installées
cd backend && npm ls helmet express-rate-limit cookie-parser

# 2. Tester le CORS
curl -H "Origin: https://evil.com" https://votre-api.com/api/health

# 3. Tester le rate limiting
for i in {1..15}; do curl -X POST https://votre-api.com/api/auth/login -H "Content-Type: application/json" -d '{}'; done

# 4. Vérifier les headers de sécurité
curl -I https://votre-api.com/api/health
# Doit contenir: X-Frame-Options, X-Content-Type-Options, Content-Security-Policy

# 5. Vérifier que les cookies sont bien HttpOnly (navigateur DevTools > Application > Cookies)
# Le cookie shoplink_token doit avoir: HttpOnly ✓, Secure ✓ (en prod), SameSite=Strict ✓

# 6. Vérifier que le token n'est plus dans localStorage
# Ouvrez la console du navigateur et tapez: localStorage.getItem('shoplink_token')
# Doit retourner null
```

---

## Contact

En cas de doute sur une modification, consultez un expert en sécurité avant de déployer en production.
