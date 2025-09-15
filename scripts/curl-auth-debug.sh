#!/usr/bin/env bash
# Script de diagnóstico para autenticação e Set-Cookie cross-site
# Uso: BASE_URL=https://seu-backend.example.com ./scripts/curl-auth-debug.sh

set -euo pipefail
BASE_URL=${BASE_URL:-http://localhost:3000}
COOKIE_JAR=$(mktemp)
HEADER_DUMP=$(mktemp)

echo "Usando BASE_URL=$BASE_URL"

echo "1) Health (/auth/health)"
curl -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/auth/health" | sed 's/,/\n  /g'

echo "2) Diagnóstico de CORS simples (/auth/test)"
curl -i -s -o /dev/null -D "$HEADER_DUMP" "$BASE_URL/auth/test"
grep -i '^access-control-allow-origin' "$HEADER_DUMP" || echo 'Sem ACAO'

echo "3) Tentando set-cookie de teste (/auth/cookie-test)"
curl -i -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -D "$HEADER_DUMP" "$BASE_URL/auth/cookie-test" > /dev/null
echo 'Headers relevantes:'
grep -i '^set-cookie' "$HEADER_DUMP" || echo 'Nenhum Set-Cookie'

echo "Cookies armazenados:"; cat "$COOKIE_JAR" || true

echo "4) Cookie raw manual (/auth/set-raw-cookie)"
curl -i -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -D "$HEADER_DUMP" "$BASE_URL/auth/set-raw-cookie" > /dev/null
grep -i '^set-cookie' "$HEADER_DUMP" || echo 'Nenhum Set-Cookie raw'

echo "5) Diagnose de usuário (exigir email)"
if [ -n "${EMAIL:-}" ]; then
  curl -s "$BASE_URL/auth/diagnose-user?email=$EMAIL" | sed 's/},{/},\n{/g'
else
  echo 'Defina EMAIL=usuario@example.com para testar diagnose-user'
fi

echo "6) Login teacher (se EMAIL e PASSWORD definidos)"
if [ -n "${EMAIL:-}" ] && [ -n "${PASSWORD:-}" ]; then
  curl -i -s -c "$COOKIE_JAR" -b "$COOKIE_JAR" -D "$HEADER_DUMP" -H 'Content-Type: application/json' \
    -X POST "$BASE_URL/auth/login/teacher" \
    -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" > /dev/null
  grep -i '^set-cookie' "$HEADER_DUMP" || echo 'Login não retornou Set-Cookie'
  echo 'Cookies após login:'; cat "$COOKIE_JAR"
else
  echo 'Defina EMAIL e PASSWORD para testar login teacher.'
fi

echo "7) Debug session"
curl -s -b "$COOKIE_JAR" "$BASE_URL/auth/debug-session" | sed 's/,/\n  /g'

echo "Arquivo cookie jar: $COOKIE_JAR (será preservado)."
