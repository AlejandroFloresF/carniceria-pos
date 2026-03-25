@echo off
title Carniceria La Unica - Iniciando...
echo.
echo  ==========================================
echo   Carniceria La Unica - Sistema POS
echo  ==========================================
echo.
echo  Abriendo Backend y Frontend...
echo.

start "Carniceria - Backend API" cmd /k "^
cd /d C:\Users\jafg8\Desktop\carniceria\Carniceria.API && ^
echo. && ^
echo  [Backend] Actualizando repositorio... && ^
git pull && ^
echo. && ^
echo  [Backend] Restaurando dependencias .NET... && ^
dotnet restore && ^
echo. && ^
echo  [Backend] Iniciando API... && ^
echo  --------------------------------------- && ^
dotnet run --project Carniceria.API ^
"

timeout /t 2 /nobreak >nul

start "Carniceria - Frontend POS" cmd /k "^
cd /d C:\Users\jafg8\Desktop\carniceria\carniceria-pos && ^
echo. && ^
echo  [Frontend] Actualizando repositorio... && ^
git pull && ^
echo. && ^
echo  [Frontend] Instalando dependencias npm... && ^
npm install && ^
echo. && ^
echo  [Frontend] Iniciando servidor Vite... && ^
echo  --------------------------------------- && ^
npm run dev ^
"

echo  Listo! Revisa las dos ventanas que se abrieron.
echo.
echo  Backend:  http://localhost:5049/swagger
echo  Frontend: http://localhost:5173
echo.
pause
