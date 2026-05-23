@echo off
title ShopLink - Backend + Frontend
echo.
echo ==== ShopLink : Demarrage Backend + Frontend ====
echo.

:: Tuer le port 5000 si occupe
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 5000 -EA SilentlyContinue | Stop-Process -Id $_.OwningProcess -Force -EA SilentlyContinue" 2>nul
timeout /t 2 /nobreak >nul

:: Demarrer Backend dans une nouvelle fenetre CMD
start "ShopLink Backend (port 5000)" cmd /c "cd /d C:\Users\DELL\Documents\New project\backend && node index.js"

:: Attendre que le port 5000 soit libre puis occupe (backend demarre)
timeout /t 4 /nobreak >nul

:: Demarrer Frontend dans une nouvelle fenetre CMD
start "ShopLink Frontend (Vite)" cmd /c "cd /d C:\Users\DELL\Documents\New project\frontend && npx vite --host"

:: Attendre que Vite demarre
timeout /t 5 /nobreak >nul

echo.
echo ==== Serveurs demarres ====
echo Backend  : http://localhost:5000
echo Frontend : http://localhost:5173
echo.
pause
