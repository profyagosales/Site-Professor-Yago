#!/usr/bin/env bash
set -euo pipefail

# Verifica se o bundle de entrada contém código de PDF/Konva
if grep -R -E "react-pdf|pdfjs-dist|GlobalWorkerOptions|konva" dist/assets/index-*.js; then
  echo "❌ PDF/Konva vazou pro entry"
  exit 2
else
  echo "✅ Entry limpo de PDF/Konva"
fi
