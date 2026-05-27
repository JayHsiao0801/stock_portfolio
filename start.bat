@echo off
cd /d "%~dp0"

REM 若 .env 不存在，自動從範本複製
if not exist ".env" (
  echo 初始化設定檔 .env...
  copy .env.example .env >nul
)

REM 若 node_modules 不存在，自動安裝依賴
if not exist "node_modules" (
  echo 安裝依賴（首次約需幾分鐘）...
  npm install
)

REM 產生 Prisma Client（每次確保最新）
echo 產生 Prisma Client...
npx prisma generate

REM 同步資料庫結構（建立缺少的資料表與欄位，不影響既有資料）
echo 同步資料庫結構...
npx prisma db push --skip-generate

echo 檢查 port 3000 是否已被佔用...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr ":3000 " ^| findstr "LISTENING"') do (
  echo 結束舊的伺服器 (PID %%a)...
  taskkill /PID %%a /F >nul 2>&1
)

echo.
echo 正在啟動 Stock Portfolio Manager...
echo 準備好後請在瀏覽器開啟 http://localhost:3000
echo 按 Ctrl+C 可停止伺服器
echo.

:restart
npm run dev
if exist ".restart_signal" (
  del /f ".restart_signal" >nul 2>&1
  echo.
  echo 正在重新啟動伺服器...
  timeout /t 1 /nobreak >nul
  goto restart
)
pause
