# À Lire D'abord

ShopLink est actuellement un MVP avancé avec :

- pages publiques responsive ;
- inscription, connexion et réinitialisation par email via SMTP ;
- dashboard client ;
- parcours Premium avec résumé complet ;
- paiement d'acompte Premium ;
- dashboard admin avec projets Premium, statut paiement, photos et décompte ;
- page paiement autonome/premium ;
- stockage local JSON en développement.

## Démarrage Local

Backend :

```powershell
cd "C:\Users\DELL\Documents\New project\backend"
npm start
```

Frontend :

```powershell
cd "C:\Users\DELL\Documents\New project\frontend"
npm run dev -- --host 0.0.0.0
```

## Liens Principaux

- Frontend : `http://10.158.8.156:5173`
- Backend : `http://10.158.8.156:5000`
- Homepage : `http://10.158.8.156:5173/homepage-shoplink.html`
- Premium : `http://10.158.8.156:5173/premium.html`
- Admin : `http://10.158.8.156:5173/admin/admin-dashboard.html`

## Ordre De Test Recommandé

1. `forgot-password.html` vers email de réinitialisation, puis `reset-password.html`.
2. `login.html` avec le nouveau mot de passe.
3. `premium.html` jusqu'au résumé.
4. `payment.html` pour payer l'acompte.
5. `admin/admin-dashboard.html` pour vérifier commande, statut et décompte.
6. `dashboard-client-shoplink.html` sur mobile.

## Configuration Email

Le backend utilise une configuration SMTP pour envoyer les emails de réinitialisation.

Variables utiles :

```env
FRONTEND_URL=http://10.158.8.156:5173
EMAIL_HOST=smtp-relay.brevo.com
EMAIL_PORT=587
EMAIL_USER=votre_login_smtp_brevo
EMAIL_PASS=votre_cle_smtp_brevo
EMAIL_FROM="ShopLink" <supportshoplink@gmail.com>
```

En production, utiliser une adresse expéditrice vérifiée :

```env
EMAIL_FROM="ShopLink" <support@ton-domaine.com>
```
