@echo off
start "Backend" cmd /k "%~dp0_run-backend.bat"
start "Frontend" cmd /k "%~dp0_run-frontend.bat"
echo.
echo  Frontend:  http://localhost:5173
echo  Backend:   http://localhost:5049/swagger
echo.
pause
