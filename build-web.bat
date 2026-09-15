@echo off
chcp 65001 >nul
cd /d "%~dp0client" || exit /b 1
call pnpm quasar build -m spa
if errorlevel 1 exit /b 1
pause
