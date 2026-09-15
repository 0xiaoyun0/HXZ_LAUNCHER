@echo off
chcp 65001 >nul
cd /d "%~dp0client" || exit /b 1
call pnpm build:desktop
if errorlevel 1 exit /b 1
pause
