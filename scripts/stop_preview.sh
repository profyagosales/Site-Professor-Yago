#!/usr/bin/env bash
set -euo pipefail
PID=/tmp/vite-preview.pid
if [ -f "$PID" ] && ps -p "$(cat "$PID")" >/dev/null 2>&1; then
  kill "$(cat "$PID")"
  rm -f "$PID"
fi
echo "🛑 preview stopped"