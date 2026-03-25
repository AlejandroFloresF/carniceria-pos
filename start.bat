@echo off
title Carniceria Launcher

:: Try default Git Bash locations
set GITBASH=C:\Program Files\Git\bin\bash.exe
if not exist "%GITBASH%" set GITBASH=C:\Program Files (x86)\Git\bin\bash.exe

if not exist "%GITBASH%" (
    echo Git Bash not found. Please install Git for Windows.
    echo https://git-scm.com/download/win
    pause
    exit /b 1
)

:: Run the startup script in Git Bash
"%GITBASH%" --login -i "%~dp0startup.sh"
