# PDF Troubleshooting

1. Tela branca: rode `npm run build` e verifique mensagens "OK: sem imports estáticos" e "Guard: entry limpo". Se falhar, cheque imports estáticos de react-pdf/react-konva.
2. URL gigante / 414: ative `VITE_PDF_DEBUG=1` e confirme que o `PdfAnnotator` exibe `src: blob`. Se não, o loader não gerou Blob URL.
3. 401/403: valide sessão e tente `GET /api/essays/:id/file-token`. Use `SMOKE_PDF_BEARER=<token>` no smoke test se necessário.
4. Worker ausente: confirme `public/pdf.worker.min.mjs` (ou .js). Scripts de postinstall fazem a cópia (`scripts/copy-pdf-worker.cjs`).
5. Chunks pdf/konva no entry: execute `node scripts/verify-manifest-no-pdf-konva.cjs` e `node scripts/check-entry-html-clean.cjs`.
6. Vazamento de Blob: trocar de redação deve revogar URL anterior (ver código: cleanup de `lastBlobUrlRef`).
7. Badge de debug: `VITE_PDF_DEBUG=1` mostra step (1=cookies,2=bearer,3=refresh), size e src; usar só em dev.
8. Telemetria: `VITE_DEBUG_PDF_TELEMETRY=1` envia eventos a `/api/telemetry`; backend loga se `DEBUG_TELEMETRY=1`.
9. Smoke test: `npm run smoke:pdf` (defina `ESSAY_ID` ou `SMOKE_PDF_URL`). Mensagem `SMOKE OK` valida caminho completo.
10. Timeout: se o smoke falhar por timeout, revisar conectividade ou HEAD lento na origem do arquivo.
