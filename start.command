#!/bin/zsh
cd "$(dirname "$0")"

# 若 .env 不存在，自動從範本複製
if [ ! -f ".env" ]; then
  echo "初始化設定檔 (.env)..."
  cp .env.example .env
fi

# 若 node_modules 不存在，自動安裝依賴
if [ ! -d "node_modules" ]; then
  echo "安裝依賴（首次約需幾分鐘）..."
  npm install
fi

# 產生 Prisma Client（每次確保最新）
echo "產生 Prisma Client..."
npx prisma generate

# 初始化 / 更新資料庫 schema
echo "初始化資料庫..."
npx prisma migrate deploy

# 如果 port 3000 已被佔用，先結束所有舊程序
OLD_PIDS=$(lsof -ti tcp:3000 2>/dev/null)
if [ -n "$OLD_PIDS" ]; then
  echo "結束舊的伺服器（PID $OLD_PIDS）..."
  echo "$OLD_PIDS" | xargs kill -9 2>/dev/null
  sleep 1
fi

echo ""
echo "正在啟動 Stock Portfolio Manager..."
echo "準備好後請在瀏覽器開啟 http://localhost:3000"
echo "按 Ctrl+C 可停止伺服器"
echo ""

while true; do
  npm run dev
  # 若存在重啟信號檔，刪除後自動重啟；否則正常結束
  if [ -f ".restart_signal" ]; then
    rm -f ".restart_signal"
    echo ""
    echo "正在重新啟動伺服器..."
    sleep 1
  else
    break
  fi
done
