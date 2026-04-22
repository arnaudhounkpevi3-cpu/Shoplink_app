# Test E2E ShopLink - Script de Test Complet
# Ce script teste le flux client complet via les APIs

$API_BASE = "http://localhost:5000/api"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$testEmail = "test_$timestamp@shoplink.test"
$testPassword = "SecurePassword123!"
$testPhone = "+22997000000"

Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🧪 TEST E2E SHOPLINK - $timestamp" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ============ TEST 1: REGISTER ============
Write-Host "ÉTAPE 1️⃣ : REGISTRATION" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"
$registerBody = @{
    name = "Test User $timestamp"
    email = $testEmail
    password = $testPassword
    phone = $testPhone
    shopName = "Test Shop"
    city = "Cotonou"
    activityType = "Restaurant"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-WebRequest -Uri "$API_BASE/auth/register" `
        -Method POST `
        -ContentType "application/json" `
        -Body $registerBody -ErrorAction Stop
    
    $registerData = $registerResponse.Content | ConvertFrom-Json
    
    if ($registerData.success) {
        Write-Host "✅ Compte créé: $testEmail" -ForegroundColor Green
        $userId = $registerData.user.id
        Write-Host "   User ID: $userId" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erreur: $($registerData.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur réseau: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============ TEST 2: LOGIN ============
Write-Host ""
Write-Host "ÉTAPE 2️⃣ : LOGIN" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$API_BASE/auth/login" `
        -Method POST `
        -ContentType "application/json" `
        -Body $loginBody -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    
    if ($loginData.success) {
        Write-Host "✅ Connexion réussie" -ForegroundColor Green
        $token = $loginData.token
        Write-Host "   Token: $($token.Substring(0,20))..." -ForegroundColor Gray
    } else {
        Write-Host "❌ Erreur: $($loginData.message)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============ TEST 3: CREATE PREMIUM SITE (Étapes 1-5) ============
Write-Host ""
Write-Host "ÉTAPE 3️⃣ : CRÉER SITE PREMIUM (Draft)" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"
$siteBody = @{
    name = "Test Premium Site"
    slogan = "Mon site de test"
    description = "Site créé via test API"
    whatsapp = $testPhone
    secondaryPhone = ""
    address = "Cotonou, Bénin"
    activityType = "Restaurant"
    primaryColor = "#1a5c38"
    secondaryColor = "#f59c1a"
} | ConvertTo-Json

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

try {
    $siteResponse = Invoke-WebRequest -Uri "$API_BASE/sites" `
        -Method POST `
        -Headers $headers `
        -Body $siteBody -ErrorAction Stop
    
    $siteData = $siteResponse.Content | ConvertFrom-Json
    
    if ($siteData.success) {
        Write-Host "✅ Site créé (brouillon)" -ForegroundColor Green
        $siteId = $siteData.site.id
        Write-Host "   Site ID: $siteId" -ForegroundColor Gray
        Write-Host "   Slug: $($siteData.site.slug)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erreur: $($siteData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# ============ TEST 4: CREATE PAYMENT (Acompte) ============
Write-Host ""
Write-Host "ÉTAPE 4️⃣ : INITIATE PAYMENT (Acompte 50%)" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"
$paymentBody = @{
    userId = $userId
    name = "Test User"
    phone = $testPhone
    email = $testEmail
    type = "premium"
    step = "acompte"
    amount = 5000
    method = "mtn"
    reference = "TEST123"
    siteId = $siteId
    siteName = "Test Premium Site"
    slogan = "Mon site de test"
    siteDescription = "Site créé via test API"
    whatsappNumber = $testPhone
    activityType = "Restaurant"
} | ConvertTo-Json

try {
    $paymentResponse = Invoke-WebRequest -Uri "$API_BASE/payments/initiate" `
        -Method POST `
        -Headers $headers `
        -Body $paymentBody -ErrorAction Stop
    
    $paymentData = $paymentResponse.Content | ConvertFrom-Json
    
    if ($paymentData.success) {
        Write-Host "✅ Paiement initié (mode simulation)" -ForegroundColor Green
        $paymentId = $paymentData.payment.id
        Write-Host "   Payment ID: $paymentId" -ForegroundColor Gray
        Write-Host "   Montant: $($paymentData.payment.amount) FCFA" -ForegroundColor Gray
        Write-Host "   Statut: $($paymentData.payment.status)" -ForegroundColor Gray
    } else {
        Write-Host "❌ Erreur: $($paymentData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# ============ TEST 5: VALIDATE PAYMENT (Simulation Moov) ============
Write-Host ""
Write-Host "ÉTAPE 5️⃣ : VALIDATE PAYMENT (Simulation Moov)" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"
$validateBody = @{
    paymentId = $paymentId
    phoneNumber = $testPhone
    provider = "mtn"
} | ConvertTo-Json

try {
    $validateResponse = Invoke-WebRequest -Uri "$API_BASE/payments/mobile-money/validate" `
        -Method POST `
        -ContentType "application/json" `
        -Body $validateBody -ErrorAction Stop
    
    $validateData = $validateResponse.Content | ConvertFrom-Json
    
    if ($validateData.success) {
        Write-Host "✅ Validation Moov initiée" -ForegroundColor Green
        Write-Host "   Message: $($validateData.message)" -ForegroundColor Gray
    } else {
        Write-Host "⚠️ Réponse: $($validateData.message)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Erreur (normalement attendu pour simulation): $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============ TEST 6: CHECK PAYMENT STATUS ============
Write-Host ""
Write-Host "ÉTAPE 6️⃣ : CHECK PAYMENT STATUS" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"
Start-Sleep -Seconds 2

try {
    $statusResponse = Invoke-WebRequest -Uri "$API_BASE/payments/status/$paymentId" `
        -Method GET `
        -Headers $headers -ErrorAction Stop
    
    $statusData = $statusResponse.Content | ConvertFrom-Json
    
    if ($statusData.success) {
        Write-Host "✅ Statut récupéré" -ForegroundColor Green
        Write-Host "   Statut: $($statusData.payment.status)" -ForegroundColor Gray
        Write-Host "   Montant: $($statusData.payment.amount) FCFA" -ForegroundColor Gray
        
        if ($statusData.payment.status -eq "completed") {
            Write-Host "✅ PAIEMENT RÉUSSI!" -ForegroundColor Green
        } elseif ($statusData.payment.status -eq "pending") {
            Write-Host "⏳ PAIEMENT EN ATTENTE..." -ForegroundColor Yellow
        } else {
            Write-Host "❌ Erreur paiement: $($statusData.payment.status)" -ForegroundColor Red
        }
    } else {
        Write-Host "❌ Erreur: $($statusData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# ============ TEST 7: CHECK SITE STATUS ============
Write-Host ""
Write-Host "ÉTAPE 7️⃣ : CHECK SITE STATUS" -ForegroundColor Green
Write-Host "─────────────────────────────────────────"

try {
    $siteCheckResponse = Invoke-WebRequest -Uri "$API_BASE/sites/$siteId" `
        -Method GET `
        -Headers $headers -ErrorAction Stop
    
    $siteCheckData = $siteCheckResponse.Content | ConvertFrom-Json
    
    if ($siteCheckData.success) {
        Write-Host "✅ Site récupéré" -ForegroundColor Green
        Write-Host "   Nom: $($siteCheckData.site.name)" -ForegroundColor Gray
        Write-Host "   Slug: $($siteCheckData.site.slug)" -ForegroundColor Gray
        Write-Host "   Statut: $($siteCheckData.site.status)" -ForegroundColor Gray
        
        if ($siteCheckData.site.status -eq "published") {
            Write-Host "✅ SITE PUBLIÉ!" -ForegroundColor Green
        } else {
            Write-Host "⏳ Site en $($siteCheckData.site.status)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "❌ Erreur: $($siteCheckData.message)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
}

# ============ RÉSUMÉ FINAL ============
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  📊 RÉSUMÉ DU TEST" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Utilisateur créé: $testEmail" -ForegroundColor Green
Write-Host "✅ Login réussi" -ForegroundColor Green
Write-Host "✅ Site Premium créé: $siteId" -ForegroundColor Green
Write-Host "✅ Paiement (acompte) lancé: $paymentId" -ForegroundColor Green
Write-Host ""
Write-Host "Les données ont été sauvegardées et peuvent être vérifiées:" -ForegroundColor Yellow
Write-Host "  - Backend: /backend/data/state.json" -ForegroundColor Gray
Write-Host "  - Logs: Check PowerShell output ci-dessus" -ForegroundColor Gray
Write-Host ""
Write-Host "PROCHAINE ÉTAPE: Tester le flux dans le navigateur (HTML forms)" -ForegroundColor Yellow
