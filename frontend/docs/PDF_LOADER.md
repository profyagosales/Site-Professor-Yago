# PDF Loader — Visão Rápida

O carregamento de PDFs usa Blob URL em vez de base64 ou links diretos longos para:
- Evitar URLs gigantes (414) e headers excessivos.
- Desacoplar credenciais do contexto do worker PDF.
- Permitir revogação imediata quando o componente desmonta/troca de arquivo.

Ordem de tentativas (parando no primeiro sucesso):
1. Fetch com cookies (`credentials: include`).
2. Bearer token vindo de `?token=...` na URL curta.
3. Fresh token curto (`GET /api/essays/:id/file-token`).
4. Nova URL curta via `getEssayFileUrl` e repetição parcial.

Cada tentativa gera Blob e o anterior é revogado (URL.revokeObjectURL) no cleanup / troca.

Flags:
- `VITE_PDF_DEBUG=1` mostra badge com step, tamanho e origem.
- `VITE_DEBUG_PDF_TELEMETRY=1` envia eventos (`pdf_load_success|error`) para `/api/telemetry`.

Build guards garantem que `react-pdf` e `react-konva` só entram no bundle quando o componente é realmente usado (lazy import + scripts de verificação).
