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

Keep this checklist up to date as new features are added.

<!-- Deploy trigger: 2025-08-29T00:00:00Z -->
