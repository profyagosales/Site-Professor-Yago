#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../frontend"

PORT=${PORT:-5174}
HOST=${HOST:-0.0.0.0}
LOG=/tmp/vite-preview.log
PID=/tmp/vite-preview.pid

# encerra instância anterior
if [ -f "$PID" ] && ps -p "$(cat "$PID")" >/dev/null 2>&1; then
  kill "$(cat "$PID")" || true
  sleep 0.3
fi

# se quiser via npm script:
# nohup npm run preview -- --host "$HOST" --port "$PORT" >"$LOG" 2>&1 &

# direto via vite:
nohup npx vite preview --host "$HOST" --port "$PORT" >"$LOG" 2>&1 &
echo $! > "$PID"

sleep 0.6
if ps -p "$(cat "$PID")" >/dev/null 2>&1; then
  echo "✅ preview UP: http://localhost:$PORT"
else
  echo "❌ preview FAIL"; sed -n '1,120p' "$LOG"; exit 1
fi
