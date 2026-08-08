@echo off
cd /d "%~dp0"
if not exist node_modules call npm install
start "RNG Centro de Comando" cmd /k "npm start"
timeout /t 2 /nobreak >nul
start "" http://localhost:3000
