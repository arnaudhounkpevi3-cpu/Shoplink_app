# À Lire D'abord

ShopLink est actuellement un MVP avancé avec :

- pages publiques responsive ;
- inscription, connexion et réinitialisation par email via Resend ;
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

1. `forgot-password.html` vers email Resend, puis `reset-password.html`.
2. `login.html` avec le nouveau mot de passe.
3. `premium.html` jusqu'au résumé.
4. `payment.html` pour payer l'acompte.
5. `admin/admin-dashboard.html` pour vérifier commande, statut et décompte.
6. `dashboard-client-shoplink.html` sur mobile.

## Configuration Email

Le backend utilise Resend si `RESEND_API_KEY` est présent dans `backend/.env`.

En local, Resend peut limiter les envois à l'adresse propriétaire du compte tant qu'aucun domaine n'est vérifié.

Variables utiles :

```env
FRONTEND_URL=http://10.158.8.156:5173
RESEND_API_KEY=re_xxx
RESEND_FROM="ShopLink" <onboarding@resend.dev>
```

En production, utiliser un domaine vérifié :

```env
RESEND_FROM="ShopLink" <support@ton-domaine.com>
```
