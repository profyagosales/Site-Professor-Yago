# Site-Professor-Yago

Consulte o [Guia do Usuário](./USER_GUIDE.md) para entender os fluxos de login, envio de redação, correção e visualização de notas.

## Required Environment Variables

| Variable | Purpose |
|----------|---------|
| `MONGODB_URI` | Connection string for MongoDB. |
| `JWT_SECRET` | Secret key for signing JSON Web Tokens. |
| `SMTP_HOST` | Hostname of the SMTP server used to send emails. |
| `SMTP_USER` | Username for the SMTP server. |
| `SMTP_PASS` | Password for the SMTP server. |
| `VITE_API_URL` | (Deprecated) Base URL for the backend API used by the frontend. |
| `VITE_API_BASE_URL` | Base URL for the backend API used by the frontend. |
| `VITE_API_PREFIX` | API prefix path (e.g., `/api`). |
| `APP_DOMAIN` | Public domain where the application is served (used for CORS). |
| `SMTP_PORT` | (Optional) Port for the SMTP server. |
| `SMTP_FROM` | (Optional) Email address used in the "from" field. |
| `VITE_USE_RICH_ANNOS` | (Frontend) Enable the new rich PDF annotator (default true in dev). |
| `VITE_VIRT_PDF` | (Frontend) Enable virtualized PDF viewer for performance. |
| `VITE_VIRT_BUFFER` | (Frontend) Virtualization buffer in viewport heights (e.g., 1-3). |
| `ALLOW_DIRECT_FILE_URL` | (Backend) Allows creating essays with a direct `fileUrl` when Cloudinary isn't configured. |
| `TELEMETRY_STORE` | (Backend) When `1`, stores telemetry events for debugging. Default `0` (off). |
| `TELEMETRY_TTL_DAYS` | (Backend) Retention in days for telemetry events. Default `7`. |
| `VITE_FEATURE_TELEMETRY_VIEW` | (Frontend) When `1`, enables a simple telemetry console at `/dev/telemetry`. Default `0`. |

## Exemplo de .env (Produção)

Crie um arquivo `.env` com os valores reais do ambiente:

```env
MONGODB_URI=mongodb+srv://usuario:senha@cluster/app
JWT_SECRET=sua_chave_ultrasecreta
SMTP_HOST=smtp.exemplo.com
SMTP_PORT=587
SMTP_USER=usuario
SMTP_PASS=senha
SMTP_FROM=no-reply@exemplo.com
APP_DOMAIN=https://app.exemplo.com
VITE_API_URL=https://api.exemplo.com
VITE_API_BASE_URL=https://api.exemplo.com
VITE_API_PREFIX=/api
VITE_USE_RICH_ANNOS=true
VITE_VIRT_PDF=true
VITE_VIRT_BUFFER=2
```

## Local Setup

1. Install dependencies for both the frontend and backend:
   ```bash
   npm install --prefix frontend
   npm install --prefix backend
   ```
2. Run the development servers from the project root:
   ```bash
   npm run dev
   ```
   The backend will be available on http://localhost:5050 and the frontend on http://localhost:5173.
   Ensure your `.env` sets `VITE_API_URL=http://localhost:5050` and `APP_DOMAIN=http://localhost:5173` for local development.

   Optionally enable the new annotator and virtualization in local dev:

   ```env
   VITE_USE_RICH_ANNOS=true
   VITE_VIRT_PDF=true
   VITE_VIRT_BUFFER=2
   ```

## Lint, Testes e Build

Para verificar o estilo de código (quando configurado):

```bash
npm run lint --prefix frontend
```

Execute todos os testes do projeto:

```bash
npm test --prefix backend
npm test --prefix frontend
```

Ou use os scripts de cada pacote dentro de suas pastas:

```bash
cd backend && npm test
cd ../frontend && npm test
```

Gere os artefatos de produção:

```bash
npm run build
```

## Production

1. Build the frontend:
   ```bash
   npm run build
   ```
2. Certifique-se de que as variáveis de ambiente estejam definidas (veja o exemplo de `.env`), incluindo `VITE_API_URL` (URL do backend) e `APP_DOMAIN` (domínio público do app).
3. Execute o servidor Node em modo produção para servir `frontend/dist`:
   ```bash
   NODE_ENV=production node backend/server.js
   ```
   O backend servirá os arquivos estáticos da pasta `frontend/dist` na porta definida por `PORT` (padrão `5050`).

   ### Anotador de PDF (rich annotations)

   - Controlado pelo flag `VITE_USE_RICH_ANNOS` no frontend. Quando habilitado, o workspace de correção usa o novo anotador com ferramentas de highlight, caneta, caixa, riscado e comentário, além de desfazer/refazer e autosave.
   - O backend persiste no campo `richAnnotations` do modelo `Essay` e o PDF de correção inclui um resumo por página.
   - Carga é virtualizada quando `VITE_VIRT_PDF=true` para melhor performance em PDFs longos. Ajuste o buffer com `VITE_VIRT_BUFFER`.
   - Detecção de PDF mais robusta: além de verificar `.pdf` no link, o frontend usa `originalMimeType` vindo do backend (salvo no momento do upload ou via HEAD best-effort) para decidir o viewer inline. Assim, URLs sem extensão também abrem no editor.

   ### Telemetria (observabilidade opcional)

   - Off por padrão. Para depuração temporária, habilite `TELEMETRY_STORE=1` no backend.
   - Retenção curta controlada por `TELEMETRY_TTL_DAYS` (padrão 7 dias); expurgo roda automaticamente uma vez por dia.
   - Para visualizar rapidamente em ambientes de dev/admin, defina `VITE_FEATURE_TELEMETRY_VIEW=1` no frontend e acesse `/dev/telemetry` (somente admins conseguem ver dados; a API `GET /api/telemetry/latest` exige papel `admin`).

## Hosting Tips

- **Backend**: Platforms like Heroku or Render work well for hosting the Node.js server.
- **Frontend**: Deploy the built frontend on services such as Vercel. In the Vercel dashboard, set the **Root Directory** to `frontend`, use `npm install --legacy-peer-deps` as the install command and `npm run build` to build, with the output directory `dist`.
- **DNS & CORS**: When frontend and backend are hosted separately, configure DNS so the frontend uses your `APP_DOMAIN` and ensure the backend allows that origin in its CORS settings.


## Deployment Checklist

Refer to [DEPLOY_CHECKLIST.md](./DEPLOY_CHECKLIST.md) for steps to validate navigation, gabarito handling, redação workflows, notifications, and branding before deploying to staging or production.

## CI: Smoke test de PDF (Preview)

O repositório contém um workflow GitHub Actions que roda um smoke test de PDF contra um ambiente de preview/homolog antes da aprovação de PRs.

- Workflow: `.github/workflows/pdf-smoke.yml`
- Disparos: `pull_request` e `workflow_dispatch`

Secrets necessários (Settings → Secrets and variables → Actions):

- `SMOKE_BASE_URL`: Base do backend de preview (ex.: `https://api-preview.seudominio.com`).
- `SMOKE_PDF_ESSAY_ID`: ID de uma redação existente nesse ambiente para teste.
- Opcional `SMOKE_PDF_URL`: URL direta do PDF (usada como fallback se não houver ID).
- Opcional `SMOKE_PDF_BEARER`: Token Bearer para autorização, se necessário.

Fluxo do job:

1) Instala dependências na raiz e em `frontend/`.
2) Se houver `SMOKE_PDF_ESSAY_ID`, executa:
   - `node frontend/scripts/smoke-pdf.cjs --essay $SMOKE_PDF_ESSAY_ID` com `VITE_API_BASE_URL` apontando para `SMOKE_BASE_URL`.
3) Caso contrário, se houver `SMOKE_PDF_URL`, executa:
   - `node frontend/scripts/smoke-pdf.cjs --url $SMOKE_PDF_URL`.
4) Se nenhum for definido, falha o job.

Resultados:

- Sucesso: imprime `SMOKE OK: <bytes> <content-type> via cookies|bearer`.
- Erro: 401/403/timeout ou content-type inesperado causam falha (exit 1).
