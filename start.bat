@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist ".env" (
  echo [1/5] Copying .env.example to .env...
  copy .env.example .env >nul
)

if not exist "node_modules" (
  echo [2/5] Installing dependencies...
  npm install
)

echo [3/5] Generating Prisma Client...
npx prisma generate

echo [4/5] Syncing database schema...
npx prisma db push --skip-generate

echo [5/5] Checking port 3000...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  echo Killing old server (PID %%a)...
  taskkill /PID %%a /F >nul 2>&1
)

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
