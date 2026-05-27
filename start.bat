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

REM 初始化 / 更新資料庫 schema
echo 初始化資料庫...
npx prisma migrate deploy > "%TEMP%\prisma_out.txt" 2>&1
if errorlevel 1 (
  findstr /C:"P3005" "%TEMP%\prisma_out.txt" >nul
  if not errorlevel 1 (
    REM 資料庫已有資料但無 migration 歷史，標記所有 migration 為已套用
    echo 偵測到既有資料庫，進行基準化...
    for /d %%m in (prisma\migrations\*) do (
      npx prisma migrate resolve --applied "%%~nxm" >nul 2>&1
    )
    npx prisma migrate deploy
  ) else (
    type "%TEMP%\prisma_out.txt"
  )
)
del "%TEMP%\prisma_out.txt" >nul 2>&1

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
