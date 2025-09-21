# Deployment Checklist

Use this checklist during **staging** and **production** deployments to validate core features and visual consistency.

- [ ] **Page navigation** – Verify every page is reachable via the intended navigation paths, all links work, and there are no missing or broken routes.
- [ ] **Gabarito generation/correction** – Generate a sample gabarito, upload it for correction, and confirm the correction results are accurate and stored.
- [ ] **Redação submission/review** – Submit a redação, ensure it is saved, reviewers can access it, and feedback cycles function properly.
	- [ ] Inline correction: verificar zoom, pan, criação/edição/remoção de anotações, autosave, undo/redo e navegação por páginas/itens.
	- [ ] PDF rendering: gerar PDF com overlays (caixas e comentários), miniaturas (1–2) e opcional de envio por e-mail.
- [ ] **Notification delivery** – Trigger emails or in-app notifications and confirm they are delivered to the correct recipients without delay.
- [ ] **Consistent branding/visual identity** – Check that logos, color schemes, typography, and other branding elements match design guidelines across all pages and devices.
- [ ] **Environment configuration** – Ensure Node.js 20 is selected in Vercel project settings and all required environment variables are set (see `.env.example`).
	- [ ] VITE_API_URL e VITE_USE_COOKIE_AUTH configurados no projeto Vercel.
	- [ ] Verificar que `vercel.json` usa o script de build do workspace (root -> frontend) e output `frontend/dist`.
	- [ ] Confirmar que o worker do PDF (pdfjs-dist) está sendo servido corretamente (chunk separado) e não é bloqueado.

## Build & Guardas

Use os scripts do workspace `frontend/`:

1) Build & guarda

- npm ci
- npm run build   (só o app principal)
- se precisar do viewer: npm run build:viewer  ou npm run build:all

O prebuild falha se algo puxar react-pdf/pdfjs-dist fora dos componentes permitidos.

2) Smoke-test de saída

- nada deve aparecer:
	- grep -E "react-pdf|pdfjs-dist|GlobalWorkerOptions|konva" dist/assets/index-*.js || echo "CLEAN ✅"
- o worker precisa existir:
	- ls -lh dist/pdf.worker.min.*      (pelo menos .js; se tiver .mjs, melhor)

3) Vercel (não regredir)

- Build Command: npm --workspace frontend run build
	- não use build:all por padrão pra não publicar o viewer sem querer
- Output: frontend/dist
- SPA fallback: mantenha rewrites pra index.html (se já tinha)
- Headers opcionais pro worker (evita MIME estranho no .mjs se algum proxy resolver HTML):

```
{
	"headers": [
		{ "source": "/pdf.worker.min.mjs", "headers": [
			{ "key": "Content-Type", "value": "text/javascript; charset=utf-8" }
		] },
		{ "source": "/pdf.worker.mjs", "headers": [
			{ "key": "Content-Type", "value": "text/javascript; charset=utf-8" }
		] }
	]
}
```

4) Verificação em runtime

- Abra a home ➜ Aba "Rede": não deve baixar pdf.worker* nem assets/pdf-*.js.
- Vá direto para a tela de correção ➜ aí sim devem aparecer:
	- pdf.worker.min.mjs ou fallback pdf.worker.min.js
	- os chunks PdfAnnotator-*.js / ReactKonva-*.js
	- Console limpo (sem createContext undefined).

5) Canário anti-regressão (rápido)

- Script no repo: `frontend/scripts/check-dist-pdf-leak.sh`
- Rode no CI logo após o build: `npm --workspace frontend run check:dist:pdf-leak`

Keep this checklist up to date as new features are added.

<!-- Deploy trigger: 2025-08-29T00:00:00Z -->
