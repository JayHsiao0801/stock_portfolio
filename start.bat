@echo off
cd /d "%~dp0"

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
