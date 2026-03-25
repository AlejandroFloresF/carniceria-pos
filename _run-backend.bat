@echo off
cd /d "%~dp0..\Carniceria.API"
echo.
echo  [Backend] Actualizando repositorio...
git pull
echo.
echo  [Backend] Restaurando dependencias .NET...
dotnet restore
echo.
echo  [Backend] Iniciando API...
echo  ---------------------------------------
dotnet run --project Carniceria.API
pause
