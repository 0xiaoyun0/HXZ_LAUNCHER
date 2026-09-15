@echo off
cd /d "%~dp0server" || exit /b 1
where node >nul 2>nul || (echo Please install Node.js 24 first. & pause & exit /b 1)
if not exist node_modules (call pnpm install --frozen-lockfile || exit /b 1)
if exist .env (node --env-file=.env src/server.mjs) else (node src/server.mjs)
pause
