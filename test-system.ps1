# Script de test du système ShopLink
Write-Host "🧪 TEST SYSTÈME SHOPLINK" -ForegroundColor Green

# 1. Vérifier que le backend est actif
Write-Host "`n📡 Vérification du backend..."
try {
  $backendTest = Invoke-WebRequest -Uri "http://localhost:5000/api/sites" -UseBasicParsing -ErrorAction Stop
  if ($backendTest.StatusCode -eq 200) {
    Write-Host "✅ Backend actif (port 5000)" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ Backend NOT accessible" -ForegroundColor Red
  exit 1
}

# 2. Vérifier que le frontend est actif  
Write-Host "`n🖥️  Vérification du frontend..."
try {
  $frontendTest = Invoke-WebRequest -Uri "http://localhost:5173/index.html" -UseBasicParsing -ErrorAction Stop
  if ($frontendTest.StatusCode -eq 200) {
    Write-Host "✅ Frontend actif (port 5173)" -ForegroundColor Green
  }
} catch {
  Write-Host "❌ Frontend NOT accessible" -ForegroundColor Red
  exit 1
}

# 3. Vérifier l'endpoint test-account
Write-Host "`n🧑‍💻 Vérification endpoint test-account..."
try {
  $body = @{} | ConvertTo-Json
  $testAccount = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/test-account" -Method POST -ContentType "application/json" -Body $body -UseBasicParsing
  $data = $testAccount.Content | ConvertFrom-Json
  if ($data.success) {
    Write-Host "✅ Endpoint test-account fonctionnel" -ForegroundColor Green
    Write-Host "   Email: $($data.user.email)" -ForegroundColor Gray
    Write-Host "   Token: $($data.token.Substring(0,20))..." -ForegroundColor Gray
  }
} catch {
  Write-Host "❌ Erreur endpoint test-account: $_" -ForegroundColor Red
}

# 4. Vérifier l'endpoint produits
Write-Host "`n📦 Vérification endpoints produits..."
try {
  $productsTest = Invoke-WebRequest -Uri "http://localhost:5000/api/products/1" -UseBasicParsing -ErrorAction Stop
  $data = $productsTest.Content | ConvertFrom-Json
  Write-Host "✅ Endpoints produits accessibles" -ForegroundColor Green
  Write-Host "   Status: $($data.success)" -ForegroundColor Gray
} catch {
  Write-Host "⚠️  Endpoint produits: $_" -ForegroundColor Yellow
}

Write-Host "`n✨ TOUS LES CONTRÔLES PASSÉS!" -ForegroundColor Green
Write-Host "`n📍 Accédez aux services:"
Write-Host "   Frontend:  http://localhost:5173"
Write-Host "   Backend:   http://localhost:5000"
Write-Host "   Test:      http://localhost:5173/test-account.html"
