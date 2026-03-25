@echo off
title Carniceria La Unica - Iniciando...

:: %~dp0 = directorio donde vive este .bat (carniceria-pos\)
:: El backend esta en la carpeta hermana Carniceria.API
set "FRONTEND_DIR=%~dp0"
set "BACKEND_DIR=%~dp0..\Carniceria.API"

echo.
echo  ==========================================
echo   Carniceria La Unica - Sistema POS
echo  ==========================================
echo.
echo  Abriendo Backend y Frontend...
echo.

start "Carniceria - Backend API" cmd /k ^
  "cd /d "%BACKEND_DIR%" ^
  && echo. ^
  && echo  [Backend] Actualizando repositorio... ^
  && git pull ^
  && echo. ^
  && echo  [Backend] Restaurando dependencias .NET... ^
  && dotnet restore ^
  && echo. ^
  && echo  [Backend] Iniciando API... ^
  && echo  --------------------------------------- ^
  && dotnet run --project Carniceria.API"

timeout /t 2 /nobreak >nul

start "Carniceria - Frontend POS" cmd /k ^
  "cd /d "%FRONTEND_DIR%" ^
  && echo. ^
  && echo  [Frontend] Actualizando repositorio... ^
  && git pull ^
  && echo. ^
  && echo  [Frontend] Instalando dependencias npm... ^
  && npm install ^
  && echo. ^
  && echo  [Frontend] Iniciando servidor Vite... ^
  && echo  --------------------------------------- ^
  && npm run dev"

echo.
echo  Dos ventanas abiertas. Espera unos segundos y entra en:
echo.
echo    Frontend:  http://localhost:5173
echo    Backend:   http://localhost:5049/swagger
echo.
pause
