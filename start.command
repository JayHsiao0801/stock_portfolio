#!/bin/zsh
cd "$(dirname "$0")"

# 如果 port 3000 已被佔用，先結束所有舊程序
OLD_PIDS=$(lsof -ti tcp:3000 2>/dev/null)
if [ -n "$OLD_PIDS" ]; then
  echo "結束舊的伺服器（PID $OLD_PIDS）..."
  echo "$OLD_PIDS" | xargs kill -9 2>/dev/null
  sleep 1
fi

echo "正在啟動 Stock Portfolio Manager..."
echo "準備好後請在瀏覽器開啟 http://localhost:3000"
echo "按 Ctrl+C 可停止伺服器"
echo ""

npm run dev
