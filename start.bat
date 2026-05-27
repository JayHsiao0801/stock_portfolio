@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".env" (
  echo [1/4] Copying .env.example to .env...
  copy .env.example .env >nul
)

if not exist "node_modules" (
  echo [2/4] Installing dependencies...
  npm install
  if errorlevel 1 (
    echo ERROR: npm install failed. Please check your Node.js installation.
    pause
    exit /b 1
  )
)

echo [3/4] Syncing database schema...
node node_modules\prisma\build\index.js db push --skip-generate --accept-data-loss
if errorlevel 1 (
  echo WARNING: Database schema sync failed, will retry on first request.
)

echo [4/4] Checking port 3000...
netstat -ano 2>nul | findstr ":3000 " | findstr "LISTENING" > "%TEMP%\port3000.tmp" 2>nul
for /f "tokens=5" %%a in (%TEMP%\port3000.tmp) do (
  echo Killing old server on port 3000...
  taskkill /PID %%a /F >nul 2>&1
)
del "%TEMP%\port3000.tmp" >nul 2>&1

echo.
echo Starting Stock Portfolio Manager...
echo Open http://localhost:3000 in your browser
echo Press Ctrl+C to stop
echo.

:restart
npm run dev
if exist ".restart_signal" (
  del /f ".restart_signal" >nul 2>&1
  echo.
  echo Restarting server...
  timeout /t 1 /nobreak >nul
  goto restart
)
pause
