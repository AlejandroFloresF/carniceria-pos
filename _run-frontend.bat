@echo off
cd /d "%~dp0"
echo.
echo  [Frontend] Actualizando repositorio...
git pull
echo.
echo  [Frontend] Instalando dependencias npm...
npm install --no-audit --no-fund
echo.
echo  [Frontend] Iniciando servidor Vite...
echo  ---------------------------------------
npm run dev
pause
