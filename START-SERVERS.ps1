$env:PORT = "5000"
Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue | ForEach-Object { taskkill /F /PID $_.OwningProcess 2>$null }
Start-Sleep -Milliseconds 600

Start-Process -FilePath "node" -ArgumentList "index.js" -WindowStyle Normal -PassThru -WorkingDirectory "C:\Users\DELL\Documents\New project\backend" | Select-Object Id,ProcessName | Format-Table -AutoSize
Start-Sleep -Seconds 2

Start-Process -FilePath "npx" -ArgumentList "vite --host" -WindowStyle Normal -PassThru -WorkingDirectory "C:\Users\DELL\Documents\New project\frontend" | Select-Object Id,ProcessName | Format-Table -AutoSize
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "=== SERVERS LAUNCHED ===" -ForegroundColor Green
$b = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$f = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
if (-not $f) { $f = Get-NetTCPConnection -LocalPort 5174 -ErrorAction SilentlyContinue }
if ($b) { Write-Host "Backend  : http://localhost:5000  (PID $($b[0].OwningProcess))" -ForegroundColor Green } else { Write-Host "Backend  : NOT STARTED" -ForegroundColor Red }
if ($f) { Write-Host "Frontend : http://localhost:$($f[0].LocalPort)  (PID $($f[0].OwningProcess))" -ForegroundColor Green } else { Write-Host "Frontend : NOT STARTED" -ForegroundColor Red }
Write-Host ""
pause
