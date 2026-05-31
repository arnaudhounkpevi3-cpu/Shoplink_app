# Actions Immédiates

## 1. Lancer Les Serveurs

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

## 2. Tester Les Pages Clés

- `http://10.158.8.156:5173/homepage-shoplink.html`
- `http://10.158.8.156:5173/register.html`
- `http://10.158.8.156:5173/login.html`
- `http://10.158.8.156:5173/forgot-password.html`
- `http://10.158.8.156:5173/premium.html`
- `http://10.158.8.156:5173/payment.html`
- `http://10.158.8.156:5173/dashboard-client-shoplink.html`
- `http://10.158.8.156:5173/admin/admin-dashboard.html`

## 3. Tester Le Flux Mot De Passe

1. Aller sur `forgot-password.html`.
2. Saisir l'email d'un compte existant.
3. Ouvrir le mail Resend.
4. Cliquer sur le lien.
5. Définir un nouveau mot de passe.
6. Vérifier la redirection vers `login.html`.
7. Se connecter avec le nouveau mot de passe.

## 4. Tester Le Flux Premium

1. Aller sur `premium.html`.
2. Remplir toutes les étapes.
3. Ajouter produits, photos et logo.
4. Vérifier le résumé complet.
5. Cliquer sur `Payer l'acompte`.
6. Vérifier que la commande apparaît dans l'admin.
7. Effectuer le paiement.
8. Vérifier que le statut passe en cours et que le décompte démarre.

## 5. Points À Surveiller

- Resend en mode test n'envoie qu'à l'email propriétaire du compte.
- `backend/.env` ne doit jamais être envoyé sur GitHub.
- Les anciennes pages admin racine ont été supprimées : utiliser `frontend/public/admin/admin-dashboard.html`.
